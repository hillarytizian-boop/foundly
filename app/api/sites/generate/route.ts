import { NextResponse } from "next/server";
import { generateSiteContent } from "@/lib/milo";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { idea, businessName } = await req.json();
    if (!idea?.trim()) return NextResponse.json({ error: "idea required" }, { status: 400 });
    const site = generateSiteContent(idea, businessName);

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("sites").insert({
          user_id: user.id,
          business_name: businessName || "Untitled",
          idea,
          content: site,
        });
      }
    } catch {}

    return NextResponse.json({ site });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Site generation failed" }, { status: 500 });
  }
}
