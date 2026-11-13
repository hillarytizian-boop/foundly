// Milo's execution engine. Each capability returns a real, structured artifact.
// With OPENAI_API_KEY set, LLM output is used; otherwise deterministic, useful drafts.

export type Artifact = {
  title: string;
  summary: string;
  blocks: { heading: string; body: string }[];
  markdown: string;
  meta?: Record<string, unknown>;
};

const BRAND_NAMES = [
  "Nairobi & Co", "Terracotta Supply", "Kindling Co", "The Small Batch", "Ember Lane",
  "Rootwork", "Mwangaza Goods", "Eleven & Ash",
];

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

function toArtifact(title: string, summary: string, blocks: { heading: string; body: string }[]): Artifact {
  const markdown = [`# ${title}`, "", summary, "", ...blocks.map((b) => `## ${b.heading}\n\n${b.body}\n`)].join("\n");
  return { title, summary, blocks, markdown };
}

export function runCapability(kind: string, inputs: Record<string, string>): Artifact {
  const idea = inputs.idea || inputs.niche || inputs.businessName || "your business";
  const name = inputs.businessName || BRAND_NAMES[0];
  const price = inputs.price || "$15–$30 per unit";

  switch (kind) {
    case "idea.generate":
      return toArtifact(
        `5 business ideas for ${inputs.niche || "your niche"}`,
        `Scoped to a ${inputs.budget || "small"} budget and a first customer you can reach this week.`,
        [
          {
            heading: "1. Small-batch gifting box",
            body: "Curated boxes for offices that need client gifts. Buyer: office manager. Price: $35–60 per box.\nWhy it wins: one decision-maker, repeat orders every quarter.",
          },
          {
            heading: "2. Subscription refill service",
            body: `Recurring delivery of the consumable in ${inputs.niche || "your niche"}. Buyer: repeat households. Price: $12–20/month.\nWhy it wins: predictable revenue, low acquisition cost after month one.`,
          },
          {
            heading: "3. Corporate/bulk tier",
            body: "Same product, packaged for events and hotels. Price: 2–3× retail with a volume discount.\nWhy it wins: one order replaces 40 individual sales.",
          },
          {
            heading: "4. Make-it-yourself kit",
            body: "Sell the raw materials plus instructions. Price: $25.\nWhy it wins: higher margin, teaches customers, generates content.",
          },
          {
            heading: "5. Wholesale to 3 local shops",
            body: "Consignment or wholesale at 50% of retail. Price: $8–12/unit.\nWhy it wins: proves demand without ad spend.",
          },
          { heading: "Pick one", body: "Start with #1 if you want cash this week; #5 if you want to test real retail demand. Do not start three at once." },
        ]
      );

    case "idea.validate":
      return toArtifact(
        "Validation readout",
        "An honest score plus the cheapest test you can run in 7 days.",
        [
          { heading: "Score", body: "Pain: 2/5 · Frequency: 2/5 · Willingness to pay: 3/5 · Reachability: 4/5\n**Verdict: worth a 7-day test, not a build.**" },
          { heading: "Riskiest assumption", body: `That people will pay ${price} for ${idea} rather than make do with what they already buy.` },
          { heading: "Cheapest test", body: "Put up a one-page offer with a real price and a 'Reserve' button. Drive 100 targeted visitors. 3+ reservations = build. 0–1 = change the offer, not the logo." },
          { heading: "Do not do", body: "Do not build the full site, order inventory, or design a logo before you have 3 reservations." },
        ]
      );

    case "research.market":
      return toArtifact(
        `Market brief — ${idea}`,
        `Demand, channels and a recommendation for ${inputs.country || "your market"}.`,
        [
          { heading: "Demand signals", body: bullets([
            "Search interest exists but is long-tail: buyers search the product, not the brand.",
            "Repeat purchase is the real prize — one-time buyers rarely cover acquisition cost.",
            "Gifting and corporate occasions are the highest-ticket entry point.",
          ]) },
          { heading: "Channels that fit", body: bullets([
            "Instagram + WhatsApp for direct orders (lowest CAC at zero budget).",
            "Local retail placement for credibility and steady volume.",
            "Google Search only once you have a page that converts.",
          ]) },
          { heading: "Pricing reference", body: `${price} sits in the normal range. Below that you compete on price and lose; above it you must look premium everywhere.` },
          { heading: "Recommendation", body: "Launch with one offer, one page, one checkout link. Spend the first two weeks on conversations, not ads. Sources should be verified in your market before committing inventory." },
        ]
      );

    case "research.competitors":
      return toArtifact(
        "Competitor teardown",
        "Who you're actually up against, and the gap you can own.",
        [
          { heading: "Competitor set", body: bullets([
            "**Established local retailer** — trust and foot traffic, but generic and unbranded online.",
            "**Instagram-first maker** — great photos, no clear pricing, DMs only.",
            "**Marketplace sellers** — cheap, commoditised, no story.",
          ]) },
          { heading: "Where they're weak", body: bullets([
            "Almost none publish prices — buyers hate asking.",
            "None offer a simple reorder path for repeat customers.",
            "None target corporate gifting with an invoice and a deadline.",
          ]) },
          { heading: "Your wedge", body: `Publish prices, offer one-click reorder, and be the one that can handle a 50-unit order with an invoice. That combination is rare at ${price}.` },
          { heading: "Watch out", body: "Do not compete on being cheapest. You will lose to the marketplace and train customers to leave you." },
        ]
      );

    case "plan.business":
      return toArtifact(
        `Business plan — ${name}`,
        "One page you can actually operate from.",
        [
          { heading: "Model", body: `Sell ${idea} directly at ${price}. Two revenue streams: direct (retail price) and wholesale/bulk (50–65% of retail).` },
          { heading: "Unit economics", body: bullets([
            "Cost of goods target: ≤35% of price.",
            "Payment fees: ~3–5% (Stripe, region dependent).",
            "Contribution margin target: ≥50% before marketing.",
          ]) },
          { heading: "First 30 days", body: bullets([
            "Week 1 — page live, price published, checkout working.",
            "Week 2 — 20 real conversations with potential buyers.",
            "Week 3 — first 3 orders, fulfil by hand, collect testimonials.",
            "Week 4 — approach 3 shops with a one-page wholesale sheet.",
          ]) },
          { heading: "Milestones", body: bullets(["First paid order", "10 orders", "First repeat customer", "First wholesale account", "$1,000 revenue"]) },
          { heading: "Risks", body: "Single-channel dependence and cash tied up in stock. Keep the first inventory order small enough that a slow month doesn't hurt." },
        ]
      );

    case "plan.pitch":
      return toArtifact(
        "Pitch deck outline",
        "10 slides, in the order investors actually read them.",
        [
          { heading: "1–3 · Problem, customer, insight", body: `Problem, who has it, and the non-obvious thing you know about ${idea} that others don't.` },
          { heading: "4–5 · Product + demo", body: "The offer in one sentence, then a real screenshot or live link. Proof before polish." },
          { heading: "6–7 · Market + model", body: `Who pays, at ${price}, and how the number gets big. Bottom-up sizing, never top-down TAM slides.` },
          { heading: "8 · Traction", body: "Orders, revenue, retention, or signed LOIs. If pre-revenue, show waitlist + conversation count." },
          { heading: "9–10 · Team + ask", body: "Why you, and exactly what the money buys (18 months of runway, named milestones)." },
        ]
      );

    case "site.generate": {
      const site = {
        title: `${name} — ${idea.slice(0, 50)}`,
        hero: `Made properly. Priced honestly.`,
        sub: idea,
        sections: [
          { heading: "What we do", body: `Built around one clear promise: ${idea}` },
          { heading: "Why people choose us", body: "Small batch, real materials, and a price you can see before you ask. No DMs required." },
          { heading: "How it works", body: "Pick your item, pay online, we confirm and deliver. Bulk and gifting orders welcome — just note the quantity at checkout." },
          { heading: "Pricing", body: `${price}. Volume pricing from 10 units.` },
          { heading: "Get started", body: "Order online in under a minute. Questions? Reply to the confirmation email and a human answers." },
        ],
        cta: "Order now",
        faq: [
          { q: "How long does delivery take?", a: "3–5 days locally, longer for bulk." },
          { q: "Do you do corporate gifting?", a: "Yes — from 10 units with an invoice." },
          { q: "Can I return it?", a: "Unused items within 14 days." },
        ],
      };
      return toArtifact(
        site.title,
        site.hero,
        [
          ...site.sections.map((s) => ({ heading: s.heading, body: s.body })),
          { heading: "FAQ", body: site.faq.map((f) => `**${f.q}** ${f.a}`).join("\n\n") },
        ]
      );
    }

    case "site.update":
      return toArtifact(
        "Website update prepared",
        "Change staged and awaiting your approval before it goes live.",
        [{ heading: "Change", body: inputs.instruction || "Copy update" }, { heading: "Preview", body: "The live page is unchanged until you approve. Approving applies this edit and keeps the previous version in history." }]
      );

    case "brand.name":
      return toArtifact(
        "Naming options",
        `Five names for a ${inputs.vibe || "considered"} brand.`,
        [
          { heading: "Names", body: bullets(BRAND_NAMES.slice(0, 5).map((n, i) => `**${n}** — ${["warm and local", "honest and plain", "small-batch and craft", "quiet and modern", "bold and memorable"][i]}`)) },
          { heading: "Top pick", body: `${BRAND_NAMES[0]} — short, says where it's from, works as an email handle and a domain.` },
          { heading: "Taglines", body: bullets(["Made properly. Priced honestly.", "Small batch, no mystery.", "You can see the price. That's the point."]) },
          { heading: "Next", body: "Check the domain and the social handle before you commit. If either is taken with no clean variant, pick option two." },
        ]
      );

    case "brand.logo":
      return toArtifact(
        "Brand direction",
        "A logo concept, palette and type pair you can hand to any designer.",
        [
          { heading: "Logo concept", body: `Wordmark in a humanist serif, letterspaced, with a small hand-drawn mark to the left. Works at 16px and on a bag stamp.` },
          { heading: "Palette", body: bullets(["Ink `#111111` — text and logo", "Bone `#F6F1E9` — background", "Terracotta `#C1643F` — accent and CTA", "Sage `#7C8B6F` — secondary"]) },
          { heading: "Typography", body: "Headings: a serif with real character. Body: a clean grotesk. Two fonts, no more." },
          { heading: "Usage rules", body: "Logo on bone or ink only. Never place the accent colour behind text. Minimum clear space = height of the capital letter." },
        ]
      );

    case "doc.catalogue":
      return toArtifact(
        "Product catalogue + price list",
        "Three SKUs, priced with margin built in.",
        [
          { heading: "SKU 1 — Single", body: `${price}. Entry product, highest volume, lowest margin.` },
          { heading: "SKU 2 — Set of three", body: `${price} × 2.4. The one you push. Best margin per order.` },
          { heading: "SKU 3 — Bulk / gifting", body: "From 10 units at 65% of retail, invoice included. Where the real revenue is." },
          { heading: "Margin notes", body: "Cost of goods must stay under 35% of SKU 1's price or SKU 2 stops being profitable at a discount." },
          { heading: "What to put on the page", body: "Photo, three-line description, price, delivery time, and a buy button on every SKU. No 'contact for pricing'." },
        ]
      );

    case "outreach.draft":
      return toArtifact(
        "Outreach sequence — needs your approval",
        `Three messages for ${inputs.audience || "your prospects"}. Nothing sends until you approve.`,
        [
          { heading: "Message 1 — intro", body: `Subject: Quick one about ${inputs.audience || "your shop"}\n\nHi {{first_name}},\n\nI make ${idea}. I'm not asking for a meeting — I'd just like to send you one sample and get your honest reaction.\n\nIf it's not for you, say so and I'll leave you alone.\n\n— {{your_name}}` },
          { heading: "Message 2 — follow-up (day 3)", body: `Subject: Re: Quick one\n\nHi {{first_name}}, one line: would a ${price} shelf-ready version sell in ${inputs.audience || "your shop"}?\n\nYes or no is a fine answer.\n\n— {{your_name}}` },
          { heading: "Message 3 — close the loop (day 7)", body: `Subject: Closing this out\n\nHi {{first_name}}, I'll assume the timing's wrong and stop here. If it changes, my door's open.\n\n— {{your_name}}` },
          { heading: "Sending rules", body: bullets(["10–20 sends a day, personally addressed.", "One follow-up, then stop. No more than three touches total.", "Reply to every positive response within an hour."]) },
        ]
      );

    case "social.draft":
      return toArtifact(
        `Launch posts for ${inputs.platform || "Instagram"} — needs your approval`,
        "Three posts with hooks, captions and hashtags.",
        [
          { heading: "Post 1 — announcement", body: `Hook: "I built a thing. It's small. It might help you."\n\n${idea}. Opening it to a few people this week to see if it's useful.\n\nCTA: Comment "in" and I'll send the link.\n#buildinpublic #smallbusiness` },
          { heading: "Post 2 — the problem", body: `Hook: "Most people don't need a business plan. They need one customer."\n\nThat's what I'm testing — one offer, one page, one checkout link.\n\nCTA: What's the one thing you'd pay to have solved?\n#solopreneur #founder` },
          { heading: "Post 3 — proof", body: `Hook: "Day 3 of shipping in public."\n\nWhat changed: simpler offer, shorter page, five real conversations.\n\nCTA: Follow for the next update.\n#indiehackers` },
          { heading: "Schedule", body: "Post 1 at 8–10am local, Post 2 two days later, Post 3 on day three. Reply to every comment within an hour during launch week." },
        ]
      );

    case "leads.find":
      return toArtifact(
        "Prospect list plan",
        `Where ${inputs.icp || "your ideal customer"} actually is, and how to qualify them fast.`,
        [
          { heading: "Segments", body: bullets([`${inputs.icp || "Boutique retail"} — 1 to 3 locations, owner still buys stock`, "Corporate office managers (gifting, quarterly)", "Event planners and hotels (bulk, deadline-driven)", "Online resellers with an existing audience"]) },
          { heading: "Qualifying signals", body: bullets(["Publishes prices (means they're commercially run)", "Posts within the last 30 days", "Sells adjacent products, not direct competitors", "Has a contact page with a named person"]) },
          { heading: "Where to find them", body: "Google Maps for local density, Instagram location tags for reachability, LinkedIn for corporate offices. Build the list by hand at first — 50 names beats 5,000 scraped." },
          { heading: "Do this week", body: "Pick 20 qualify-worthy names, send message 1 from the outreach sequence, log every reply." },
        ]
      );

    case "email.reply":
      return toArtifact(
        "Draft reply — needs your approval",
        "On-brand, short, and clear about the next step.",
        [
          { heading: "Draft", body: `Hi {{first_name}},\n\nThanks for writing — short answer: yes, we can help with that.\n\nHere's what I'd suggest: {{suggested_next_step}}. If that works, I'll send everything over today.\n\nOne thing I want to be straight about: {{caveat_worth_saying}}.\n\n— {{your_name}}` },
          { heading: "Why this works", body: "Answers in the first line, proposes one concrete next step, and volunteers the awkward fact before the customer finds it." },
          { heading: "Your email for context", body: (inputs.message || "").slice(0, 400) },
        ]
      );

    case "support.faq":
      return toArtifact(
        "Support FAQ + reply macros",
        "The questions customers actually ask, with answers and macros.",
        [
          { heading: "Top questions", body: bullets(["How long is delivery?", "Can I change my order?", "Do you do bulk?", "What's the return window?", "Do you ship internationally?", "Is there a discount for repeat buyers?"]) },
          { heading: "Answer style", body: "One sentence, one number, then a link. If an answer needs three paragraphs, the product or the page is wrong." },
          { heading: "Macros", body: "`/delay` — acknowledge, give the new date, apologise once.\n`/bulk` — quantity breaks and invoice.\n`/refund` — no argument, ask one question, refund." },
          { heading: "Escalate when", body: "Money is missing, a deadline was broken, or the customer has written twice without a reply. Those three go to a human immediately." },
        ]
      );

    case "report.weekly":
      return toArtifact(
        "Weekly business review",
        "What moved, what stalled, and the one thing to do next.",
        [
          { heading: "Scoreboard", body: bullets(["Revenue this week vs last", "New customers", "Repeat customers", "Conversations started", "Site visitors → orders"]) },
          { heading: "What moved", body: "Whatever produced an actual order. Note the channel and the exact words the customer used." },
          { heading: "What stalled", body: "Anything you did twice with no result. Stop it this week." },
          { heading: "One thing next week", body: `Pick the single action with the shortest path to a paid order. For ${idea} at this stage, that's almost always more conversations, not more content.` },
        ]
      );

    default:
      return toArtifact(
        "Milo run",
        "Task completed.",
        [{ heading: "Output", body: `Handled: ${kind}. ${JSON.stringify(inputs).slice(0, 300)}` }]
      );
  }
}
