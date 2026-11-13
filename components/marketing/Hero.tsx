"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CloudMark } from "./Icons";

const IDEAS = [
  "Artisanal roastery shop",
  "B2B SaaS lead outreach",
  "Nairobi vintage drop",
];

export default function Hero() {
  const [idea, setIdea] = useState("");
  const router = useRouter();

  function start(e?: React.FormEvent) {
    e?.preventDefault();
    const q = idea.trim();
    router.push(q ? `/sign-up?idea=${encodeURIComponent(q)}` : "/sign-up");
  }

  return (
    <section className="mk-hero">
      <div className="mk-hero-dots" aria-hidden />
      <div className="mk-hero-in">
        <span className="mk-badge">
          <CloudMark size={12} />
          <span>Meet Milo · Autonomous business employee</span>
        </span>

        <h1 className="mk-h1">Build a business that runs on its own.</h1>

        <p className="mk-hero-sub">
          Meet Milo, the AI employee who does the work. He builds your storefront, writes your
          brand and posts, talks to suppliers, and finds your first paying customers.
        </p>

        <form className="mk-prompt" onSubmit={start} id="prompt">
          <span className="mk-prompt-icon"><CloudMark size={15} /></span>
          <input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Ask Milo to build a business…"
            aria-label="Describe the business you want"
          />
          <button className="mk-cta" type="submit">
            Start with Milo <ArrowRight />
          </button>
        </form>

        <div className="mk-chips">
          <span className="lead-in">Popular setups:</span>
          {IDEAS.map((t) => (
            <button key={t} type="button" onClick={() => setIdea(t)}>&ldquo;{t}&rdquo;</button>
          ))}
        </div>
      </div>
    </section>
  );
}
