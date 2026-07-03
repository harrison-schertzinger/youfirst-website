"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

const MAX_QUESTION_LENGTH = 500;

type Phase = "idle" | "asking" | "answered" | "fallback" | "capturing" | "captured";

export default function AskAnything() {
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  async function ask() {
    const q = question.trim();
    if (!q || phase === "asking") return;
    setError("");
    setPhase("asking");
    setAskedQuestion(q);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.confident && typeof data.answer === "string" && data.answer) {
        setAnswer(data.answer);
        setPhase("answered");
      } else {
        // Not confident, not configured, or rate limited — never guess.
        setPhase("fallback");
      }
    } catch {
      setPhase("fallback");
    }
  }

  async function capture() {
    const em = email.trim();
    if (!em || phase === "capturing") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("That email doesn't look quite right — mind double-checking it?");
      return;
    }
    setError("");
    setPhase("capturing");
    try {
      const res = await fetch("/api/ask/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, question: askedQuestion }),
      });
      if (res.ok) {
        setPhase("captured");
      } else {
        setPhase("fallback");
        setError("Something hiccuped on our end — please try once more.");
      }
    } catch {
      setPhase("fallback");
      setError("Something hiccuped on our end — please try once more.");
    }
  }

  function reset() {
    setQuestion("");
    setAskedQuestion("");
    setAnswer("");
    setEmail("");
    setError("");
    setPhase("idle");
  }

  return (
    <section className="py-20 sm:py-28 bg-white scroll-mt-20" id="ask">
      <div className="mx-auto max-w-[880px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="section-label mb-5">Ask Us Anything</p>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] leading-[1.1] text-text-primary text-balance">
              Have a question? Get a straight answer.
            </h2>
            <p className="mt-5 text-lg text-text-secondary leading-[1.75]">
              Answers come directly from our program guide — cost, tryouts,
              equipment, schedules, all of it. If we&apos;re not sure, we&apos;ll
              say so and follow up personally.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="rounded-2xl border-[1.5px] border-accent-blue bg-white shadow-[0_8px_30px_rgba(75,156,211,0.14)] p-6 sm:p-8">
            {(phase === "idle" || phase === "asking") && (
              <>
                <label
                  htmlFor="ask-input"
                  className="block text-sm font-semibold text-text-primary mb-3"
                >
                  What would you like to know?
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="ask-input"
                    type="text"
                    value={question}
                    maxLength={MAX_QUESTION_LENGTH}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") ask();
                    }}
                    placeholder='e.g. "Can my daughter play soccer too?"'
                    className="flex-1 rounded-xl border border-border bg-section-alt/60 px-5 py-4 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/25 transition-all"
                  />
                  <button
                    onClick={ask}
                    disabled={phase === "asking" || !question.trim()}
                    className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:bg-accent-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 min-w-[120px]"
                  >
                    {phase === "asking" ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Thinking
                      </span>
                    ) : (
                      "Ask"
                    )}
                  </button>
                </div>
              </>
            )}

            {phase === "answered" && (
              <div>
                <p className="text-sm font-semibold text-text-muted mb-2">You asked:</p>
                <p className="text-base font-bold text-text-primary mb-5">{askedQuestion}</p>
                <div className="rounded-xl bg-accent-wash border border-[#D4E6F5] px-6 py-5">
                  <p className="text-[15px] text-text-primary leading-[1.8] whitespace-pre-line">
                    {answer}
                  </p>
                </div>
                <div className="mt-5 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={reset}
                    className="text-sm font-semibold text-accent-blue-hover hover:underline"
                  >
                    Ask another question
                  </button>
                  <span className="text-xs text-text-muted">
                    Answered from our program guide. Want a human?{" "}
                    <a href="#contact" className="underline">
                      Email us
                    </a>
                    .
                  </span>
                </div>
              </div>
            )}

            {(phase === "fallback" || phase === "capturing" || phase === "captured") && (
              <div>
                {phase !== "captured" ? (
                  <>
                    <p className="text-base font-bold text-text-primary">
                      Great question — I want to get you the exact answer.
                    </p>
                    <p className="mt-2 text-[15px] text-text-secondary leading-[1.7]">
                      Leave your email and we&apos;ll get right back to you,
                      usually the same day.
                    </p>
                    {askedQuestion && (
                      <p className="mt-4 text-sm text-text-muted italic">
                        &ldquo;{askedQuestion}&rdquo;
                      </p>
                    )}
                    <div className="mt-5 flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        value={email}
                        maxLength={254}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") capture();
                        }}
                        placeholder="you@email.com"
                        aria-label="Your email address"
                        className="flex-1 rounded-xl border border-border bg-section-alt/60 px-5 py-4 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/25 transition-all"
                      />
                      <button
                        onClick={capture}
                        disabled={phase === "capturing" || !email.trim()}
                        className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:bg-accent-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {phase === "capturing" ? "Sending…" : "Send it over"}
                      </button>
                    </div>
                    {error && <p className="mt-3 text-sm text-[#B4231D]">{error}</p>}
                    <button
                      onClick={reset}
                      className="mt-4 text-sm font-semibold text-text-muted hover:text-text-primary"
                    >
                      ← Ask a different question
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-lg font-bold text-text-primary">
                      Got it — we&apos;ll be in touch shortly.
                    </p>
                    <p className="mt-2 text-[15px] text-text-secondary">
                      Your question is on its way to a real person.
                    </p>
                    <button
                      onClick={reset}
                      className="mt-5 text-sm font-semibold text-accent-blue-hover hover:underline"
                    >
                      Ask another question
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
