"use client";

import { useEffect, useRef, useState } from "react";

// ── "Ask us anything" — a premium chat thread, not a generic bubble widget.
// Answers come from /api/ask (master Q&A only). When the assistant isn't
// confident it never guesses: it offers to follow up and captures the
// parent's email + question via /api/ask/capture. Before the AI key is set,
// the input rests in a graceful "coming online" state.

const MAX_LEN = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Message {
  role: "user" | "assistant";
  text: string;
  /** assistant message that offers the email follow-up */
  capture?: { question: string; done?: boolean };
}

export default function ChatWidget() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ask")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d?.configured)))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function ask() {
    const q = input.trim();
    if (!q || busy || !configured) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.confident && data.answer) {
        setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: "Great question — I want to get you the exact answer rather than guess. Leave your email and a real person will get right back to you.",
            capture: { question: q },
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Great question — I want to get you the exact answer rather than guess. Leave your email and a real person will get right back to you.",
          capture: { question: q },
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail(idx: number) {
    const em = email.trim();
    const msg = messages[idx];
    if (!msg?.capture || !EMAIL_RE.test(em) || sendingEmail) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/ask/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, question: msg.capture.question }),
      });
      if (res.ok) {
        setEmail("");
        setMessages((m) =>
          m.map((x, i) => (i === idx ? { ...x, capture: { ...x.capture!, done: true } } : x)),
        );
      }
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[#0A0A0B] border border-white/10 shadow-[0_8px_60px_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            {configured && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-60" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                configured ? "bg-accent-blue" : "bg-white/30"
              }`}
            />
          </span>
          <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/80">
            You. First Assistant
          </span>
        </div>
        {configured === false && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 border border-white/15 rounded-full px-3 py-1">
            Coming online
          </span>
        )}
      </div>

      {/* Thread */}
      <div ref={threadRef} className="px-6 sm:px-8 py-6 max-h-[380px] overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <p className="text-[15px] text-white/45 leading-[1.7]">
            {configured
              ? "Try: “What does Jumpstart cost?” · “Can she play other sports?” · “What equipment does she need?”"
              : "Our assistant is being connected. In the meantime, the FAQ on the home page answers the most common questions — or email kathleen@youfirstlacrosse.com."}
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-blue text-white text-[15px] leading-[1.65] px-5 py-3">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.07] border border-white/10 text-white/90 text-[15px] leading-[1.7] px-5 py-3.5">
                <p>{m.text}</p>
                {m.capture && !m.capture.done && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={email}
                      maxLength={254}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendEmail(i)}
                      placeholder="you@email.com"
                      aria-label="Your email address"
                      className="flex-1 rounded-lg bg-black/40 border border-white/15 px-4 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-accent-blue"
                    />
                    <button
                      onClick={() => sendEmail(i)}
                      disabled={sendingEmail || !EMAIL_RE.test(email.trim())}
                      className="px-5 py-2.5 rounded-lg bg-accent-blue text-white text-[12px] font-semibold uppercase tracking-[0.08em] hover:bg-accent-blue-hover disabled:opacity-40 transition-all"
                    >
                      {sendingEmail ? "Sending…" : "Send"}
                    </button>
                  </div>
                )}
                {m.capture?.done && (
                  <p className="mt-2.5 text-[13px] text-accent-blue font-semibold">
                    Got it — we&apos;ll be in touch shortly.
                  </p>
                )}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white/[0.07] border border-white/10 px-5 py-4 flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-6 sm:px-8 py-5 border-t border-white/[0.08]">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            maxLength={MAX_LEN}
            disabled={!configured}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder={configured ? "Ask about the program, the levels, the season…" : "Coming online soon"}
            className="flex-1 rounded-xl bg-white/[0.06] border border-white/12 px-5 py-3.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/25 disabled:opacity-50 transition-all"
          />
          <button
            onClick={ask}
            disabled={!configured || busy || !input.trim()}
            aria-label="Send question"
            className="w-[52px] h-[52px] rounded-xl bg-accent-blue text-white flex items-center justify-center hover:bg-accent-blue-hover disabled:opacity-40 transition-all flex-shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
