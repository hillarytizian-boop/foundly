import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSiteWithAgents, strategistLive, renderFromCopy, slugify,
  type AgentStep, type Brief,
} from "@/lib/agents";
import { adminClient } from "@/lib/tokens";
import { isConfigured as llmConfigured, modelId } from "@/lib/nvidia";

// Each request makes at most ONE model call (reasoning calls take 60–240s).
export const maxDuration = 300;

const COST = 3;

/**
 * Two-stage agent build.
 *   stage "plan"   → Strategist (live model, or the built-in team in fast mode)
 *   stage "render" → Builder + Reviewer + Publisher
 *
 * Splitting is deliberate: one reasoning call per HTTP request keeps every
 * request inside the platform timeout, and the UI can show the team working
 * step by step instead of a single opaque spinner.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const brief: Brief = body.brief ?? body;
    const mode: "auto" | "fast" | "live" = body.mode === "live" ? "live" : body.mode === "fast" ? "fast" : "auto";
    const stage: "plan" | "render" = body.stage === "render" ? "render" : "plan";

    if (!brief?.idea?.trim()) {
      return NextResponse.json({ error: "Tell the agents what the business does" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to build a site" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
    const balance = profile?.credits ?? 0;

    const name = brief.businessName?.trim() || "Untitled";
    const stepsOf = (d: any): AgentStep[] => (Array.isArray(d?.agent_run) ? d.agent_run : []);
    const admin = adminClient();

    async function uniqueSlug(base: string) {
      // slugs are globally unique (partial unique index), so the clash check must
      // run outside RLS — otherwise another user's site steals the slug and the
      // insert fails with a duplicate key error.
      let slug = base;
      for (let i = 0; i < 40; i++) {
        const { data: clash } = await admin.from("sites").select("id").eq("slug", slug).maybeSingle();
        if (!clash) break;
        slug = `${base}-${i + 2}`;
      }
      return slug;
    }

    /* ---------------- stage 2: render a saved draft ---------------- */
    if (stage === "render") {
      const draftId = body.draft_id;
      if (!draftId) return NextResponse.json({ error: "draft_id required for the render stage" }, { status: 400 });

      const { data: draft } = await supabase.from("sites")
        .select("id,user_id,business_name,idea,content,slug,agent_run")
        .eq("id", draftId).single();
      if (!draft || draft.user_id !== user.id) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

      const copy = (draft.content as any)?.copy;
      const engineIsLive = (draft.content as any)?.engine === "live";
      let fallbackReason: string | undefined;
      if (!copy) fallbackReason = "The draft had no planned copy, so the built-in team rewrote it.";

      // Hybrid by design: the live model already wrote the copy (stage 1), so
      // stage 2 assembles the page deterministically instead of asking the
      // model for a 10k-character document it cannot produce in time.
      const built = copy
        ? renderFromCopy({ ...brief, businessName: name }, copy)
        : (() => { const b = buildSiteWithAgents({ ...brief, businessName: name }); return { ...b, guardrails: b.guardrails }; })();
      const result = {
        ...built,
        steps: [...stepsOf(draft).slice(0, 1), ...built.steps],
        guardrails: built.guardrails,
      };

      const score = result.score;
      const { error } = await supabase.from("sites").update({
        html: result.html,
        agent_run: result.steps as any,
        score,
        content: {
          ...(draft.content as any),
          sub: result.description,
          engine: engineIsLive && !fallbackReason ? "live" : "builtin",
          guardrails: result.guardrails,
          harness: {
            model: engineIsLive && !fallbackReason ? modelId() : "built-in team",
            fallbackReason,
          },
        } as any,
      }).eq("id", draftId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from("profiles").update({ credits: Math.max(0, balance - COST) }).eq("id", user.id);
      await supabase.from("credit_events").insert({ user_id: user.id, delta: -COST, reason: "Agent team built a website" });
      await supabase.from("activity").insert({
        user_id: user.id,
        message: `${engineIsLive && !fallbackReason ? "Live agent team" : "Agent team"} built ${name} — ${score}/100`,
      });

      return NextResponse.json({
        ok: true, stage, site_id: draftId, slug: draft.slug, score,
        steps: result.steps, engine: engineIsLive && !fallbackReason ? "live" : "builtin",
        guardrails: result.guardrails, fallback_reason: fallbackReason ?? null,
        balance: Math.max(0, balance - COST), url: `/s/${draft.slug}`,
      });
    }

    /* ---------------- stage 1: plan ---------------- */
    if (balance < COST) return NextResponse.json({ error: "Not enough credits for a build", balance }, { status: 402 });

    let steps: AgentStep[] = [];
    let copy: any = null;
    let engine: "live" | "builtin" = "builtin";
    let fallbackReason: string | undefined;

    if (mode !== "fast" && llmConfigured()) {
      const strat = await strategistLive(brief, 280_000);
      if (strat.ok) {
        steps = [strat.step];
        copy = strat.copy;
        engine = "live";
      } else {
        fallbackReason = `Live Strategist unavailable (${strat.error}) — the built-in team planned the page instead.`;
        if (mode === "live") {
          return NextResponse.json({
            error: fallbackReason + " Live mode never substitutes invented output, so nothing was saved.",
          }, { status: 502 });
        }
      }
    }

    const base = slugify(brief.businessName?.trim() || copy?.name || "site") || "site";
    const slug = await uniqueSlug(base);

    if (!copy) {
      // deterministic plan
      const built = buildSiteWithAgents(brief);
      fallbackReason = fallbackReason ?? (mode === "fast" ? "Fast built-in team requested." : "Live model not configured — built-in team used.");
      const { data: site, error } = await supabase.from("sites").insert({
        user_id: user.id, business_name: name, idea: brief.idea,
        content: { hero: brief.idea, sub: built.description, cta: "Order now", engine: "builtin", guardrails: built.guardrails, harness: { model: "built-in team", fallbackReason } } as any,
        slug, html: built.html, published: false, agent_run: built.steps as any, score: built.score,
      }).select().single();
      if (error || !site) return NextResponse.json({ error: error?.message || "Could not save the site" }, { status: 500 });

      await supabase.from("profiles").update({ credits: balance - COST }).eq("id", user.id);
      await supabase.from("credit_events").insert({ user_id: user.id, delta: -COST, reason: "Agent team built a website" });
      await supabase.from("activity").insert({ user_id: user.id, message: `Agent team built ${name} — quality score ${built.score}/100` });

      return NextResponse.json({
        ok: true, stage, complete: true, site_id: site.id, slug, score: built.score,
        steps: built.steps, engine: "builtin", guardrails: built.guardrails,
        harness: built.harness, fallback_reason: fallbackReason ?? null, balance: balance - COST, url: `/s/${slug}`,
      });
    }

    // live plan saved as a draft — the render stage fills it in
    const { data: site, error } = await supabase.from("sites").insert({
      user_id: user.id, business_name: name, idea: brief.idea,
      content: { hero: brief.idea, sub: copy.sub ?? "", cta: copy.cta ?? "Get in touch", copy, engine: "live" } as any,
      slug, html: null, published: false, agent_run: steps as any, score: null,
    }).select().single();
    if (error || !site) return NextResponse.json({ error: error?.message || "Could not save the draft" }, { status: 500 });

    return NextResponse.json({
      ok: true, stage, complete: false, site_id: site.id, draft_id: site.id, slug,
      steps, engine, fallback_reason: fallbackReason ?? null, balance,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Build failed" }, { status: 500 });
  }
}
