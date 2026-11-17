"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The thing that makes autonomy real on this plan.
 *
 * Vercel's Hobby plan runs cron at most once a day, in an hour-wide window — so
 * a "keeps working while you sleep" product would spend most of its life asleep.
 * This fires the same tick whenever the owner opens the app. If a goal is due,
 * Milo does the cycle right now and the banner reports what it did. Opening the
 * app is the one moment the work is guaranteed to be seen, so it is also the
 * right moment to catch up.
 *
 * It is deliberately quiet: nothing runs unless a goal is actually due, so
 * refreshing the page ten times does not mean ten cycles. The server claims the
 * goal before planning, so two tabs cannot both run it either.
 */
export default function Pulse({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "checking" | "done">("idle");
  const [summary, setSummary] = useState("");
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || fired.current) return;
    fired.current = true;

    (async () => {
      setPhase("checking");
      try {
        const res = await fetch("/api/milo/autonomy/tick", { method: "GET" });
        if (!res.ok) { setPhase("idle"); return; }
        const j = await res.json();
        if (!j.ran) { setPhase("idle"); return; }
        setSummary(j.summary || j.headline || "");
        setPhase("done");
        // New tasks, documents and approvals landed — refresh the page data.
        router.refresh();
        setTimeout(() => setPhase("idle"), 12000);
      } catch {
        setPhase("idle");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (phase === "idle") return null;

  return (
    <div className="a-pulse">
      <span className={`a-pulse-dot ${phase === "done" ? "ok" : "run"}`} />
      <span className="a-pulse-text">
        {phase === "checking"
          ? "Milo is checking what needs doing…"
          : <><b>Milo worked while you were away.</b> {summary}</>}
      </span>
      {phase === "done" && <a className="a-pulse-link" href="/workspace/autopilot">See what it did</a>}
    </div>
  );
}
