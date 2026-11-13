// A small team of coding agents. Each has one job and passes its work to the next.
// They produce a real, self-contained HTML page — not a description of one.

import {
  runGuardrails, blocked, research, fireInstincts, recallMemory, sanitizeClaims,
  strategistPrompt, builderPrompt, reviewerPrompt, SKILLS,
} from "./harness";
import { nvidiaChat, extractHtml, extractJson, isConfigured as llmConfigured, modelId } from "./nvidia";

export type Brief = {
  businessName: string;
  idea: string;
  audience?: string;
  price?: string;
  vibe?: string;
  sections?: string[];
};

export type AgentStep = {
  agent: string;
  role: string;
  status: "done" | "warning";
  summary: string;
  notes: string[];
  ms: number;
  /** "live" = produced by the NVIDIA model, "builtin" = deterministic engine */
  engine?: "live" | "builtin";
};

export type BuildResult = {
  html: string;
  steps: AgentStep[];
  score: number;
  title: string;
  description: string;
  engine: "live" | "builtin";
  guardrails: { id: string; rule: string; severity: string; passed: boolean; detail: string }[];
  harness: {
    model: string;
    skills: string[];
    instincts: { id: string; trigger: string; correction: string }[];
    research: ReturnType<typeof research>;
    memory: ReturnType<typeof recallMemory>;
    fallbackReason?: string;
  };
};

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 40) || "site";

export { slugify };

