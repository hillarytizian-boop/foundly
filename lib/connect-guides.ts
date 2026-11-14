// What it actually takes to connect each social channel. Rendered on
// /workspace/integrations so the path is visible instead of implied.
// Costs and review requirements are the platforms' own, not ours.

export type SetupStep = { text: string; code?: string };

export type ConnectGuide = {
  slug: string;
  /** fastest honest route to a working connection */
  fastest: "pasted-token" | "oauth-app";
  /** how long the fastest route takes, roughly */
  eta: string;
  needs: string;
  steps: SetupStep[];
  /** env vars to add on the deployment for the OAuth route */
  envKeys: string[];
  callback: string;
  caveat?: string;
};

export const CONNECT_GUIDES: ConnectGuide[] = [
  {
    slug: "x",
    fastest: "pasted-token",
    eta: "about 3 minutes",
    needs: "An X developer app (free tier is enough to post).",
    steps: [
      { text: "Open the X developer portal and create a project + app on the free tier." },
      { text: "Set the app's User authentication settings to Read and Write, then in Keys and tokens generate an Access Token and Secret." },
      { text: "Paste the Access Token (not the Bearer Token — that one is app-only and cannot post)." },
      { text: "Paste that access token below. Foundly calls GET /2/users/me; it only saves the connection if X returns your handle." },
    ],
    envKeys: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
    callback: "/api/integrations/callback/x",
    caveat: "OAuth 2.0 user-context tokens last about 2 hours without offline.access. A pasted access token is the simplest route for a test post; add the client ID and secret if you want Foundly to refresh it for you.",
  },
  {
    slug: "linkedin",
    fastest: "pasted-token",
    eta: "5–10 minutes",
    needs: "A LinkedIn developer app with the Share on LinkedIn product requested.",
    steps: [
      { text: "Create an app at linkedin.com/developers and associate it with a Page you admin." },
      { text: "On the Products tab, request Share on LinkedIn (gives w_member_social) and wait for it to be granted." },
      { text: "Use the Auth tab's token generator, or run the OAuth flow, and paste the access token below. Foundly verifies it against /v2/userinfo." },
    ],
    envKeys: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    callback: "/api/integrations/callback/linkedin",
    caveat: "Access tokens last 60 days. Without the product approval, posting returns a real 403 from LinkedIn — Foundly shows you that error rather than pretending the post went out.",
  },
  {
    slug: "facebook",
    fastest: "oauth-app",
    eta: "15–30 minutes",
    needs: "A Meta developer app plus a Facebook Page you administer.",
    steps: [
      { text: "Create an app at developers.facebook.com (type: Business)." },
      { text: "Add the Facebook Login product, then paste the callback URL below into Valid OAuth Redirect URIs." },
      { text: "Request pages_show_list, pages_manage_posts and pages_read_engagement, then connect." },
      { text: "After connecting, add your Page ID below so posts know which Page to publish to." },
    ],
    envKeys: ["META_CLIENT_ID", "META_CLIENT_SECRET"],
    callback: "/api/integrations/callback/facebook",
    caveat: "While the app is in Development mode only accounts with a role on the app can post. Going Live needs App Review for pages_manage_posts.",
  },
  {
    slug: "instagram",
    fastest: "oauth-app",
    eta: "20–40 minutes",
    needs: "A Meta app, an Instagram Business account, and a linked Facebook Page.",
    steps: [
      { text: "Link your Instagram Business account to a Facebook Page (required by Meta — a personal account will not publish)." },
      { text: "In the Meta app, add the Instagram Graph API product and request instagram_basic and instagram_content_publish." },
      { text: "Paste the callback URL below into Valid OAuth Redirect URIs, then connect." },
      { text: "Add your IG Business account ID below. Every post also needs a public image URL — Instagram will not publish text-only." },
    ],
    envKeys: ["META_CLIENT_ID", "META_CLIENT_SECRET"],
    callback: "/api/integrations/callback/instagram",
    caveat: "Foundly refuses a text-only Instagram post with an explicit message instead of a silent failure, because the API requires image_url.",
  },
  {
    slug: "tiktok",
    fastest: "oauth-app",
    eta: "30+ minutes, with review",
    needs: "A TikTok developer app with the Content Posting API approved.",
    steps: [
      { text: "Create an app at developers.tiktok.com and add the Content Posting API product." },
      { text: "Request video.publish and user.info.basic, and submit the app for review." },
      { text: "Add the callback URL below, then connect once approved." },
    ],
    envKeys: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    callback: "/api/integrations/callback/tiktok",
    caveat: "Publishing needs a video upload flow. Until that ships, Foundly reports TikTok publishing as unsupported rather than queueing a post that will never appear.",
  },
];

export const guideFor = (slug: string) => CONNECT_GUIDES.find((g) => g.slug === slug);
