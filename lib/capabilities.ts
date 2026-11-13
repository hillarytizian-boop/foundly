// Foundly capability catalog — derived from the Foundable/Ted capability inventory.
// Every task Milo runs is one of these definitions: what it costs, whether it needs
// human approval before it "ships", and what it produces.

export type Env = "home" | "build" | "run";

export type Capability = {
  kind: string;
  title: string;
  env: Env;
  category: string;
  credits: number;
  approval: boolean; // true = human must approve before it leaves Foundly
  blurb: string;
  inputs: { key: string; label: string; placeholder?: string; required?: boolean }[];
};

export const CAPABILITIES: Capability[] = [
  // ---------- HOME: discover + plan ----------
  {
    kind: "idea.generate", title: "Generate business ideas", env: "home", category: "Ideas",
    credits: 1, approval: false, blurb: "Five concrete ideas for a niche, each with a customer and a price.",
    inputs: [
      { key: "niche", label: "Niche or skill", placeholder: "handmade candles in Nairobi", required: true },
      { key: "budget", label: "Starting budget", placeholder: "$0–$500" },
    ],
  },
  {
    kind: "idea.validate", title: "Validate an idea", env: "home", category: "Ideas",
    credits: 2, approval: false, blurb: "Score the idea, name the riskiest assumption, and the cheapest test.",
    inputs: [{ key: "idea", label: "Your idea", placeholder: "one sentence", required: true }],
  },
  {
    kind: "research.market", title: "Market research brief", env: "home", category: "Research",
    credits: 3, approval: false, blurb: "Demand signals, trends, channels and a recommendation.",
    inputs: [
      { key: "idea", label: "Business", required: true },
      { key: "country", label: "Market / country", placeholder: "Kenya" },
    ],
  },
  {
    kind: "research.competitors", title: "Competitor teardown", env: "home", category: "Research",
    credits: 3, approval: false, blurb: "3–5 competitors, their positioning, pricing, and your wedge.",
    inputs: [{ key: "idea", label: "Business", required: true }],
  },
  {
    kind: "plan.business", title: "Business plan", env: "home", category: "Planning",
    credits: 4, approval: false, blurb: "Model, pricing, costs, first 30 days, and milestones.",
    inputs: [
      { key: "idea", label: "Business", required: true },
      { key: "price", label: "Price point", placeholder: "$15 per unit" },
    ],
  },
  {
    kind: "plan.pitch", title: "Pitch / investor deck outline", env: "home", category: "Planning",
    credits: 3, approval: false, blurb: "Slide-by-slide narrative with the numbers that matter.",
    inputs: [{ key: "idea", label: "Business", required: true }],
  },

  // ---------- BUILD: create ----------
  {
    kind: "site.generate", title: "Build website", env: "build", category: "Website",
    credits: 3, approval: false, blurb: "Full page: hero, sections, pricing, FAQ, CTA.",
    inputs: [
      { key: "idea", label: "What the business does", required: true },
      { key: "businessName", label: "Business name" },
    ],
  },
  {
    kind: "site.update", title: "Update website copy", env: "build", category: "Website",
    credits: 1, approval: true, blurb: "Rewrite a section of the live site. Requires your approval.",
    inputs: [
      { key: "siteId", label: "Site to edit", required: true },
      { key: "instruction", label: "What to change", placeholder: "make the hero shorter", required: true },
    ],
  },
  {
    kind: "brand.name", title: "Name + tagline", env: "build", category: "Brand",
    credits: 2, approval: false, blurb: "Five name options, taglines, and a domain-readiness note.",
    inputs: [{ key: "idea", label: "Business", required: true }, { key: "vibe", label: "Vibe", placeholder: "premium, playful, bold" }],
  },
  {
    kind: "brand.logo", title: "Logo direction + palette", env: "build", category: "Brand",
    credits: 2, approval: false, blurb: "Logo concept, colours with hex codes, and typography pair.",
    inputs: [{ key: "businessName", label: "Business name", required: true }, { key: "vibe", label: "Vibe" }],
  },
  {
    kind: "doc.catalogue", title: "Product catalogue + price list", env: "build", category: "Documents",
    credits: 2, approval: false, blurb: "Products, descriptions, prices, and margin notes.",
    inputs: [{ key: "idea", label: "What you sell", required: true }],
  },

  // ---------- RUN: market + acquire + operate ----------
  {
    kind: "outreach.draft", title: "Outreach sequence", env: "run", category: "Acquire",
    credits: 2, approval: true, blurb: "3-message sequence you approve before anything is sent.",
    inputs: [
      { key: "idea", label: "Business", required: true },
      { key: "audience", label: "Who you're writing to", placeholder: "local gift shops" },
    ],
  },
  {
    kind: "social.draft", title: "Launch week posts", env: "run", category: "Market",
    credits: 2, approval: true, blurb: "3 posts with hooks, captions and hashtags.",
    inputs: [{ key: "idea", label: "Business", required: true }, { key: "platform", label: "Platform", placeholder: "Instagram" }],
  },
  {
    kind: "leads.find", title: "Build prospect list", env: "run", category: "Acquire",
    credits: 3, approval: false, blurb: "Target segments, qualifying signals, and where to find them.",
    inputs: [
      { key: "idea", label: "Business", required: true },
      { key: "icp", label: "Ideal customer", placeholder: "boutique gift shops with 1-3 locations" },
    ],
  },
  {
    kind: "email.reply", title: "Draft email / reply", env: "run", category: "Communicate",
    credits: 1, approval: true, blurb: "On-brand reply ready for your review.",
    inputs: [{ key: "message", label: "The email you received", required: true }],
  },
  {
    kind: "support.faq", title: "Support FAQ + macros", env: "run", category: "Support",
    credits: 2, approval: false, blurb: "The 12 questions customers actually ask, with answers.",
    inputs: [{ key: "idea", label: "Business", required: true }],
  },
  {
    kind: "report.weekly", title: "Weekly business review", env: "run", category: "Monitor",
    credits: 1, approval: false, blurb: "What moved, what stalled, and the one thing to do next.",
    inputs: [{ key: "idea", label: "Business", required: true }],
  },
];

