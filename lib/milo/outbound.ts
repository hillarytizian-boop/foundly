// The outbound queue — the one place work that LEAVES Foundly passes through.
//
// Why a queue and not "just send it": the user asked for full auto, and full
// auto means a bug at 3am can post forty things before anyone wakes up. So
// autonomy never sends directly. It ENQUEUES, and one of two things releases it:
//
//   approval mode (default)  — the item sits at `held` until the owner clicks
//                              Approve in Run. Release is immediate.
//   auto_send on             — the item sits `held` with a `release_at` in the
//                              future, and the autonomy tick releases it once
//                              the cool-down has passed AND the daily cap is not
//                              spent.
//
// The cool-down is the safety property: it is a window in which the owner can
// see the item in the feed and cancel it, which is what makes a "sent" item
// something they had a real chance to stop. Nothing here trusts the toggle
// alone; the cap and the cool-down are enforced in code, in this file.

import { adminClient } from "@/lib/tokens";

/** How long an auto item waits before it can be released. */
export const AUTO_COOL_DOWN_MINUTES = 15;
/** Hard ceiling on auto-sends per account per day, regardless of settings. */
export const DAILY_SEND_CAP = 10;

export type QueueItem = {
  id: string;
  user_id: string;
  task_id: string | null;
  channel: string;
  kind: string;
  title: string | null;
  body: string | null;
  status: "held" | "releasing" | "sent" | "failed" | "cancelled" | "skipped";
  auto: boolean;
  release_at: string | null;
  created_at: string;
};

/**
 * Never auto-release something that touches money or is legally binding.
 * This is a fixed denylist, not a model judgement: the model deciding whether
 * the model's own output is safe is not a control.
 */
const NEVER_AUTO = [
  /\brefund\b/i, /\bcharge\b/i, /\binvoice\b/i, /\bpayment\b/i, /\bpricing change\b/i,
  /\blegal\b/i, /\bcontract\b/i, /\bsue\b/i, /\bterms of service\b/i, /\bguarantee\b/i,
];

export function isAutoSafe(item: Pick<QueueItem, "kind" | "body" | "title">): boolean {
  const text = `${item.title ?? ""} ${item.body ?? ""}`;
  return !NEVER_AUTO.some((re) => re.test(text));
}

export type EnqueueInput = {
  userId: string;
  taskId?: string | null;
  channel: string;
  kind: string;
  title: string;
  body: string;
  auto: boolean;
  /** true when the account has auto_send on for this channel */
  autoSend: boolean;
};

/**
 * Put an outbound artifact in the queue.
 *
 * Returns the row plus a plain-language note the UI can show, so the promise
 * ("it went out", "it is waiting", "it will go out at 14:05") is never guessed.
 */
export async function enqueue(input: EnqueueInput): Promise<{ item: QueueItem | null; note: string; error?: string }> {
  const admin = adminClient();

  const autoSafe = isAutoSafe({ kind: input.kind, title: input.title, body: input.body });
  const willAuto = input.autoSend && autoSafe;

  const releaseAt = willAuto
    ? new Date(Date.now() + AUTO_COOL_DOWN_MINUTES * 60_000).toISOString()
    : null;

  const { data, error } = await admin
    .from("outbound_queue")
    .insert({
      user_id: input.userId,
      task_id: input.taskId ?? null,
      channel: input.channel,
      kind: input.kind,
      title: input.title.slice(0, 200),
      body: input.body.slice(0, 8000),
      status: "held",
      auto: willAuto,
      release_at: releaseAt,
    })
    .select()
    .single();

  if (error || !data) {
    return { item: null, note: "Could not queue it — nothing was sent.", error: error?.message };
  }

  const note = willAuto
    ? `Queued on ${input.channel}. Auto-send is on, so it goes out at ${new Date(releaseAt!).toLocaleTimeString()} unless you cancel it.`
    : autoSafe
      ? `Waiting for your OK on ${input.channel}. Nothing has been sent.`
      : `Waiting for your OK on ${input.channel}. This one touches money or terms, so it is never auto-sent.`;

  return { item: data as QueueItem, note };
}

