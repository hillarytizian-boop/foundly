import { NextResponse } from "next/server";
import { generateSocial } from "@/lib/milo";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { idea, platform } = await req.json();
    if (!idea?.trim()) return NextResponse.json({ error: "idea required" }, { status: 400 });
    const draft = generateSocial(idea, platform);

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("social_posts").insert({
          user_id: user.id,
          platform: (platform || "instagram").toLowerCase(),
          caption: draft,
          status: "draft",
        });
      }
    } catch {}

    return NextResponse.json({ draft });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Social generation failed" }, { status: 500 });
  }
}
