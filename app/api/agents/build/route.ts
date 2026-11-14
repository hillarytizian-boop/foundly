import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSiteWithAgents, strategistLive, renderFromCopy, slugify,
  type AgentStep, type Brief,
} from "@/lib/agents";
import { adminClient } from "@/lib/tokens";
import { isConfigured as llmConfigured, modelId } from "@/lib/nvidia";
import { rateLimit } from "@/lib/ratelimit";

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

    const limit = rateLimit(`build:${user.id}`, 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Slow down — a build can start again in ${limit.retryAfter}s.` },
        { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
      );
    }

    const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
    const balance = profile?.credits ?? 0;

    const name = brief.businessName?.trim() || "Untitled";
    const stepsOf = (d: any): AgentStep[] => (Array.isArray(d?.agent_run) ? d.agent_run : []);
    const admin = adminClient();

    /**
     * Next free slug for `base`.
     *
     * Reads every existing `base` / `base-N` slug in one query and continues
     * from the highest suffix. The previous version probed one suffix at a time
     * with a hard cap of 40, so once a name had been built 40 times it walked off
     * the end of the loop and returned a slug that already existed — the insert
     * then died on `sites_slug_key` instead of picking the next number.
     */
    async function uniqueSlug(base: string) {
      const { data: rows } = await admin
        .from("sites")
        .select("slug")
        .or(`slug.eq.${base},slug.like.${base}-*`)
        .limit(1000);
      const taken = new Set((rows ?? []).map((r: any) => r.slug));
      if (!taken.has(base)) return base;
      let max = 1;
      for (const slug of taken) {
        const m = /-(\d+)$/.exec(String(slug).slice(base.length));
        const n = m ? parseInt(m[1], 10) : NaN;
        if (Number.isFinite(n)) max = Math.max(max, n);
      }
      // one probe in the unlikely case the SQL filter above missed something
      let next = max + 1;
      for (let i = 0; i < 500; i++) {
        const candidate = `${base}-${next}`;
        if (!taken.has(candidate)) {
          const { data: clash } = await admin.from("sites").select("id").eq("slug", candidate).maybeSingle();
          if (!clash) return candidate;
        }
        next++;
      }
      return `${base}-${Date.now().toString(36)}`;
    }

    /**
     * Insert a site, retrying on a slug collision.
     *
     * uniqueSlug() is a check-then-insert, so two requests that fire at the same
     * time (double-submit, plan + render, two tabs) can both pick the same slug
     * and the loser dies with `duplicate key value violates unique constraint
     * "sites_slug_key"`. The database is the only real arbiter here, so treat a
     * 23505 on the insert as "pick the next suffix and go again".
     */
    async function insertSite(row: Record<string, any>) {
      const base = row.slug as string;
      let slug = base;
      let lastError: any = null;
      for (let i = 0; i < 25; i++) {
        const { data, error } = await supabase.from("sites").insert({ ...row, slug }).select().single();
        if (!error && data) return { site: data, slug, error: null as any };
        lastError = error;
        const isCollision = error?.code === "23505" || /duplicate key|sites_slug_key/i.test(error?.message ?? "");
        if (!isCollision) return { site: null as any, slug, error };
        // re-derive from the database on every collision so the counter keeps rising
        slug = await uniqueSlug(base);
      }
      return { site: null as any, slug, error: lastError };
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
      const { site, slug: finalSlug, error } = await insertSite({
        user_id: user.id, business_name: name, idea: brief.idea,
        content: { hero: brief.idea, sub: built.description, cta: "Order now", engine: "builtin", guardrails: built.guardrails, harness: { model: "built-in team", fallbackReason } } as any,
        slug, html: built.html, published: false, agent_run: built.steps as any, score: built.score,
      });
      if (error || !site) return NextResponse.json({ error: error?.message || "Could not save the site" }, { status: 500 });

      await supabase.from("profiles").update({ credits: balance - COST }).eq("id", user.id);
      await supabase.from("credit_events").insert({ user_id: user.id, delta: -COST, reason: "Agent team built a website" });
      await supabase.from("activity").insert({ user_id: user.id, message: `Agent team built ${name} — quality score ${built.score}/100` });

      return NextResponse.json({
        ok: true, stage, complete: true, site_id: site.id, slug: finalSlug, score: built.score,
        steps: built.steps, engine: "builtin", guardrails: built.guardrails,
        harness: built.harness, fallback_reason: fallbackReason ?? null, balance: balance - COST, url: `/s/${finalSlug}`,
      });
    }

    // live plan saved as a draft — the render stage fills it in
    const { site, slug: finalSlug, error } = await insertSite({
      user_id: user.id, business_name: name, idea: brief.idea,
      content: { hero: brief.idea, sub: copy.sub ?? "", cta: copy.cta ?? "Get in touch", copy, engine: "live" } as any,
      slug, html: null, published: false, agent_run: steps as any, score: null,
    });
    if (error || !site) return NextResponse.json({ error: error?.message || "Could not save the draft" }, { status: 500 });

    return NextResponse.json({
      ok: true, stage, complete: false, site_id: site.id, draft_id: site.id, slug: finalSlug,
      steps, engine, fallback_reason: fallbackReason ?? null, balance,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Build failed" }, { status: 500 });
  }
}