export const getCapability = (kind: string) => CAPABILITIES.find((c) => c.kind === kind);

export const PLAN_CREDITS: Record<string, number> = { free: 15, basic: 200, pro: 500, max: 2500 };

export const INTEGRATIONS = [
  { slug: "gmail", name: "Gmail", category: "Email" },
  { slug: "google-calendar", name: "Google Calendar", category: "Scheduling" },
  { slug: "google-drive", name: "Google Drive", category: "Files" },
  { slug: "google-docs", name: "Google Docs", category: "Documents" },
  { slug: "google-sheets", name: "Google Sheets", category: "Spreadsheets" },
  { slug: "outlook", name: "Outlook", category: "Email" },
  { slug: "excel", name: "Microsoft Excel", category: "Spreadsheets" },
  { slug: "onedrive", name: "OneDrive", category: "Files" },
  { slug: "dropbox", name: "Dropbox", category: "Files" },
  { slug: "notion", name: "Notion", category: "Knowledge" },
  { slug: "airtable", name: "Airtable", category: "Database" },
  { slug: "slack", name: "Slack", category: "Team" },
  { slug: "teams", name: "Microsoft Teams", category: "Team" },
  { slug: "hubspot", name: "HubSpot", category: "CRM" },
  { slug: "linear", name: "Linear", category: "Projects" },
  { slug: "calendly", name: "Calendly", category: "Scheduling" },
  { slug: "mailchimp", name: "Mailchimp", category: "Email marketing" },
  { slug: "canva", name: "Canva", category: "Design" },
  { slug: "google-analytics", name: "Google Analytics", category: "Analytics" },
  { slug: "search-console", name: "Google Search Console", category: "Analytics" },
  { slug: "quickbooks", name: "QuickBooks", category: "Accounting" },
  { slug: "fathom", name: "Fathom", category: "Meetings" },
  { slug: "granola", name: "Granola", category: "Meetings" },
  { slug: "instagram", name: "Instagram", category: "Social" },
  { slug: "facebook", name: "Facebook", category: "Social" },
  { slug: "x", name: "X", category: "Social" },
  { slug: "linkedin", name: "LinkedIn", category: "Social" },
  { slug: "tiktok", name: "TikTok", category: "Social" },
  { slug: "youtube", name: "YouTube", category: "Video" },
  { slug: "google-business", name: "Google Business", category: "Presence" },
  { slug: "whatsapp", name: "WhatsApp", category: "Messaging" },
  { slug: "meta-ads", name: "Meta Ads", category: "Advertising" },
  { slug: "tiktok-ads", name: "TikTok Ads", category: "Advertising" },
  { slug: "linkedin-ads", name: "LinkedIn Ads", category: "Advertising" },
  { slug: "stripe", name: "Stripe", category: "Payments" },
  { slug: "github", name: "GitHub", category: "Code" },
  { slug: "vercel", name: "Vercel", category: "Hosting" },
];
