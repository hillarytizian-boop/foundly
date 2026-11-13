// Real integration plumbing. Each provider gets an OAuth authorize URL and a
// token exchange. A provider with no env credentials reports itself as not
// configured instead of pretending to connect.

export type Provider = {
  slug: string;
  name: string;
  category: string;
  scopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
  /** true when the provider uses PKCE instead of a client secret */
  pkce?: boolean;
  extraAuth?: Record<string, string>;
  /** does this provider support posting content from Foundly? */
  canPost?: "text" | "media";
  envKeys: { id: string; secret: string };
  docs: string;
};

export const PROVIDERS: Provider[] = [
  {
    slug: "x", name: "X", category: "Social", canPost: "text",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    pkce: true,
    envKeys: { id: "X_CLIENT_ID", secret: "X_CLIENT_SECRET" },
    docs: "https://developer.x.com/en/portal/dashboard",
  },
  {
    slug: "linkedin", name: "LinkedIn", category: "Social", canPost: "text",
    scopes: ["openid", "profile", "w_member_social"],
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    envKeys: { id: "LINKEDIN_CLIENT_ID", secret: "LINKEDIN_CLIENT_SECRET" },
    docs: "https://www.linkedin.com/developers/apps",
  },
  {
    slug: "facebook", name: "Facebook Page", category: "Social", canPost: "text",
    scopes: ["pages_show_list", "pages_manage_posts", "pages_read_engagement"],
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    envKeys: { id: "META_CLIENT_ID", secret: "META_CLIENT_SECRET" },
    docs: "https://developers.facebook.com/apps",
  },
  {
    slug: "instagram", name: "Instagram", category: "Social", canPost: "media",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    envKeys: { id: "META_CLIENT_ID", secret: "META_CLIENT_SECRET" },
    docs: "https://developers.facebook.com/docs/instagram-api",
  },
  {
    slug: "tiktok", name: "TikTok", category: "Social", canPost: "media",
    scopes: ["user.info.basic", "video.publish"],
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    envKeys: { id: "TIKTOK_CLIENT_KEY", secret: "TIKTOK_CLIENT_SECRET" },
    docs: "https://developers.tiktok.com/apps",
  },
  {
    slug: "youtube", name: "YouTube", category: "Video", canPost: "media",
    scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    extraAuth: { access_type: "offline", prompt: "consent" },
    envKeys: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
    docs: "https://console.cloud.google.com/apis/credentials",
  },
  {
    slug: "gmail", name: "Gmail", category: "Email", canPost: "text",
    scopes: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly", "openid", "email"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    extraAuth: { access_type: "offline", prompt: "consent" },
    envKeys: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
    docs: "https://console.cloud.google.com/apis/credentials",
  },
  {
    slug: "google-calendar", name: "Google Calendar", category: "Scheduling",
    scopes: ["https://www.googleapis.com/auth/calendar", "openid", "email"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    extraAuth: { access_type: "offline", prompt: "consent" },
    envKeys: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
    docs: "https://console.cloud.google.com/apis/credentials",
  },
  {
    slug: "google-sheets", name: "Google Sheets", category: "Spreadsheets",
    scopes: ["https://www.googleapis.com/auth/spreadsheets", "openid", "email"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    extraAuth: { access_type: "offline", prompt: "consent" },
    envKeys: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
    docs: "https://console.cloud.google.com/apis/credentials",
  },
  {
    slug: "google-drive", name: "Google Drive", category: "Files",
    scopes: ["https://www.googleapis.com/auth/drive.file", "openid", "email"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    extraAuth: { access_type: "offline", prompt: "consent" },
    envKeys: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
    docs: "https://console.cloud.google.com/apis/credentials",
  },
  {
    slug: "slack", name: "Slack", category: "Team",
    scopes: ["chat:write", "channels:read", "users:read"],
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    envKeys: { id: "SLACK_CLIENT_ID", secret: "SLACK_CLIENT_SECRET" },
    docs: "https://api.slack.com/apps",
  },
  {
    slug: "notion", name: "Notion", category: "Knowledge",
    scopes: ["read_content", "insert_content"],
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    extraAuth: { owner: "user", response_type: "code" },
    envKeys: { id: "NOTION_CLIENT_ID", secret: "NOTION_CLIENT_SECRET" },
    docs: "https://www.notion.so/my-integrations",
  },
  {
    slug: "hubspot", name: "HubSpot", category: "CRM",
    scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
    authorizeUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    envKeys: { id: "HUBSPOT_CLIENT_ID", secret: "HUBSPOT_CLIENT_SECRET" },
    docs: "https://developers.hubspot.com",
  },
  {
    slug: "airtable", name: "Airtable", category: "Database",
    scopes: ["data.records:read", "data.records:write"],
    authorizeUrl: "https://airtable.com/oauth2/v1/authorize",
    tokenUrl: "https://airtable.com/oauth2/v1/token",
    pkce: true,
    envKeys: { id: "AIRTABLE_CLIENT_ID", secret: "AIRTABLE_CLIENT_SECRET" },
    docs: "https://airtable.com/create/oauth",
  },
  {
    slug: "mailchimp", name: "Mailchimp", category: "Email marketing",
    scopes: ["campaigns:read"],
    authorizeUrl: "https://login.mailchimp.com/oauth2/authorize",
    tokenUrl: "https://login.mailchimp.com/oauth2/token",
    envKeys: { id: "MAILCHIMP_CLIENT_ID", secret: "MAILCHIMP_CLIENT_SECRET" },
    docs: "https://admin.mailchimp.com/account/oauth2/",
  },
  {
    slug: "dropbox", name: "Dropbox", category: "Files",
    scopes: ["files.content.write", "files.metadata.read"],
    authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    extraAuth: { token_access_type: "offline" },
    envKeys: { id: "DROPBOX_CLIENT_ID", secret: "DROPBOX_CLIENT_SECRET" },
    docs: "https://www.dropbox.com/developers/apps",
  },
  {
    slug: "github", name: "GitHub", category: "Code",
    scopes: ["repo", "read:user"],
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    envKeys: { id: "GITHUB_CLIENT_ID", secret: "GITHUB_CLIENT_SECRET" },
    docs: "https://github.com/settings/developers",
  },
  {
    slug: "vercel", name: "Vercel", category: "Hosting",
    scopes: [],
    authorizeUrl: "",
    tokenUrl: "",
    envKeys: { id: "", secret: "" },
    docs: "https://vercel.com/account/tokens",
  },
  {
    slug: "stripe", name: "Stripe", category: "Payments",
    scopes: ["read_write"],
    authorizeUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    envKeys: { id: "STRIPE_CONNECT_CLIENT_ID", secret: "STRIPE_SECRET_KEY" },
    docs: "https://dashboard.stripe.com/settings/connect",
  },
];

export const getProvider = (slug: string) => PROVIDERS.find((p) => p.slug === slug);

export function isConfigured(p: Provider): boolean {
  if (!p.authorizeUrl || !p.envKeys.id) return false;
  return Boolean(process.env[p.envKeys.id]);
}

export const POSTABLE = PROVIDERS.filter((p) => p.canPost).map((p) => p.slug);

export function redirectUri(origin: string, slug: string) {
  return `${origin}/api/integrations/callback/${slug}`;
}

export function buildAuthorizeUrl(p: Provider, origin: string, state: string, verifier?: string) {
  const clientId = process.env[p.envKeys.id];
  if (!clientId) throw new Error(`${p.name} is not configured on this deployment`);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(origin, p.slug),
    response_type: "code",
    scope: p.scopes.join(" "),
    state,
    ...(p.extraAuth ?? {}),
  });
  if (p.pkce && verifier) {
    params.set("code_challenge", verifier);
    params.set("code_challenge_method", "S256");
  }
  if (p.slug === "tiktok") params.set("client_key", clientId);
  return `${p.authorizeUrl}?${params.toString()}`;
}
