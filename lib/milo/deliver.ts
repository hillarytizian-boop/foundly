// Delivery: turn a queued outbound item into something that actually left.
//
// This is the only place a queued item becomes "sent". It reuses the exact same
// publisher the manual Publish button uses (`publishTo`), so an auto-sent post
// and a hand-sent post are indistinguishable in the publication log — if the
// provider rejects one, it rejects both with the same words, surfaced verbatim.

import { adminClient, getToken } from "@/lib/tokens";
import { publishTo } from "@/lib/social";
import type { QueueItem } from "@/lib/milo/outbound";

export type DeliverResult = { ok: boolean; url?: string; externalId?: string; error?: string };

/** Which queue `kind`s map to which provider behaviours. */
function publishArgs(item: QueueItem) {
  switch (item.kind) {
    case "social_post":
      return { body: item.body ?? "", extra: {} };
    case "outreach_email":
      return { body: item.body ?? "", extra: { to: "" } };
    case "reply":
      return { body: item.body ?? "", extra: { to: "" } };
    default:
      return { body: item.body ?? "", extra: {} };
  }
}

export async function deliver(item: QueueItem): Promise<DeliverResult> {
  const admin = adminClient();

  const tokenRow = await getToken(item.user_id, item.channel);
  if (!tokenRow?.access_token) {
    return {
      ok: false,
      error: `${item.channel} is not connected for this account any more, so nothing was sent. Reconnect it in Connections.`,
    };
  }

  const { body, extra } = publishArgs(item);
  if (!body.trim()) return { ok: false, error: "There was nothing to send." };

  const result = await publishTo(item.channel, tokenRow.access_token, body, extra as any);

  // Log it the same way a manual publish is logged, so there is one history.
  await admin.from("social_publications").insert({
    user_id: item.user_id,
    slug: item.channel,
    body,
    status: result.ok ? "sent" : "failed",
    external_id: result.externalId ?? null,
    external_url: result.url ?? null,
    error: result.error ?? null,
  });

  await admin.from("activity").insert({
    user_id: item.user_id,
    message: result.ok
      ? `Milo sent "${item.title ?? item.kind}" to ${item.channel}`
      : `Send to ${item.channel} failed: ${result.error}`,
  });

  return { ok: result.ok, url: result.url, externalId: result.externalId, error: result.error };
}
