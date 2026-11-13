import { NextResponse } from "next/server";
import { generateOutreach } from "@/lib/milo";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { idea, audience } = await req.json();
    if (!idea?.trim()) return NextResponse.json({ error: "idea required" }, { status: 400 });
    const draft = generateOutreach(idea, audience);

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("outreach_campaigns").insert({
          user_id: user.id,
          audience: audience || "local shops and potential customers",
          draft,
          status: "draft",
        });
      }
    } catch {}

    return NextResponse.json({ draft });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Outreach generation failed" }, { status: 500 });
  }
}
