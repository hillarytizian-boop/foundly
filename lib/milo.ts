// Milo — Foundly's AI employee.
// Uses OpenAI when OPENAI_API_KEY is set, otherwise returns smart demo replies
// so the product works end-to-end before you add a key.

export const MILO_SYSTEM_PROMPT = `You are Milo, the AI employee inside Foundly.
Foundly turns a user's idea into a real business. You do the work: plan the idea,
build and publish a first website, make a logo and business email, write to stores
and customers, draft social posts, and set up Stripe payments.

Rules:
- Be concise, practical, and action-oriented. One clear next step at a time.
- Ask one clarifying question when the idea is vague (who is it for? what do they pay for?).
- When the idea is clear, propose: business name, one-line pitch, target customer,
  price, and the first 3 tasks you will do (site, outreach, social).
- Never claim to have sent emails or charged cards — say what you drafted and what needs approval.
- Keep tone warm, like a capable co-founder.`;

type Msg = { role: "user" | "assistant" | "system"; content: string };

function demoReply(userText: string): string {
  const t = userText.toLowerCase();
  if (t.includes("website") || t.includes("site") || t.includes("landing")) {
    return "Got it — I'll draft your landing page now. Tell me: (1) your business name, (2) who it's for, (3) what you sell. Then I'll generate the site and show you a preview in the Sites tab.";
  }
  if (t.includes("price") || t.includes("stripe") || t.includes("pay") || t.includes("charge")) {
    return "Let's set up payments. I recommend starting with a single offer: one price, one checkout link. Tell me your price and what the customer gets, and I'll create the Stripe checkout for you.";
  }
  if (t.includes("customer") || t.includes("outreach") || t.includes("email") || t.includes("store")) {
    return "I'll draft outreach for you. Who is your ideal customer — local shops, online sellers, or creators? Give me one example and I'll write the first message you can approve and send.";
  }
  if (t.includes("social") || t.includes("post") || t.includes("instagram") || t.includes("tiktok")) {
    return "I'll draft your first 3 social posts. What platform are you starting on, and what's your one-line pitch? I'll write hooks + captions you can copy-paste.";
  }
  if (t.includes("logo") || t.includes("brand") || t.includes("name")) {
    return "Let's lock the brand. Give me 2–3 name ideas (or say 'surprise me') and your vibe — playful, premium, or bold? I'll pick a name, tagline, and logo direction.";
  }
  return `Love it. Here's how I'll turn "${userText.slice(0, 80)}" into a business:\n\n1. Shape the idea — who it's for and what they pay for\n2. Build + publish a first website you can share today\n3. Draft outreach + social posts to get first reactions\n4. Set up Stripe so you can take your first payment\n\nTell me who it's for and what you'd charge, and I'll start with step 2 right away.`;
}

export async function askMilo(messages: Msg[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return demoReply(lastUser?.content ?? "");
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: MILO_SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
  if (!res.ok) throw new Error(`Milo AI request failed: ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? "I'm on it — give me a moment and try again.";
}

export function generateSiteContent(idea: string, businessName: string) {
  const name = businessName || "My Business";
  return {
    title: `${name} — ${idea.slice(0, 60)}`,
    hero: `We help you get it done, fast.`,
    sub: idea,
    sections: [
      { heading: "What we do", body: `Built around one clear promise: ${idea}` },
      { heading: "How it works", body: "Tell us what you need. We do the work and show you progress as we go." },
      { heading: "Get started", body: "Join the waitlist or book a first call. No commitment — just a real conversation." },
    ],
    cta: "Get started",
  };
}

export function generateOutreach(idea: string, audience: string) {
  const who = audience?.trim() || "local shops and potential customers";
  return `Subject: Quick idea for ${who}

Hi {{first_name}},

I'm building something for ${who} — ${idea.slice(0, 90)}.

I've already put together a one-page site and a simple offer, and I'd love your honest reaction:
would this solve a real problem for you?

If yes, I'll send over the details and a link. No pitch deck, no pressure — just a quick look
and a yes or no.

— {{your_name}}

---
Milo's notes:
- Send in batches of 10-20, personalized first line beats any template
- Follow up once after 3 days, then stop
- Track replies in the Outreach tab; nothing sends without your approval`;
}

export function generateSocial(idea: string, platform: string) {
  const p = platform?.trim() || "Instagram";
  return `3 launch posts for ${p} — ${idea.slice(0, 70)}

POST 1 — The announcement
Hook: "I built a thing. It's small. It might help you."
Body: ${idea.slice(0, 110)}. I'm opening it up to a few people this week to see if it's actually useful.
CTA: Comment "in" and I'll send you the link.
Hashtags: #buildinpublic #smallbusiness

POST 2 — The problem
Hook: "Most people don't need a business plan. They need one customer."
Body: That's what I'm testing — one offer, one page, one checkout link. Everything else is noise.
CTA: Reply with the one thing you'd pay to have solved.
Hashtags: #founder #solopreneur

POST 3 — The proof
Hook: "Day 3 of shipping in public."
Body: Here's what changed: the offer got simpler, the page got shorter, and I talked to 5 real people.
CTA: Want the next update? Follow along.
Hashtags: #indiehackers #startup

Milo's notes:
- Post 1 at 8-10am local, post 2 two days later, post 3 on day 3
- Reply to every comment within an hour during launch week
- Copy-paste only after you approve the wording`;
}
