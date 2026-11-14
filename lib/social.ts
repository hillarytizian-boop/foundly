// Real posting. Each publisher calls the provider's API with the stored token
// and returns the external id/url. If a provider isn't connected or the API
// rejects us, we return the real error — we never claim a post went out.

export type PostResult = { ok: boolean; externalId?: string; url?: string; error?: string };

async function postX(token: string, body: string): Promise<PostResult> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ text: body.slice(0, 280) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.detail || json.title || `X returned ${res.status}` };
  const id = json.data?.id;
  return { ok: true, externalId: id, url: id ? `https://x.com/i/web/status/${id}` : undefined };
}

async function postLinkedIn(token: string, body: string): Promise<PostResult> {
  const me = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json()).catch(() => ({}));
  const author = me.sub ? `urn:li:person:${me.sub}` : null;
  if (!author) return { ok: false, error: "Could not resolve the LinkedIn profile for this token" };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: body.slice(0, 2900) },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.message || `LinkedIn returned ${res.status}` };
  return { ok: true, externalId: json.id, url: json.id ? `https://www.linkedin.com/feed/update/${json.id}` : undefined };
}

async function postFacebook(token: string, body: string, pageId?: string): Promise<PostResult> {
  if (!pageId) return { ok: false, error: "Facebook needs a Page ID. Add it to the connection settings." };
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: body, access_token: token }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) return { ok: false, error: json.error?.message || `Facebook returned ${res.status}` };
  return { ok: true, externalId: json.id, url: `https://facebook.com/${json.id}` };
}

async function postInstagram(token: string, body: string, igUserId?: string, imageUrl?: string): Promise<PostResult> {
  if (!igUserId) return { ok: false, error: "Instagram needs an IG Business account ID. Add it to the connection settings." };
  if (!imageUrl) return { ok: false, error: "Instagram requires an image URL — attach one before publishing." };

  const create = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption: body.slice(0, 2200), access_token: token }),
  }).then((r) => r.json()).catch(() => ({}));

  if (!create.id) return { ok: false, error: create.error?.message || "Instagram rejected the media container" };

  const publish = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ creation_id: create.id, access_token: token }),
  }).then((r) => r.json()).catch(() => ({}));

  if (!publish.id) return { ok: false, error: publish.error?.message || "Instagram rejected the publish step" };
  return { ok: true, externalId: publish.id, url: `https://www.instagram.com/p/${publish.id}` };
}

async function postSlack(token: string, body: string, channel?: string): Promise<PostResult> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ channel: channel || "#general", text: body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) return { ok: false, error: json.error || "Slack rejected the message" };
  return { ok: true, externalId: json.ts };
}

async function postGmail(token: string, body: string, to?: string): Promise<PostResult> {
  if (!to) return { ok: false, error: "Add a recipient before sending email." };
  const raw = [
    `To: ${to}`,
    "Subject: Foundly draft",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  const encoded = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error?.message || `Gmail returned ${res.status}` };
  return { ok: true, externalId: json.id };
}

export async function publishTo(
  slug: string,
  token: string,
  body: string,
  opts: { pageId?: string; igUserId?: string; imageUrl?: string; channel?: string; to?: string } = {}
): Promise<PostResult> {
  switch (slug) {
    case "x": return postX(token, body);
    case "linkedin": return postLinkedIn(token, body);
    case "facebook": return postFacebook(token, body, opts.pageId);
    case "instagram": return postInstagram(token, body, opts.igUserId, opts.imageUrl);
    case "slack": return postSlack(token, body, opts.channel);
    case "gmail": return postGmail(token, body, opts.to);
    case "tiktok":
      return { ok: false, error: "TikTok publishing requires a video upload flow — connect TikTok and attach a video to enable it." };
    case "youtube":
      return { ok: false, error: "YouTube publishing requires a video file upload — not yet enabled." };
    default:
      return { ok: false, error: `${slug} has no publishing support yet.` };
  }
}

// ---------------------------------------------------------------------------
// Account verification. Used when a token is pasted by hand, so a saved
// connection is only ever recorded after the provider itself confirms it.
// A rejected token returns the provider's real error — never a fake "connected".
// ---------------------------------------------------------------------------

export type VerifyResult = { ok: boolean; label?: string; error?: string };

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export async function verifyAccount(
  slug: string,
  token: string,
  extra: { pageId?: string; igUserId?: string; channel?: string; to?: string } = {}
): Promise<VerifyResult> {
  try {
    switch (slug) {
      case "x": {
        const { res, json } = await getJson("https://api.twitter.com/2/users/me", {
          authorization: `Bearer ${token}`,
        });
        if (!res.ok) {
          const raw = json.detail || json.title || `X rejected the token (${res.status})`;
          if (/Application-Only/i.test(String(raw)) || /app-only/i.test(String(raw))) {
            return {
              ok: false,
              error: "That is X's app-only Bearer token. Posting needs a user-context token: in your app's Keys and tokens tab, generate an Access Token + Secret with Read and Write permission and paste the access token instead.",
            };
          }
          return { ok: false, error: String(raw) };
        }
        return { ok: true, label: json.data?.username ? `@${json.data.username}` : "connected" };
      }

      case "linkedin": {
        const { res, json } = await getJson("https://api.linkedin.com/v2/userinfo", {
          authorization: `Bearer ${token}`,
        });
        if (!res.ok) return { ok: false, error: json.message || `LinkedIn rejected the token (${res.status})` };
        return { ok: true, label: json.name || json.email || "connected" };
      }

      case "facebook": {
        if (!extra.pageId) return { ok: false, error: "Add your Facebook Page ID so posts know where to go." };
        const { res, json } = await getJson(
          `https://graph.facebook.com/v21.0/${extra.pageId}?fields=name&access_token=${encodeURIComponent(token)}`
        );
        if (!res.ok || json.error) return { ok: false, error: json.error?.message || `Facebook rejected the token (${res.status})` };
        return { ok: true, label: json.name || "connected" };
      }

      case "instagram": {
        if (!extra.igUserId) return { ok: false, error: "Add your Instagram Business account ID." };
        const { res, json } = await getJson(
          `https://graph.facebook.com/v21.0/${extra.igUserId}?fields=username&access_token=${encodeURIComponent(token)}`
        );
        if (!res.ok || json.error) return { ok: false, error: json.error?.message || `Instagram rejected the token (${res.status})` };
        return { ok: true, label: json.username ? `@${json.username}` : "connected" };
      }

      case "tiktok": {
        const { res, json } = await getJson(
          "https://open.tiktokapis.com/v2/user/info/?fields=display_name",
          { authorization: `Bearer ${token}` }
        );
        if (!res.ok || (json.error && json.error.code !== "ok"))
          return { ok: false, error: json.error?.message || `TikTok rejected the token (${res.status})` };
        return { ok: true, label: json.data?.user?.display_name || "connected" };
      }

      case "slack": {
        const { json } = await getJson("https://slack.com/api/auth.test", { authorization: `Bearer ${token}` });
        if (!json.ok) return { ok: false, error: json.error || "Slack rejected the token" };
        return { ok: true, label: json.team ? `${json.user} @ ${json.team}` : json.user };
      }

      case "gmail": {
        const { res, json } = await getJson("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
          authorization: `Bearer ${token}`,
        });
        if (!res.ok) return { ok: false, error: json.error?.message || `Gmail rejected the token (${res.status})` };
        return { ok: true, label: json.emailAddress };
      }

      default:
        return { ok: false, error: `${slug} does not support pasted tokens yet.` };
    }
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach the provider" };
  }
}
