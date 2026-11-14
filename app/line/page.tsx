"use client";
import { useEffect, useState } from "react";
import AppFrame from "@/components/app/AppFrame";
import ChatShell, { type ChatMsg, useMiloHistory } from "@/components/app/ChatShell";
import { createClient } from "@/lib/supabase/client";

/** The full Milo chat, like opening a conversation with your AI employee. */
export default function LinePage() {
  const history = useMiloHistory();
  const [me, setMe] = useState<{ credits: number; business_name: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles").select("credits,business_name").eq("id", user.id).maybeSingle();
      setMe(data as any);
    })();
  }, []);

  return (
    <AppFrame
      title="Milo"
      subtitle="Your AI employee · replies in about a minute"
      credits={me ? me.credits : null}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {history === null ? (
          <div className="cs"><div className="cs-scroll"><p className="small muted">Loading your thread…</p></div></div>
        ) : (
          <ChatShell business={me?.business_name ?? null} initial={history as ChatMsg[]} />
        )}
      </div>
    </AppFrame>
  );
}
