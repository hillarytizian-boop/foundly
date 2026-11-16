// The tools Milo can actually reach for.
//
// Everything here runs server-side against the signed-in user's own rows. The
// model only ever chooses a name and arguments — it never touches the database
// directly, so every action is scoped by `user.id` exactly like an API route
// would be. Nothing destructive happens without the user asking for it in the
// conversation, and publishing still flips the same `published` flag the UI does.

import { adminClient, getToken, saveToken } from "@/lib/tokens";
import { PROVIDERS, getProvider, isConfigured } from "@/lib/integrations";
import { buildSiteWithAgents, slugify } from "@/lib/agents";
import { executeTask } from "@/lib/tasks";
import { getCapability } from "@/lib/capabilities";
import { publishTo } from "@/lib/social";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolDef } from "@/lib/nvidia";

export type ToolCtx = {
  userId: string;
  /** request origin, so links Milo hands out are absolute */
  origin: string;
  supabase: SupabaseClient;
};

/** One line of visible work, echoed to the UI as it happens. */
export type WorkEvent = { label: string; detail?: string };

export type ToolResult = {
  /** what the model is told happened */
  ok: boolean;
  /** short human summary, shown as the step label */
  summary: string;
  /** optional link to surface as a chip in the chat */
  link?: { label: string; href: string };
  /** extra data the model needs to continue */
  data?: unknown;
  /** a screenshot-ready artifact, e.g. a built page */
  artifact?: { kind: "site"; html: string; title: string };
};

type Tool = {
  def: ToolDef;
  run: (args: any, ctx: ToolCtx, emit: (e: WorkEvent) => void) => Promise<ToolResult>;
};

/** Providers that accept a token the user already holds, verified live. */
const PASTED_TOKEN_PROVIDERS = new Set([
  "x", "linkedin", "facebook", "instagram", "tiktok", "slack", "gmail",
]);

/**
 * Which connect route is honest for a provider.
 *
 * "oauth"        — client ID/secret are on this deployment, the platform's own
 *                  consent screen works end to end.
 * "paste"        — no app credentials, but the platform verifies a token you
 *                  already hold, so the connection becomes real.
 * "demo"         — neither is possible, so Milo offers a clearly-labelled demo
 *                  consent instead of a link that would dead-end.
 */
function connectMode(slug: string): "oauth" | "paste" | "demo" {
  const p = getProvider(slug);
  if (p && isConfigured(p)) return "oauth";
  if (PASTED_TOKEN_PROVIDERS.has(slug)) return "paste";
  return "demo";
}

const slugList = PROVIDERS.map((p) => p.slug);

async function connectedSlugs(ctx: ToolCtx): Promise<Map<string, { mode?: string; account?: string }>> {
  const admin = adminClient();
  const [{ data: rows }, { data: tokens }] = await Promise.all([
    admin.from("integrations").select("slug,status,mode").eq("user_id", ctx.userId),
    admin.from("integration_tokens").select("slug,account_label").eq("user_id", ctx.userId),
  ]);
  const map = new Map<string, { mode?: string; account?: string }>();
  for (const r of rows ?? []) {
    if (r.status === "connected") map.set(r.slug, { mode: r.mode ?? "oauth" });
  }
  for (const t of tokens ?? []) {
    map.set(t.slug, { ...(map.get(t.slug) ?? {}), mode: "verified", account: t.account_label ?? undefined });
  }
  return map;
}

