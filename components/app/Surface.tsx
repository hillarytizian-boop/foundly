"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppFrame from "@/components/app/AppFrame";

/**
 * The signed-in work surface.
 *
 * Build / Run / Documents used to render on the pale marketing sky, complete
 * with the marketing pill nav and footer, while Home, Autopilot and
 * Connections rendered as a near-black app. Signing in and tapping "Build"
 * therefore felt like landing on a second, different website.
 *
 * Every signed-in screen now renders inside the same dark chrome and the same
 * content column, so the product reads as one thing. Marketing pages keep
 * their own header/footer (see components/Chrome.tsx).
 */
export default function Surface({
  children,
  title,
  subtitle,
  credits,
  back = "/workspace",
  eyebrow,
  wide = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  credits?: number | null;
  back?: string;
  eyebrow?: string;
  wide?: boolean;
}) {
  const [balance, setBalance] = useState<number | null>(credits ?? null);

  useEffect(() => {
    if (credits !== undefined) { setBalance(credits ?? null); return; }
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("credits").eq("id", user.id).maybeSingle();
      if (typeof (data as any)?.credits === "number") setBalance((data as any).credits);
    })();
  }, [credits]);

  return (
    <AppFrame title={title} subtitle={subtitle} credits={balance} back={back} showBack>
      <div className="s-surface">
        <div className={`s-body${wide ? " s-body-wide" : ""}`}>
          {eyebrow && <span className="s-eyebrow">{eyebrow}</span>}
          {children}
        </div>
      </div>
    </AppFrame>
  );
}