/** How many auto-sends this account has actually made today. */
export async function sentToday(userId: string): Promise<number> {
  const admin = adminClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("outbound_queue")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("auto", true)
    .eq("status", "sent")
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

/**
 * Attempts today, successful or not.
 *
 * The daily cap counts attempts, not just successes. If a channel is broken and
 * every send fails, a successes-only counter would let the queue retry the same
 * dead channel all day; counting attempts means a broken integration burns its
 * budget and stops, once, visibly.
 */
export async function attemptsToday(userId: string): Promise<number> {
  const admin = adminClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("outbound_queue")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("auto", true)
    .in("status", ["sent", "failed", "releasing"])
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

/** Items that are due to be released by auto_send right now. */
export async function dueItems(limit = 20): Promise<QueueItem[]> {
  const admin = adminClient();
  const { data } = await admin
    .from("outbound_queue")
    .select("*")
    .eq("status", "held")
    .eq("auto", true)
    .not("release_at", "is", null)
    .lte("release_at", new Date().toISOString())
    .order("release_at", { ascending: true })
    .limit(limit);
  return (data as QueueItem[]) ?? [];
}

/**
 * Claim a due item for release.
 *
 * The claim is a conditional UPDATE: only one runner can move a row from `held`
 * to `releasing`, so two ticks firing at once cannot double-send. If the update
 * comes back empty, someone else has it and we move on.
 */
export async function claim(itemId: string): Promise<QueueItem | null> {
  const admin = adminClient();
  const { data } = await admin
    .from("outbound_queue")
    .update({ status: "releasing" })
    .eq("id", itemId)
    .eq("status", "held")
    .select()
    .maybeSingle();
  return (data as QueueItem) ?? null;
}

export async function finish(
  itemId: string,
  status: "sent" | "failed" | "skipped",
  error?: string
): Promise<void> {
  const admin = adminClient();
  await admin
    .from("outbound_queue")
    .update({
      status,
      error: error?.slice(0, 500) ?? null,
      released_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", itemId);
}

/** The owner approves or cancels a held item from the UI. */
export async function decide(itemId: string, userId: string, action: "approve" | "cancel"): Promise<{ ok: boolean; error?: string }> {
  const admin = adminClient();
  const { data } = await admin
    .from("outbound_queue")
    .select("id,user_id,status")
    .eq("id", itemId)
    .maybeSingle();
  if (!data || (data as any).user_id !== userId) return { ok: false, error: "Not found" };
  if ((data as any).status !== "held") return { ok: false, error: "This one has already moved." };

  if (action === "cancel") {
    await admin.from("outbound_queue").update({ status: "cancelled" }).eq("id", itemId);
    return { ok: true };
  }

  // Approving releases immediately: pull release_at forward and let the
  // releaser pick it up on the next tick (it is due now).
  await admin
    .from("outbound_queue")
    .update({ release_at: new Date().toISOString(), auto: true })
    .eq("id", itemId);
  return { ok: true };
}

export type ReleaseOutcome = {
  released: number;
  attempted: number;
  skipped: number;
  note?: string;
  results: { id: string; status: "sent" | "failed" | "skipped"; error?: string }[];
};

/**
 * The one releaser. Used by the cron tick and by the in-app call, so there is a
 * single path a queued item can travel — and a single place the rules live.
 *
 * Order of checks, all of them before anything leaves:
 *   1. is auto_send on at all?
 *   2. is the cap already spent (attempts, not successes)?
 *   3. is this item still safe to auto-send (money/terms are never auto-sent —
 *      re-checked HERE, not just when it was queued, because a row can be
 *      written by another path or edited after the fact)
 *   4. can we claim it exclusively?
 *
 * Deliver is injected so this module does not import the publisher (which would
 * drag the provider SDKs into the cron bundle needlessly).
 */
export async function releaseFor(
  userId: string,
  deliver: (item: QueueItem) => Promise<{ ok: boolean; error?: string }>,
  opts: { cap: number; autoSend: boolean }
): Promise<ReleaseOutcome> {
  const out: ReleaseOutcome = { released: 0, attempted: 0, skipped: 0, results: [] };
  if (!opts.autoSend) return { ...out, note: "Auto-send is off, so nothing was released." };

  const cap = Math.min(opts.cap, DAILY_SEND_CAP);
  let used = await attemptsToday(userId);
  if (used >= cap) return { ...out, note: `Daily cap already used (${used}/${cap}).` };

  const mine = (await dueItems(50)).filter((i) => i.user_id === userId);

  for (const item of mine) {
    if (used >= cap) break;

    // Re-check safety at the moment of sending. This is the guard that stops a
    // refund notice or a price change leaving without a human, whatever the
    // queue says.
    if (!isAutoSafe(item)) {
      await finish(item.id, "skipped", "Needs your OK — this one touches money or terms, so it is never auto-sent.");
      out.skipped += 1;
      out.results.push({ id: item.id, status: "skipped", error: "touches money or terms" });
      continue;
    }

    const claimed = await claim(item.id);
    if (!claimed) continue;

    const r = await deliver(claimed);
    await finish(item.id, r.ok ? "sent" : "failed", r.error);
    used += 1;
    out.attempted += 1;
    if (r.ok) out.released += 1;
    out.results.push({ id: item.id, status: r.ok ? "sent" : "failed", error: r.error });
  }

  out.note = `${out.released} sent, ${out.attempted - out.released} failed, ${out.skipped} left for you (${used}/${cap} of today's cap).`;
  return out;
}