export const TOOLS: Tool[] = [
  /* ------------------------------------------------------------------ */
  /* Connections                                                         */
  /* ------------------------------------------------------------------ */
  {
    def: {
      type: "function",
      function: {
        name: "list_connections",
        description:
          "List the user's tools/channels and whether each is connected. Use before connecting or posting to know what is already set up.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    async run(_args, ctx, emit) {
      emit({ label: "Checking your connections" });
      const connected = await connectedSlugs(ctx);
      const list = PROVIDERS.map((p) => ({
        slug: p.slug,
        name: p.name,
        category: p.category,
        connected: connected.has(p.slug),
        account: connected.get(p.slug)?.account ?? null,
        connect_mode: connectMode(p.slug),
        can_post: p.canPost ?? null,
      }));
      const live = list.filter((p) => p.connected);
      return {
        ok: true,
        summary: `${live.length} of ${list.length} connected`,
        data: { connected_count: live.length, providers: list },
      };
    },
  },

  {
    def: {
      type: "function",
      function: {
        name: "connect_tool",
        description:
          "Give the user a link to connect one of their tools to Foundly (Gmail, Slack, X, LinkedIn, Instagram, Sheets, Calendar, Notion…). This is how you 'connect' anything — always call this rather than describing steps yourself.",
        parameters: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: `Provider slug. One of: ${slugList.join(", ")}`,
            },
            reason: {
              type: "string",
              description: "One short sentence on what connecting it unlocks, in your voice.",
            },
          },
          required: ["slug"],
        },
      },
    },
    async run(args, ctx, emit) {
      const slug = String(args.slug ?? "").trim().toLowerCase();
      const provider = getProvider(slug);
      if (!provider) {
        return {
          ok: false,
          summary: `No such tool: ${slug}`,
          data: { available: slugList },
        };
      }
      emit({ label: `Preparing the ${provider.name} link` });

      const already = await connectedSlugs(ctx);
      if (already.has(slug)) {
        const acct = already.get(slug)?.account;
        return {
          ok: true,
          summary: `${provider.name} is already connected${acct ? ` as ${acct}` : ""}`,
          link: { label: `${provider.name} · connected`, href: `${ctx.origin}/workspace/integrations` },
          data: { already_connected: true },
        };
      }

      const mode = connectMode(slug);
      const href =
        mode === "oauth"
          ? `${ctx.origin}/api/integrations/start?slug=${slug}`
          : `${ctx.origin}/connect/${slug}`;

      // NOT connected yet — this only produced a link. Saying otherwise makes
      // the model tell the user their account is linked when nothing is.
      return {
        ok: true,
        summary: `${provider.name}: link ready, not connected until they finish it`,
        link: { label: `Connect ${provider.name}`, href },
        data: {
          connected: false,
          awaiting_user: true,
          mode,
          say_this:
            `Give them the ${provider.name} link and say the connection completes when they open it — ` +
            `never say the account is already connected.`,
          note:
            mode === "paste"
              ? "The platform verifies a token you already hold before it is saved."
              : mode === "demo"
              ? "This deployment has no app credentials for this provider, so this is a demo consent screen that cannot access a real account."
              : "The platform's own consent screen.",
        },
      };
    },
  },

  {
    def: {
      type: "function",
      function: {
        name: "disconnect_tool",
        description: "Disconnect a tool the user no longer wants Foundly to have access to.",
        parameters: {
          type: "object",
          properties: { slug: { type: "string", description: "Provider slug to disconnect" } },
          required: ["slug"],
        },
      },
    },
    async run(args, ctx, emit) {
      const slug = String(args.slug ?? "").trim().toLowerCase();
      const provider = getProvider(slug);
      if (!provider) return { ok: false, summary: `No such tool: ${slug}` };
      emit({ label: `Disconnecting ${provider.name}` });
      const admin = adminClient();
      await admin.from("integration_tokens").delete().eq("user_id", ctx.userId).eq("slug", slug);
      await ctx.supabase.from("integrations").delete().eq("user_id", ctx.userId).eq("slug", slug);
      await ctx.supabase.from("activity").insert({
        user_id: ctx.userId, message: `Milo disconnected ${provider.name}`,
      });
      return { ok: true, summary: `${provider.name} disconnected` };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Building and publishing                                             */
  /* ------------------------------------------------------------------ */
  {
    def: {
      type: "function",
      function: {
        name: "build_site",
        description:
          "Build the user's website with the agent team. Use whenever they ask for a site, landing page or page for their business.",
        parameters: {
          type: "object",
          properties: {
            business_name: { type: "string", description: "The business name" },
            idea: { type: "string", description: "What the business does, in the user's words" },
            audience: { type: "string", description: "Who it is for, if known" },
            vibe: { type: "string", description: "Tone/aesthetic, if known" },
          },
          required: ["business_name", "idea"],
        },
      },
    },
    async run(args, ctx, emit) {
      const name = String(args.business_name ?? "").trim() || "Your Business";
      const idea = String(args.idea ?? "").trim();
      if (!idea) return { ok: false, summary: "I need to know what the business does first." };

      const brief = {
        businessName: name,
        idea,
        audience: args.audience ? String(args.audience) : undefined,
        vibe: args.vibe ? String(args.vibe) : undefined,
      };

      emit({ label: "Strategist", detail: "planning the page and the copy" });

      // Deliberately the deterministic team, not the live planner.
      //
      // The live planner runs on the slow reasoning model: measured 55-180s for
      // one call. Inside a conversation that is the wrong trade — the user is
      // watching a work log tick, and the built-in team already produces pages
      // that score 100/100. The Build screen keeps the live planner for when
      // someone wants the model's own copy. Speed is the feature here.
      emit({ label: "Builder", detail: "writing copy and assembling the page" });
      const b = buildSiteWithAgents(brief);
      const built = {
        html: b.html, steps: b.steps, score: b.score,
        title: b.title, description: b.description, guardrails: b.guardrails,
      };
      const engine: "builtin" = "builtin";
      const fallbackReason =
        "Built by the deterministic team so it lands in seconds; run a build from Build if you want the live planner's copy.";

      emit({ label: "Reviewer", detail: `scored ${built.score}/100` });

      // Save it as a draft, exactly like the Build screen's first stage, so the
      // conversation and the Build screen share one row.
      //
      // Slugs are unique across every user, but RLS only lets us read our own
      // rows — so a pre-flight "is this taken?" check cannot see someone else's
      // site and the insert still collides. The only reliable answer is to try
      // the insert and walk the counter forward on a duplicate key.
      const base = slugify(name) || "site";
      let site: any = null;
      let lastError: any = null;

      for (let i = 0; i < 40; i++) {
        const slug = i === 0 ? base : `${base}-${i + 1}`;
        const { data, error } = await ctx.supabase
          .from("sites")
          .insert({
            user_id: ctx.userId,
            business_name: name,
            idea,
            slug,
            html: built.html,
            published: false,
            score: built.score,
            agent_run: built.steps as any,
            content: {
              hero: idea, sub: built.description, engine,
              guardrails: built.guardrails,
              harness: { model: "built-in team", fallbackReason },
            } as any,
          })
          .select()
          .single();

        if (!error && data) { site = data; break; }
        lastError = error;
        const collision =
          error?.code === "23505" ||
          /duplicate key|sites_slug_key/i.test(error?.message ?? "");
        if (!collision) break;
      }

      if (!site) {
        return {
          ok: false,
          summary: `I couldn't save the page (${lastError?.code ?? "unknown"}). Nothing was published.`,
        };
      }

      await ctx.supabase.from("activity").insert({
        user_id: ctx.userId, message: `Milo built ${name} — ${built.score}/100`,
      });

      emit({ label: "Done", detail: `${built.score}/100` });

      return {
        ok: true,
        summary: `Built ${name} — ${built.score}/100`,
        link: { label: "Open in Build", href: `${ctx.origin}/workspace/build` },
        artifact: { kind: "site", html: built.html, title: name },
        data: {
          site_id: site.id, slug: site.slug, score: built.score, engine,
          public_path: `/s/${site.slug}`, published: false,
          fallback_reason: fallbackReason ?? null,
        },
      };
    },
  },

  {
    def: {
      type: "function",
      function: {
        name: "publish_site",
        description:
          "Publish or unpublish the user's site at its public /s/<slug> address. Only call publish when the user has clearly said to publish or go live.",
        parameters: {
          type: "object",
          properties: {
            slug: { type: "string", description: "Site slug. Omit to use the most recently built site." },
            published: { type: "boolean", description: "true to publish, false to take it down" },
          },
          required: [],
        },
      },
    },
    async run(args, ctx, emit) {
      const want = args.published !== false;
      let query = ctx.supabase.from("sites").select("id,slug,business_name,published");
      query = args.slug
        ? query.eq("slug", String(args.slug))
        : query.order("created_at", { ascending: false }).limit(1);
      const { data: rows } = await query;
      const site = (rows ?? [])[0];
      if (!site) return { ok: false, summary: "There's no site to publish yet — build one first." };

      emit({ label: want ? "Publishing" : "Unpublishing", detail: `/s/${site.slug}` });

      const { error } = await ctx.supabase
        .from("sites")
        .update({ published: want, published_url: want ? `/s/${site.slug}` : null })
        .eq("id", site.id);
      if (error) return { ok: false, summary: `Could not publish: ${error.message}` };

      await ctx.supabase.from("activity").insert({
        user_id: ctx.userId,
        message: want ? `Published /s/${site.slug}` : `Unpublished /s/${site.slug}`,
      });

      const href = `${ctx.origin}/s/${site.slug}`;
      return {
        ok: true,
        summary: want ? `Live at /s/${site.slug}` : `Took /s/${site.slug} down`,
        link: want ? { label: "View the live site", href } : undefined,
        data: { slug: site.slug, published: want, public_url: want ? href : null },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Posting                                                             */
  /* ------------------------------------------------------------------ */
  {
    def: {
      type: "function",
      function: {
        name: "post_to_social",
        description:
          "Publish a post to one of the user's connected channels. If they are not connected yet, this returns needs_connect — then call connect_tool.",
        parameters: {
          type: "object",
          properties: {
            slug: { type: "string", description: `Channel slug: ${slugList.join(", ")}` },
            body: { type: "string", description: "The exact post text to publish" },
          },
          required: ["slug", "body"],
        },
      },
    },
    async run(args, ctx, emit) {
      const slug = String(args.slug ?? "").trim().toLowerCase();
      const body = String(args.body ?? "").trim();
      const provider = getProvider(slug);
      if (!provider) return { ok: false, summary: `No such channel: ${slug}` };
      if (!body) return { ok: false, summary: "I need the post text before publishing." };

      const token = await getToken(ctx.userId, slug);
      if (!token?.access_token) {
        emit({ label: `${provider.name} is not connected` });
        return {
          ok: false,
          summary: `${provider.name} isn't connected yet`,
          data: { needs_connect: slug },
        };
      }

      emit({ label: `Publishing to ${provider.name}` });
      const admin = adminClient();
      const { data: log } = await admin
        .from("social_publications")
        .insert({ user_id: ctx.userId, slug, body, status: "pending" })
        .select()
        .single();

      const result = await publishTo(slug, token.access_token, body, {});

      await admin.from("social_publications").update({
        status: result.ok ? "sent" : "failed",
        external_id: result.externalId ?? null,
        external_url: result.url ?? null,
        error: result.error ?? null,
      }).eq("id", log!.id);

      await ctx.supabase.from("activity").insert({
        user_id: ctx.userId,
        message: result.ok ? `Milo published to ${provider.name}` : `Publish to ${provider.name} failed: ${result.error}`,
      });

      if (!result.ok) return { ok: false, summary: `${provider.name} rejected it: ${result.error}` };
      return {
        ok: true,
        summary: `Posted to ${provider.name}`,
        link: result.url ? { label: `See it on ${provider.name}`, href: result.url } : undefined,
        data: { external_id: result.externalId ?? null, url: result.url ?? null },
      };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Runs, docs, account                                                 */
  /* ------------------------------------------------------------------ */
  {
    def: {
      type: "function",
      function: {
        name: "run_capability",
        description:
          "Run one of Foundly's built-in jobs and put the result in Documents. Use for things like drafting a reply to a customer email, a quote, a plan, an FAQ.",
        parameters: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              description: "Capability slug, e.g. support-faq-reply-macros, quote, marketing-plan",
            },
            inputs: {
              type: "object",
              description: "The capability's inputs as key/value strings",
              additionalProperties: { type: "string" },
            },
          },
          required: ["kind"],
        },
      },
    },
    async run(args, ctx, emit) {
      const kind = String(args.kind ?? "").trim();
      const cap = getCapability(kind);
      if (!cap) return { ok: false, summary: `No such job: ${kind}`, data: { hint: "Call list_capabilities first." } };

      const inputs = (args.inputs && typeof args.inputs === "object" ? args.inputs : {}) as Record<string, string>;
      const missing = cap.inputs.filter((i) => i.required && !String(inputs?.[i.key] ?? "").trim());
      if (missing.length) {
        return {
          ok: false,
          summary: `Needs ${missing.map((m) => m.label).join(", ")} first`,
          data: { missing: missing.map((m) => ({ key: m.key, label: m.label })) },
        };
      }

      emit({ label: cap.title, detail: "running" });

      const { data: task, error } = await ctx.supabase.from("tasks").insert({
        user_id: ctx.userId, environment: cap.env, kind: cap.kind, title: cap.title,
        detail: cap.blurb, status: "queued", credit_cost: cap.credits, result: { inputs },
      }).select().single();
      if (error || !task) return { ok: false, summary: `Could not queue that: ${error?.message ?? "unknown"}` };

      const out = await executeTask(task.id);
      if ("error" in out) {
        return { ok: false, summary: `${cap.title} failed: ${(out as any).error}` };
      }
      emit({ label: "Saved to Documents" });
      return {
        ok: true,
        summary: `${cap.title} finished`,
        link: { label: "Open Documents", href: `${ctx.origin}/workspace/docs` },
        data: { task_id: task.id, ...(out as any) },
      };
    },
  },

  {
    def: {
      type: "function",
      function: {
        name: "list_capabilities",
        description: "List the built-in jobs Milo can run, with the inputs each one needs.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    async run(_args, _ctx, emit) {
      emit({ label: "Reading the job list" });
      // Imported lazily to keep this module's import graph flat.
      const { CAPABILITIES } = await import("@/lib/capabilities");
      return {
        ok: true,
        summary: `${CAPABILITIES.length} jobs available`,
        data: CAPABILITIES.map((c) => ({
          kind: c.kind, title: c.title, blurb: c.blurb, credits: c.credits,
          inputs: c.inputs.map((i) => ({ key: i.key, label: i.label, required: !!i.required })),
        })),
      };
    },
  },

  {
    def: {
      type: "function",
      function: {
        name: "list_documents",
        description: "List the documents/jobs the user already has, newest first.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    async run(_args, ctx, emit) {
      emit({ label: "Looking through Documents" });
      const { data } = await ctx.supabase
        .from("tasks")
        .select("id,title,kind,status,created_at")
        .order("created_at", { ascending: false })
        .limit(15);
      const rows = data ?? [];
      return {
        ok: true,
        summary: `${rows.length} document${rows.length === 1 ? "" : "s"}`,
        link: rows.length ? { label: "Open Documents", href: `${ctx.origin}/workspace/docs` } : undefined,
        data: rows,
      };
    },
  },

  {
    def: {
      type: "function",
      function: {
        name: "get_status",
        description: "The user's account snapshot: credits, plan, business name, open tasks and approvals.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    async run(_args, ctx, emit) {
      emit({ label: "Reading your account" });
      const [{ data: profile }, { data: tasks }] = await Promise.all([
        ctx.supabase.from("profiles").select("credits,plan,business_name").eq("id", ctx.userId).maybeSingle(),
        ctx.supabase.from("tasks").select("id,title,status").eq("user_id", ctx.userId).limit(50),
      ]);
      const open = (tasks ?? []).filter((t: any) => t.status === "needs_approval");
      return {
        ok: true,
        summary: `${profile?.credits ?? 0} credits, ${open.length} waiting on you`,
        data: {
          credits: profile?.credits ?? 0,
          plan: profile?.plan ?? "free",
          business_name: profile?.business_name ?? null,
          awaiting_approval: open.map((t: any) => ({ id: t.id, title: t.title })),
        },
      };
    },
  },
];

const byName = new Map(TOOLS.map((t) => [t.def.function.name, t]));

export const TOOL_DEFS: ToolDef[] = TOOLS.map((t) => t.def);

export function getTool(name: string) {
  return byName.get(name) ?? null;
}

/** Parse the model's arguments defensively — it can emit invalid JSON. */
export function parseArgs(raw: string): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
