"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Task = { id: string; title: string; kind: string; status: string; created_at: string; result: any };

export default function DocsPage() {
  const [docs, setDocs] = useState<Task[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("tasks").select("id,title,kind,status,created_at,result")
      .in("status", ["done", "needs_approval"]).order("created_at", { ascending: false }).limit(60)
      .then(({ data }) => setDocs((data as Task[]) ?? []));
  }, []);

  const open = docs.find((d) => d.id === openId);

  function download() {
    if (!open) return;
    const blob = new Blob([open.result?.markdown || ""], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(open.result?.title || "foundly-doc").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
  }

  return (
    <div className="page">
      <span className="eyebrow">Documents</span>
      <h1 style={{ margin: "2px 0 0", fontSize: 22 }}>Everything Milo has produced</h1>
      <p className="small muted" style={{ margin: "3px 0 0" }}>Plans, briefs, decks, outreach and posts — stored, readable, exportable.</p>

      <div className="grid-2" style={{ marginTop: 12, gridTemplateColumns: "minmax(280px, 0.8fr) minmax(320px, 1.2fr)" }}>
        <div className="card">
          <div className="card-head"><span>Library</span><span className="go">{docs.length}</span></div>
          {docs.length === 0 ? (
            <p className="small muted card-pad" style={{ margin: 0 }}>Nothing yet. Run something in Home, Build or Run.</p>
          ) : (
            <div className="rows" style={{ maxHeight: 460, overflowY: "auto" }}>
              {docs.map((d) => (
                <button key={d.id} onClick={() => setOpenId(d.id)} className="row-item" style={{
                  width: "100%", border: 0, borderTop: "1px solid var(--line)", background: openId === d.id ? "rgba(255,255,255,0.9)" : "transparent",
                  cursor: "pointer", font: "inherit", textAlign: "left",
                }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{d.result?.title || d.title}</strong>
                    <div className="meta">{d.kind} · {new Date(d.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={d.status === "done" ? "badge badge-done" : "badge badge-wait"}>
                    {d.status === "done" ? "Ready" : "Draft"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <span>{open ? "Preview" : "Nothing selected"}</span>
            {open && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard?.writeText(open.result?.markdown || "")}>Copy</button>
                <button className="btn btn-sm" onClick={download}>Download .md</button>
              </div>
            )}
          </div>
          <div className="card-pad" style={{ minHeight: 260 }}>
            {!open ? (
              <p className="small muted" style={{ margin: 0 }}>Pick a document on the left.</p>
            ) : (
              <>
                <h2 style={{ fontSize: 18, marginBottom: 2 }}>{open.result?.title}</h2>
                <p className="small muted" style={{ margin: "0 0 12px" }}>{open.result?.summary}</p>
                <div className="prose">
                  {(open.result?.blocks ?? []).map((b: any, i: number) => (
                    <div key={i}><h4>{b.heading}</h4><p>{b.body}</p></div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
