// ECC-style harness for the Foundly agent team.
//
// Modelled on github.com/affaan-m/ECC ("the agent harness performance
// optimization system"): skills, instincts, memory, guardrails and
// research-first development. We don't shell out to a coding CLI — the same
// ideas are expressed as deterministic checks that run on every build, plus
// prompt fragments that steer the live model when one is configured.
//
// Layer order matters:
//   1. guardrails  — hard rules, checked before and after generation
//   2. research    — what a competitor page would say, assembled from the brief
//   3. skills      — reusable, opinionated patterns each agent pulls in
//   4. instincts   — learned corrections applied automatically
//   5. memory      — biases from the user's previous builds
//
// Nothing here throws. A failed layer degrades to a note, never a crash.

export type Guardrail = {
  id: string;
  rule: string;
  severity: "block" | "warn";
  passed: boolean;
  detail: string;
};

export type Instinct = {
  id: string;
  trigger: string;
  correction: string;
  hits: number;
};

export type MemoryHit = { kind: "name" | "price" | "vibe" | "audience"; value: string };

/* ------------------------------------------------------------------ */
/* 1. Guardrails                                                       */
/* ------------------------------------------------------------------ */

const SECRET_PATTERNS: [string, RegExp][] = [
  ["nvapi key", /nvapi-[A-Za-z0-9_\-]{20,}/],
  ["api key assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{12,}["']/i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["bearer token", /Bearer\s+[A-Za-z0-9\-._~+/]{24,}/],
  ["supabase service key", /\beyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/],
];

const CLAIM_PATTERNS: [string, RegExp][] = [
  ["unqualified guarantee", /\b(?:guaranteed|100% (?:safe|effective|cure)|risk[- ]free)\b/i],
  ["medical claim", /\b(?:cures?|treats?|prevents? (?:cancer|disease)|clinically proven)\b/i],
  ["financial promise", /\b(?:guaranteed returns?|risk[- ]free investment|double your money)\b/i],
  ["invented award", /\b(?:award[- ]winning|#1 (?:in|rated)|best in the world)\b/i],
];

/** Runs on the finished HTML + copy. Blocks secrets, flags risky claims. */
export function runGuardrails(html: string, copyText: string): Guardrail[] {
  const out: Guardrail[] = [];
  const haystack = `${html}\n${copyText}`;

  const secret = SECRET_PATTERNS.find(([, re]) => re.test(haystack));
  out.push({
    id: "G1.no-secrets",
    rule: "No credentials, tokens or private keys in generated output",
    severity: "block",
    passed: !secret,
    detail: secret ? `Blocked: output contained what looks like a ${secret[0]}.` : "Scanned 5 credential patterns — clean.",
  });

  const claim = CLAIM_PATTERNS.find(([, re]) => re.test(haystack));
  out.push({
    id: "G2.no-unearned-claims",
    rule: "No guarantees, medical claims or invented awards",
    severity: "warn",
    passed: !claim,
    detail: claim ? `Flagged: ${claim[0]} language. Rewrite before promoting.` : "No unearned claims found.",
  });

  const hasContact = /mailto:|tel:|href="\/contact/i.test(html);
  out.push({
    id: "G3.reachable",
    rule: "A real contact route exists",
    severity: "warn",
    passed: hasContact,
    detail: hasContact ? "Contact route present." : "No contact route — visitors cannot reach the business.",
  });

  const externalScript = /<script[^>]+src="http/i.test(html);
  out.push({
    id: "G4.self-contained",
    rule: "Page loads no third-party scripts (fast, private, cannot be hijacked)",
    severity: "warn",
    passed: !externalScript,
    detail: externalScript ? "External script found — inline it instead." : "No third-party scripts.",
  });

  const langAndCharset = /lang="en"/.test(html) && /charset="?utf-8"?/i.test(html);
  out.push({
    id: "G5.accessible-basics",
    rule: "Language and charset declared",
    severity: "warn",
    passed: langAndCharset,
    detail: langAndCharset ? "lang + charset set." : "Missing lang or charset — screen readers and encoders will guess.",
  });

  return out;
}

/** Rewrites unearned marketing claims into something the business can stand behind. */
const CLAIM_REWRITES: [RegExp, string][] = [
  [/\b(?:absolutely |totally )?guaranteed\b/gi, "reliable"],
  [/\b100% (?:safe|effective)\b/gi, "carefully made"],
  [/\brisk[- ]free\b/gi, "low-risk"],
  [/\bcures?\b/gi, "helps with"],
  [/\bclinically proven\b/gi, "well reviewed"],
  [/\baward[- ]winning\b/gi, "well regarded"],
  [/\b#1 (?:in|rated)\b/gi, "highly rated"],
  [/\bbest in the world\b/gi, "hard to beat"],
  [/\bdouble your money\b/gi, "grow steadily"],
  [/\bgame[- ]changing\b/gi, "useful"],
  [/\brevolutionary\b/gi, "new"],
];

export function sanitizeClaims<T>(input: T): { value: T; fixes: string[] } {
  const fixes: string[] = [];
  const walk = (v: any): any => {
    if (typeof v === "string") {
      let out = v;
      for (const [re, replacement] of CLAIM_REWRITES) {
        if (re.test(out)) {
          fixes.push(`Replaced “${(out.match(re) || [""])[0]}” with “${replacement}”.`);
          out = out.replace(re, replacement);
        }
        re.lastIndex = 0;
      }
      return out;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: any = {};
      for (const k of Object.keys(v)) o[k] = walk(v[k]);
      return o;
    }
    return v;
  };
  return { value: walk(input), fixes: [...new Set(fixes)] };
}

export function blocked(guards: Guardrail[]) {
  return guards.some((g) => g.severity === "block" && !g.passed);
}

/* ------------------------------------------------------------------ */
/* 2. Research: the reference the Strategist works from               */
/* ------------------------------------------------------------------ */

export function research(brief: { idea: string; audience?: string; price?: string }) {
  const idea = brief.idea.trim();
  const firstClause = idea.split(/[.,]/)[0];
  return {
    competitorPatterns: [
      "Top of page names the outcome, not the process.",
      "One price or one clear enquiry route — never both competing.",
      "Social proof sits directly under the first call to action.",
    ],
    differentiators: [
      `Made for ${brief.audience?.trim() || "a specific local audience"} rather than everyone.`,
      firstClause.length > 8 ? `The brief already names the product: “${firstClause}”.` : "Product line is still vague — ask the user.",
      brief.price?.trim() ? `Transparent pricing at ${brief.price.trim()}.` : "No price yet — pricing copy must invite an enquiry instead of inventing a number.",
    ],
    questions: [
      "Who is the single buyer you would most like to hear from this week?",
      "What can you deliver in 48 hours that a big competitor cannot?",
      brief.price?.trim() ? "Is that price per unit or per set?" : "What is the smallest order you would accept?",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 3. Skills: opinionated patterns the agents pull from                */
/* ------------------------------------------------------------------ */

export const SKILLS = {
  "copy.headline": {
    name: "Headline formula",
    rule: "Outcome + qualifier + action. Never a slogan the business cannot prove.",
    apply: (name: string, idea: string) =>
      `${name} — ${idea.split(/[.,]/)[0].slice(0, 60)}`,
  },
  "layout.above-fold": {
    name: "Above the fold",
    rule: "Headline, one sentence of proof, one call to action. Nothing else competes.",
  },
  "layout.sections": {
    name: "Section order",
    rule: "Problem → offer → how it works → proof → price → contact.",
  },
  "code.self-contained": {
    name: "Self-contained page",
    rule: "One HTML file, inline CSS, no build step, no external fonts or scripts.",
  },
  "a11y.basics": {
    name: "Accessibility floor",
    rule: "lang, charset, viewport, contrast ≥ 4.5:1, alt text, focus-visible outlines.",
  },
  "perf.no-network": {
    name: "Zero network budget",
    rule: "The page must render with the network off.",
  },
} as const;

/* ------------------------------------------------------------------ */
/* 4. Instincts: corrections that fire on trigger, every run          */
/* ------------------------------------------------------------------ */

export const INSTINCTS: Instinct[] = [
  { id: "I1", trigger: "price missing", correction: "Write “enquire for pricing” instead of inventing a number.", hits: 0 },
  { id: "I2", trigger: "no business name", correction: "Use the product phrase as the name and flag it.", hits: 0 },
  { id: "I3", trigger: "page under 180 words", correction: "Add a how-it-works and FAQ block to reach substance.", hits: 0 },
  { id: "I4", trigger: "no contact route", correction: "Insert a mailto call to action at the end.", hits: 0 },
  { id: "I5", trigger: "hyperbolic adjective", correction: "Replace “revolutionary/game-changing” with a concrete benefit.", hits: 0 },
];

export function fireInstincts(brief: { businessName?: string; price?: string }): Instinct[] {
  const fired: Instinct[] = [];
  if (!brief.price?.trim()) fired.push({ ...INSTINCTS[0], hits: 1 });
  if (!brief.businessName?.trim()) fired.push({ ...INSTINCTS[1], hits: 1 });
  return fired;
}

/* ------------------------------------------------------------------ */
/* 5. Memory: what this user has built before                          */
/* ------------------------------------------------------------------ */

export function recallMemory(previous: { business_name?: string | null; idea?: string | null }[]): MemoryHit[] {
  const hits: MemoryHit[] = [];
  const names = new Set<string>();
  for (const p of previous.slice(0, 10)) {
    if (p.business_name) names.add(p.business_name);
  }
  if (names.size) hits.push({ kind: "name", value: `${names.size} earlier name${names.size > 1 ? "s" : ""}: ${[...names].slice(0, 3).join(", ")}` });
  return hits;
}

/* ------------------------------------------------------------------ */
/* Prompt fragments for the live model                                 */
/* ------------------------------------------------------------------ */

export const HARNESS_PREAMBLE = `You are part of Foundly's coding-agent team (Strategist, Builder, Reviewer, Publisher).
Rules that always apply:
- Output must be a single self-contained HTML5 document with inline CSS and no external requests.
- Never invent prices, guarantees, awards, medical or financial claims.
- Never output credentials, tokens or keys of any kind.
- Copy must be specific to the brief. No lorem ipsum, no placeholder brackets.
- Accessibility floor: lang, charset, viewport, h1, alt text, focus styles.
- Keep paragraphs short (1-2 sentences). Left-aligned, dense, no oversized headlines.`;

export function strategistPrompt(brief: { businessName: string; idea: string; audience?: string; price?: string; vibe?: string }) {
  // Deliberately compact: this endpoint is a reasoning model, and every extra
  // instruction adds latency before the answer. One screen of rules is enough.
  const r = research(brief);
  return `You are Foundly's Strategist. Return ONLY compact JSON, no prose:
{"name":"","headline":"","eyebrow":"","sub":"","sections":[{"heading":"","body":""}],"faq":[{"q":"","a":""}],"cta":"","contactLine":""}

Rules: never invent prices, guarantees, awards or medical/financial claims; 1-2 sentence paragraphs; 3 sections max; 3 FAQs max; specific to the brief, no placeholders.
Patterns that work: ${r.competitorPatterns.join(" ")}
Differentiators available: ${r.differentiators.join(" ")}

Brief: name ${brief.businessName || "(none)"}; does ${brief.idea}; audience ${brief.audience || "(none)"}; price ${brief.price || "(none given — invite an enquiry)"}; vibe ${brief.vibe || "clean and warm"}.`;
}

export function builderPrompt(copy: any, vibe?: string) {
  return `You are Foundly's Builder. Write ONE self-contained HTML5 document.

HARD RULES
- Inline <style> only. No external CSS, JS, fonts or images. No network requests.
- Include: lang="en", charset, viewport, a single <h1>, alt text on any image, focus-visible styles.
- Short paragraphs (1-2 sentences). Left-aligned, dense, compact type. No oversized headlines.
- Use the copy verbatim. Invent no prices, guarantees or awards.
- Keep the whole file under 14,000 characters.

VIBE: ${vibe || "clean and warm — off-white background, one accent colour"}
COPY:
${JSON.stringify(copy)}

Output ONLY the HTML, starting with <!DOCTYPE html>. No commentary, no markdown fences.`;
}

export function reviewerPrompt(html: string) {
  return `${HARNESS_PREAMBLE}

TASK: You are the Reviewer. Audit this page and fix it.
Return ONLY JSON: {"score":0-100,"issues":["..."],"fixedHtml":"<!DOCTYPE html>..."}
If nothing needs fixing, return the original HTML in fixedHtml unchanged.

PAGE:
${html.slice(0, 24_000)}`;
}