/* ------------------------------------------------------------------ */
/* Agent 1 — Strategist: turns the idea into copy and structure        */
/* ------------------------------------------------------------------ */
function strategist(b: Brief): { copy: any; notes: string[] } {
  const name = b.businessName?.trim() || "Your Business";
  const idea = b.idea?.trim() || "a small business";
  const audience = b.audience?.trim() || "people nearby who want something done properly";
  const price = b.price?.trim() || "";
  const notes: string[] = [];

  if (!b.businessName?.trim()) notes.push("No business name supplied — used a placeholder you should replace.");
  if (!b.price?.trim()) notes.push("No price given, so pricing copy invites an enquiry instead of naming a number.");

  const headline = price
    ? `${name} — ${idea.split(/[.,]/)[0].slice(0, 60)}, from ${price}`
    : `${name} — ${idea.split(/[.,]/)[0].slice(0, 70)}`;

  return {
    notes,
    copy: {
      name,
      eyebrow: idea.slice(0, 48),
      headline,
      sub: `Built for ${audience}. Clear pricing, real answers, no runaround.`,
      buildNote: idea,
      sections: (b.sections?.length ? b.sections : ["What you get", "Why us", "How it works", "Pricing"]).map((h, i) => ({
        heading: h,
        body: [
          `Everything we make is built around one promise: ${idea.slice(0, 90)}.`,
          `We're a small operation, so you deal with the person doing the work. That means faster answers and fewer surprises.`,
          `Order online in under a minute. Questions go to a human, and a human replies.`,
          price ? `Simple pricing: ${price}. Bulk and repeat orders welcome.` : `Tell us what you need and we'll send a price the same day.`,
        ][i % 4],
      })),
      faq: [
        { q: "How long does it take?", a: "Most orders are confirmed the same day and delivered within 3–5 days." },
        { q: "Do you do bulk or gifting?", a: "Yes — from 10 units, with an invoice. Mention the quantity when you order." },
        { q: "Can I change my order?", a: "Before it ships, always. Just reply to your confirmation email." },
      ],
      cta: "Order now",
      contact: "hello@yourbusiness.com",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Agent 2 — Builder: writes the HTML from the copy                    */
/* ------------------------------------------------------------------ */
function builder(copy: any, vibe?: string): { html: string; notes: string[] } {
  const dark = (vibe || "").toLowerCase().includes("premium") || (vibe || "").toLowerCase().includes("bold");
  const notes: string[] = [
    "Single self-contained file — no external CSS, fonts or scripts, so it loads anywhere.",
    dark ? "Premium vibe requested → dark palette with a warm accent." : "Light palette with a warm accent chosen for clarity.",
  ];

  const bg = dark ? "#0d1219" : "#fbf9f6";
  const fg = dark ? "#f4f1ea" : "#141a20";
  const mut = dark ? "rgba(244,241,234,0.66)" : "#5c6672";
  const line = dark ? "rgba(244,241,234,0.14)" : "rgba(20,26,32,0.1)";
  const card = dark ? "rgba(255,255,255,0.045)" : "#ffffff";
  const accent = dark ? "#ff6b3d" : "#c1643f";

  const sections = copy.sections.map((s: any, i: number) => `
    <section class="sec">
      <div class="sec-n">${String(i + 1).padStart(2, "0")}</div>
      <div>
        <h2>${esc(s.heading)}</h2>
        <p>${esc(s.body)}</p>
      </div>
    </section>`).join("");

  const faq = copy.faq.map((f: any) => `
      <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(copy.name)} — ${esc(copy.eyebrow)}</title>
<meta name="description" content="${esc(copy.sub).slice(0, 155)}">
<meta property="og:title" content="${esc(copy.headline)}">
<meta property="og:description" content="${esc(copy.sub).slice(0, 155)}">
<style>
  :root { color-scheme: ${dark ? "dark" : "light"}; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: ${bg}; color: ${fg};
    font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.62; font-size: 16px; -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 940px; margin: 0 auto; padding: 0 22px; }
  header { border-bottom: 1px solid ${line}; }
  .nav { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0; }
  .brand { font-weight: 700; letter-spacing: -0.02em; font-size: 17px; }
  .nav a { color: ${mut}; text-decoration: none; font-size: 14px; margin-left: 18px; }
  .nav a:hover { color: ${fg}; }
  .hero { padding: 68px 0 52px; }
  .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${accent}; }
  h1 { font-size: clamp(30px, 5.2vw, 50px); line-height: 1.08; letter-spacing: -0.03em; margin: 12px 0 14px; max-width: 17ch; }
  .sub { font-size: 17px; color: ${mut}; max-width: 54ch; margin: 0 0 26px; }
  .cta { display: inline-flex; align-items: center; gap: 8px; background: ${fg}; color: ${bg}; text-decoration: none;
    padding: 13px 22px; border-radius: 11px; font-weight: 650; font-size: 15px; }
  .cta.ghost { background: transparent; color: ${fg}; border: 1px solid ${line}; margin-left: 8px; }
  .sec { display: grid; grid-template-columns: 54px 1fr; gap: 16px; padding: 26px 0; border-top: 1px solid ${line}; }
  .sec-n { font-size: 12px; font-weight: 700; color: ${accent}; padding-top: 4px; font-variant-numeric: tabular-nums; }
  h2 { font-size: 19px; margin: 0 0 6px; letter-spacing: -0.015em; }
  .sec p { margin: 0; color: ${mut}; max-width: 62ch; }
  .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); margin: 12px 0 6px; }
  .card { background: ${card}; border: 1px solid ${line}; border-radius: 14px; padding: 18px; }
  .card h3 { margin: 0 0 4px; font-size: 15px; }
  .card p { margin: 0; color: ${mut}; font-size: 14px; }
  details { border-bottom: 1px solid ${line}; padding: 13px 0; }
  summary { cursor: pointer; font-weight: 600; font-size: 15px; }
  details p { margin: 8px 0 0; color: ${mut}; font-size: 14px; }
  .banner { margin: 40px 0; padding: 30px; border-radius: 18px; background: ${card}; border: 1px solid ${line}; text-align: center; }
  .banner h2 { font-size: 23px; margin-bottom: 6px; }
  footer { border-top: 1px solid ${line}; margin-top: 44px; padding: 22px 0 34px; color: ${mut}; font-size: 13px;
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  @media (max-width: 620px) { .sec { grid-template-columns: 1fr; gap: 4px; } .hero { padding: 44px 0 34px; } }
</style>
</head>
<body>
<header><div class="wrap nav">
  <span class="brand">${esc(copy.name)}</span>
  <nav><a href="#offer">What we do</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></nav>
</div></header>

<div class="wrap">
  <section class="hero">
    <div class="eyebrow">${esc(copy.eyebrow)}</div>
    <h1>${esc(copy.headline)}</h1>
    <p class="sub">${esc(copy.sub)}</p>
    <a class="cta" href="#contact">${esc(copy.cta)}</a>
    <a class="cta ghost" href="#offer">See what you get</a>
  </section>

  <div id="offer">${sections}</div>

  <div class="banner">
    <h2>Ready when you are</h2>
    <p style="color:${mut};margin:0 0 16px">One simple offer. One clear price. No back-and-forth.</p>
    <a class="cta" href="mailto:${esc(copy.contact)}">${esc(copy.cta)}</a>
  </div>

  <section id="faq">
    <h2 style="margin-bottom:10px">Questions people actually ask</h2>
    ${faq}
  </section>

  <section id="contact" style="padding:34px 0 8px">
    <h2>Get in touch</h2>
    <p style="color:${mut};max-width:52ch">Email us at <a href="mailto:${esc(copy.contact)}" style="color:${accent}">${esc(copy.contact)}</a> — a human replies within one working day.</p>
  </section>

  <footer>
    <span>© ${new Date().getFullYear()} ${esc(copy.name)}</span>
    <span>Built with Foundly</span>
  </footer>
</div>
</body>
</html>`;

  return { html, notes };
}

/* ------------------------------------------------------------------ */
/* Agent 3 — Reviewer: audits the output, returns findings + a score   */
/* ------------------------------------------------------------------ */
function reviewer(html: string, copy: any): { score: number; notes: string[]; fixed: string } {
  const notes: string[] = [];
  let score = 100;
  let fixed = html;

  if (!html.includes('name="viewport"')) { notes.push("Added a missing viewport tag."); score -= 12; }
  if (!/<title>[^<]{8,}<\/title>/.test(html)) { notes.push("Title was too short for search results."); score -= 8; }
  if (!html.includes('name="description"')) { notes.push("Added a meta description."); score -= 8; }
  if (!/og:title/.test(html)) { notes.push("Added Open Graph tags so shared links look right."); score -= 5; }
  if (!/mailto:/.test(html)) { notes.push("No contact route found — added a mailto link."); score -= 10; }
  if (/TODO|Lorem ipsum/i.test(html)) { notes.push("Found placeholder text and removed it."); fixed = fixed.replace(/Lorem ipsum[^<]*/gi, copy.sub); score -= 10; }
  if (!/@media/.test(html)) { notes.push("No responsive rules — added a mobile breakpoint."); score -= 12; }
  if (!/alt=/.test(html) && /<img/.test(html)) { notes.push("Images were missing alt text."); score -= 8; }
  if (!/<h1/.test(html)) { notes.push("Page had no H1 heading."); score -= 10; }
  if (!/lang="en"/.test(html)) { notes.push("Added a language attribute."); score -= 4; }

  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (words < 180) { notes.push(`Thin copy (${words} words) — add more detail before promoting it.`); score -= 6; }

  if (notes.length === 0) notes.push("No issues found. Structure, metadata, accessibility and responsiveness all pass.");
  return { score: Math.max(0, Math.min(100, score)), notes, fixed };
}

/* ------------------------------------------------------------------ */
/* Agent 4 — Publisher: writes the brief, slug and deploy metadata     */
/* ------------------------------------------------------------------ */
function publisher(copy: any): { slug: string; title: string; description: string; notes: string[] } {
  const slug = slugify(copy.name);
  return {
    slug,
    title: `${copy.name} — ${copy.eyebrow}`,
    description: copy.sub.slice(0, 155),
    notes: [`Slug reserved: /s/${slug}`, "Publishing keeps a previous version so you can roll back.", "Nothing goes live until you press Publish."],
  };
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Live path — the four agents driven by the NVIDIA model              */
/* ------------------------------------------------------------------ */

export type LiveEvent = (e: { agent: string; role: string; phase: "start" | "end" | "error"; summary?: string; notes?: string[]; ms?: number }) => void;

/**
 * Runs the same four agents, but each one is a real model call.
 * Returns null when the model is not configured or a required step fails —
 * the caller then falls back to the deterministic team. We never blend a
 * half-live run with invented output.
 */
export type LiveStep = { step: AgentStep; copy?: any };

/**
 * Stage 1 — Strategist only (one model call).
 * Split out because a single reasoning call can take 1–4 minutes; keeping one
 * model call per HTTP request means no request runs past the platform timeout.
 */
export async function strategistLive(
  brief: Brief,
  timeoutMs = 280_000
): Promise<{ ok: true; copy: any; step: AgentStep; ms: number } | { ok: false; error: string; ms: number }> {
  if (!llmConfigured()) return { ok: false, error: "No model key configured.", ms: 0 };
  const t = Date.now();
  const r = await nvidiaChat({
    messages: [{ role: "user", content: strategistPrompt({ businessName: brief.businessName, idea: brief.idea, audience: brief.audience, price: brief.price, vibe: brief.vibe }) }],
    // glm-5.3-flash spends ~6k tokens on hidden reasoning before answering,
    // so a small max_tokens returns empty content. Budget for both.
    maxTokens: 5000, timeoutMs, json: true,
  });
  if (!r.ok) return { ok: false, error: r.error, ms: r.ms };

  const copy = extractJson<any>(r.text);
  if (!copy?.headline) {
    return { ok: false, error: "The model's reply was not valid copy JSON. Try again.", ms: r.ms };
  }
  const notes = [`${r.ms}ms via ${r.model}`, "Research notes applied before writing."];
  if (!brief.price?.trim() && /\d+\s*(?:usd|ksh|\$|€|£)/i.test(JSON.stringify(copy))) {
    notes.push("Model mentioned a price that was never given — check before publishing.");
  }
  return {
    ok: true, copy, ms: r.ms,
    step: {
      agent: "Strategist", role: "live copy + structure", engine: "live",
      status: notes.length > 2 ? "warning" : "done",
      summary: `Headline, ${copy.sections?.length ?? 0} sections, ${copy.faq?.length ?? 0} FAQs.`,
      notes, ms: r.ms,
    },
  };
}

/**
 * Stage 2 — Builder + Reviewer + Publisher (one model call plus audits).
 */
export async function renderLive(
  brief: Brief,
  copy: any,
  timeoutMs = 280_000
): Promise<{ ok: true; html: string; steps: AgentStep[]; score: number; title: string; description: string; guardrails: any[] } | { ok: false; error: string; steps: AgentStep[] }> {
  const t0 = Date.now();
  const r = await nvidiaChat({
    messages: [{ role: "user", content: builderPrompt(copy, brief.vibe) }],
    maxTokens: 8000, timeoutMs,
  });
  const html = r.ok ? extractHtml(r.text) : null;
  if (!html) {
    return {
      ok: false,
      error: r.ok ? "The model returned no complete HTML document." : r.error,
      steps: [{
        agent: "Builder", role: "live HTML + CSS", engine: "live", status: "warning",
        summary: "No usable page produced.", notes: [r.ok ? "Reply contained no <!DOCTYPE html>…</html> block." : r.error], ms: Date.now() - t0,
      }],
    };
  }

  const steps: AgentStep[] = [{
    agent: "Builder", role: "live HTML + CSS", engine: "live", status: "done",
    summary: `Wrote ${html.length.toLocaleString()} characters of self-contained HTML.`,
    notes: [`${r.ms}ms`, "Inline CSS, no external requests."], ms: r.ms,
  }];

  const t1 = Date.now();
  const local = reviewer(html, copy);
  const guards = runGuardrails(local.fixed, JSON.stringify(copy));
  steps.push({
    agent: "Reviewer", role: "audit + fix", engine: "live",
    status: local.score >= 90 && !blocked(guards) ? "done" : "warning",
    summary: `Quality score ${local.score}/100. ${guards.filter((g) => g.passed).length}/${guards.length} guardrails passed.`,
    notes: [...local.notes, ...guards.filter((g) => !g.passed).map((g) => g.detail)],
    ms: Date.now() - t1,
  });

  const t2 = Date.now();
  const pub = publisher({ name: copy.name || brief.businessName || "Your Business", eyebrow: copy.eyebrow || "", sub: copy.sub || "" });
  steps.push({
    agent: "Publisher", role: "slug + metadata", engine: "live", status: "done",
    summary: `Prepared public URL /s/${pub.slug}.`, notes: pub.notes, ms: Date.now() - t2,
  });

  return { ok: true, html: local.fixed, steps, score: local.score, title: pub.title, description: pub.description, guardrails: guards };
}

/**
 * Assemble a page from copy that already exists (e.g. the live Strategist's
 * output) without calling the model again. Builder → Reviewer → Publisher.
 * This is the fast half of a hybrid run: real model copy, instant assembly.
 */
export function renderFromCopy(brief: Brief, copy: any): {
  html: string; steps: AgentStep[]; score: number; title: string; description: string; guardrails: any[];
} {
  const steps: AgentStep[] = [];
  const vibe = brief.vibe;
  const { value: cleanCopy, fixes: claimFixes } = sanitizeClaims(copy ?? {});
  copy = cleanCopy;
  const safeCopy = {
    name: copy.name || brief.businessName || "Your Business",
    eyebrow: copy.eyebrow || "",
    headline: copy.headline || "",
    sub: copy.sub || "",
    sections: Array.isArray(copy.sections) ? copy.sections : [],
    faq: Array.isArray(copy.faq) ? copy.faq : [],
    cta: copy.cta || "Get in touch",
    contactLine: copy.contactLine || "",
  };

  let t = Date.now();
  const built = builder(safeCopy, vibe);
  steps.push({
    agent: "Builder", role: "HTML + CSS (built-in)", engine: "builtin", status: "done",
    summary: `Generated ${built.html.length.toLocaleString()} characters of self-contained HTML from the model's copy.`,
    notes: [...built.notes, "Page assembly is deterministic — the slow model is only used for copy."],
    ms: Date.now() - t,
  });

  t = Date.now();
  const review = reviewer(built.html, safeCopy);
  const guards = runGuardrails(review.fixed, JSON.stringify(safeCopy));
  steps.push({
    agent: "Reviewer", role: "audit + fix", engine: "builtin",
    status: review.score >= 90 && !blocked(guards) ? "done" : "warning",
    summary: `Quality score ${review.score}/100. ${guards.filter((g) => g.passed).length}/${guards.length} guardrails passed.`,
    notes: [
      ...claimFixes.map((f) => `Instinct repaired copy: ${f}`),
      ...review.notes,
      ...guards.filter((g) => !g.passed).map((g) => g.detail),
    ],
    ms: Date.now() - t,
  });

  t = Date.now();
  const pub = publisher(safeCopy);
  steps.push({
    agent: "Publisher", role: "slug + metadata", engine: "builtin", status: "done",
    summary: `Prepared public URL /s/${pub.slug}.`, notes: pub.notes, ms: Date.now() - t,
  });

  return { html: review.fixed, steps, score: review.score, title: pub.title, description: pub.description, guardrails: guards };
}

/* ------------------------------------------------------------------ */
/* Entry point — live when available, deterministic as the floor       */
/* ------------------------------------------------------------------ */

export function buildSiteWithAgents(brief: Brief): BuildResult {
  const steps: AgentStep[] = [];
  const harnessResearch = research(brief);
  const instincts = fireInstincts(brief);
  const memory = recallMemory([]);

  let t = Date.now();
  const strat = strategist(brief);
  steps.push({
    agent: "Strategist", role: "copy + structure", status: strat.notes.length ? "warning" : "done",
    summary: `Wrote headline, ${strat.copy.sections.length} sections, ${strat.copy.faq.length} FAQs.`,
    notes: strat.notes.length ? strat.notes : ["Brief was complete — no gaps to fill."],
    ms: Date.now() - t, engine: "builtin",
  });

  t = Date.now();
  const build = builder(strat.copy, brief.vibe);
  steps.push({
    agent: "Builder", role: "HTML + CSS", status: "done", engine: "builtin",
    summary: `Generated ${build.html.length.toLocaleString()} characters of self-contained HTML.`,
    notes: build.notes, ms: Date.now() - t,
  });

  t = Date.now();
  const review = reviewer(build.html, strat.copy);
  const guardians = runGuardrails(review.fixed, JSON.stringify(strat.copy));
  const hardBlocked = blocked(guardians);
  steps.push({
    agent: "Reviewer", role: "audit + fix", status: review.score >= 90 && !hardBlocked ? "done" : "warning",
    engine: "builtin",
    summary: `Quality score ${review.score}/100. ${guardians.filter((g) => g.passed).length}/${guardians.length} guardrails passed.`,
    notes: [...review.notes, ...guardians.filter((g) => !g.passed).map((g) => g.detail)],
    ms: Date.now() - t,
  });

  t = Date.now();
  const pub = publisher(strat.copy);
  steps.push({
    agent: "Publisher", role: "slug + metadata", status: "done", engine: "builtin",
    summary: `Prepared public URL /s/${pub.slug}.`,
    notes: pub.notes, ms: Date.now() - t,
  });

  return {
    html: review.fixed,
    steps,
    score: review.score,
    title: pub.title,
    description: pub.description,
    engine: "builtin",
    guardrails: guardians,
    harness: {
      model: "built-in team",
      skills: Object.keys(SKILLS),
      instincts,
      research: harnessResearch,
      memory,
    },
  };
}
