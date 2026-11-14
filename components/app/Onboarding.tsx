"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GlowCloud } from "@/components/marketing/Mascot";

type Step = "choose" | "idea" | "website" | "surprise" | "opening";

/**
 * First run, matched to foundable.com/home: a glowing cloud, one question,
 * three plain choices. Everything here is one decision, one screen.
 */
export default function Onboarding({ onIdea }: { onIdea: (idea: string) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [idea, setIdea] = useState("");
  const [url, setUrl] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === "idea") taRef.current?.focus();
  }, [step]);

  const ready = idea.trim().length > 2;

  function submitIdea() {
    if (!ready) return;
    setStep("opening");
    // hand the idea to the thread; the chat opens it like a first message
    setTimeout(() => onIdea(idea.trim()), 650);
  }

  if (step === "opening") {
    return (
      <div className="a-screen">
        <div className="a-splash">
          <GlowCloud className="a-cloud" />
        </div>
      </div>
    );
  }

  return (
    <div className="a-screen">
      {step !== "choose" && (
        <button className="a-back" onClick={() => setStep("choose")}>
          <svg width="10" height="16" viewBox="0 0 12 20" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 2 2 10l8 8" />
          </svg>
          Back
        </button>
      )}

      <div className={`a-center${step === "idea" || step === "website" ? " tight" : ""}`}>
        <GlowCloud className="a-cloud" />

        {step === "choose" && (
          <>
            <h1 className="a-h1">Let&apos;s get started.</h1>
            <div className="a-choices">
              <button className="a-choice" onClick={() => setStep("idea")}>
                <span className="emoji">💡</span>
                <span className="lbl">I have an idea</span>
                <Chev />
              </button>
              <button className="a-choice" onClick={() => setStep("website")}>
                <span className="emoji">🖼️</span>
                <span className="lbl">I have a website</span>
                <Chev />
              </button>
              <button className="a-choice" onClick={() => setStep("surprise")}>
                <span className="emoji">🎁</span>
                <span className="lbl">Surprise me</span>
                <Chev />
              </button>
            </div>
          </>
        )}

        {step === "idea" && (
          <>
            <h1 className="a-h1">What&apos;s your idea?</h1>
            <form
              className="a-idea-form"
              onSubmit={(e) => { e.preventDefault(); submitIdea(); }}
            >
              <textarea
                ref={taRef}
                className="a-textarea"
                rows={4}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitIdea(); }
                }}
                placeholder="Message Milo…"
                aria-label="Your idea"
              />
              <button className={`a-continue${ready ? " ready" : ""}`} type="submit" disabled={!ready}>
                Continue
              </button>
            </form>
            <p className="a-hint">One sentence is enough. Milo takes it from there.</p>
          </>
        )}

        {step === "website" && (
          <>
            <h1 className="a-h1">What&apos;s the address?</h1>
            <form
              className="a-idea-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!url.trim()) return;
                const host = url.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
                setStep("opening");
                setTimeout(() => onIdea(`I already have a website at ${host}. Help me run the business around it.`), 650);
              }}
            >
              <input
                className="a-textarea"
                style={{ minHeight: 0, height: 58 }}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourbusiness.com"
                aria-label="Your website"
                inputMode="url"
              />
              <button className={`a-continue${url.trim() ? " ready" : ""}`} type="submit" disabled={!url.trim()}>
                Continue
              </button>
            </form>
            <p className="a-hint">Milo reads what you have and builds around it.</p>
          </>
        )}

        {step === "surprise" && (
          <>
            <h1 className="a-h1">Want me to pick one?</h1>
            <div className="a-choices">
              {[
                ["☕", "A coffee roastery", "Single-origin beans, monthly drops"],
                ["👕", "A streetwear label", "Heavyweight hoodies, limited runs"],
                ["🕯️", "A candle studio", "Hand-poured sets for Nairobi homes"],
              ].map(([emoji, name, blurb]) => (
                <button
                  key={name}
                  className="a-choice"
                  onClick={() => {
                    setStep("opening");
                    setTimeout(() => onIdea(`${name.replace(/^A /, "")} — ${blurb.toLowerCase()}.`), 650);
                  }}
                >
                  <span className="emoji">{emoji}</span>
                  <span className="lbl">
                    {name}
                    <span style={{ display: "block", fontSize: 12.5, color: "rgba(255,255,255,.45)", marginTop: 2, fontWeight: 400 }}>
                      {blurb}
                    </span>
                  </span>
                  <Chev />
                </button>
              ))}
            </div>
            <p className="a-hint">You can change everything later.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Chev() {
  return (
    <svg className="chev" width="9" height="16" viewBox="0 0 10 18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 2l6 7-6 7" />
    </svg>
  );
}
