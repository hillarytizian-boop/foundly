"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloudBank, CloudField, MiloCloud } from "./Mascot";

export default function Hero({ header }: { header?: React.ReactNode }) {
  const [idea, setIdea] = useState("");
  const router = useRouter();
  const ready = idea.trim().length > 0;

  function start(e?: React.FormEvent) {
    e?.preventDefault();
    const q = idea.trim();
    router.push(q ? `/sign-up?idea=${encodeURIComponent(q)}` : "/sign-up");
  }

  return (
    <section className="mk-sky" id="product">
      {header}
      <div className="mk-sky-body">
        <MiloCloud className="mk-mascot" />

        <h1>Build a business that runs on its own.</h1>
        <p className="lede">Meet Milo, the AI employee who does the work.</p>

        <form className="mk-ask" onSubmit={start} id="prompt">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) start(e);
            }}
            placeholder="Ask Milo to build a business that…"
            aria-label="Describe the business you want"
            rows={3}
          />
          <div className="mk-ask-foot">
            <button
              className={`mk-send${ready ? " ready" : ""}`}
              type="submit"
              disabled={!ready}
              aria-label="Start with Milo"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <div className="mk-clouds" aria-hidden>
        <CloudField />
        <CloudBank />
      </div>
    </section>
  );
}
