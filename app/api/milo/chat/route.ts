import { NextResponse } from "next/server";
import { askMilo } from "@/lib/milo";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) return NextResponse.json({ error: "messages array required" }, { status: 400 });
    const reply = await askMilo(messages);

    // Save to DB if signed in (best-effort, never blocks the reply)
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
        if (lastUser) await supabase.from("milo_messages").insert({ user_id: user.id, role: "user", content: lastUser.content });
        await supabase.from("milo_messages").insert({ user_id: user.id, role: "assistant", content: reply });
      }
    } catch {}

    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Milo failed" }, { status: 500 });
  }
}
