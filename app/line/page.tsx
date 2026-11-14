"use client";
import { useEffect, useState } from "react";
import AppFrame from "@/components/app/AppFrame";
import ChatShell, { type ChatMsg, useMiloHistory } from "@/components/app/ChatShell";
import { GlowCloud } from "@/components/marketing/Mascot";
import { createClient } from "@/lib/supabase/client";

/** The full Milo chat — the same dark surface, with nothing else on screen. */
export default function LinePage() {
  const history = useMiloHistory();
  const [credits, setCredits] = useState<number | null>(null);
  const [business, setBusiness] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles").select("credits,business_name").eq("id", user.id).maybeSingle();
      setCredits((data as any)?.credits ?? null);
      setBusiness((data as any)?.business_name ?? null);
    })();
  }, []);

  return (
    <AppFrame title={business || "Milo"} subtitle="Your AI employee" credits={credits} back="/workspace" showBack>
      {history === null ? (
        <div className="a-screen"><div className="a-splash"><GlowCloud className="a-cloud" /></div></div>
      ) : (
        <ChatShell business={business} initial={history as ChatMsg[]} />
      )}
    </AppFrame>
  );
}
