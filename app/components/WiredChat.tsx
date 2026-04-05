"use client";

import { useRef, useEffect, useState } from "react";
import { moveState } from "./moveState";

export default function WiredChat() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<{ text: string; from: "user" | "wired"; playing?: boolean; link?: string }[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const greetedRef = useRef(false);

  // Poll for wiredDone
  useEffect(() => {
    function check() {
      if (!visible && moveState.wiredDone) {
        setVisible(true);
      }
      rafRef.current = requestAnimationFrame(check);
    }
    rafRef.current = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible]);

  // Auto-greet on first appearance
  useEffect(() => {
    if (!visible || greetedRef.current) return;
    greetedRef.current = true;

    setTimeout(() => {
      setMessages([{
        text: "We're still building but you can find installation instructions at our Github.",
        from: "wired",
        playing: true,
        link: "https://github.com/eardatasci/thewired",
      }]);

      const audio = new Audio("/wired-greeting.mp3");
      audioRef.current = audio;
      moveState.speaking = true;
      audio.play().catch(() => {});
      audio.onended = () => {
        moveState.speaking = false;
        setMessages((prev) =>
          prev.map((m, i) => (i === 0 ? { ...m, playing: false } : m))
        );
      };
    }, 600);
  }, [visible]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { text: trimmed, from: "user" }]);
    setInput("");

    // Reply with offline audio
    setTimeout(() => {
      const replyIndex =
        messages.length + 1; // index of the wired message we're about to add
      setMessages((prev) => [
        ...prev,
        { text: "I'm offline right now. Check back later though!", from: "wired", playing: true },
      ]);

      const audio = new Audio("/offline-message.mp3");
      audioRef.current = audio;
      moveState.speaking = true;
      audio.play().catch(() => {});
      audio.onended = () => {
        moveState.speaking = false;
        setMessages((prev) =>
          prev.map((m, i) => (i === replyIndex ? { ...m, playing: false } : m))
        );
      };
    }, 800);
  }

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-0 bottom-8 z-20 flex justify-center pointer-events-none animate-fade-up"
    >
      <div
        className="pointer-events-auto flex flex-col w-[min(480px,90vw)]"
        style={{ maxHeight: "40vh" }}
      >
        {/* Messages area */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1 scrollbar-thin">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-lg text-[14px] max-w-full flex items-center gap-2 ${
                    msg.from === "user"
                      ? "bg-cream/10 text-cream/80"
                      : "bg-cream/[0.06] text-cream/70 border border-cream/10"
                  }`}
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {msg.from === "wired" && msg.playing && (
                    <span className="flex items-center gap-[3px] shrink-0">
                      <span className="w-[3px] h-3 bg-cream/50 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                      <span className="w-[3px] h-4 bg-cream/50 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                      <span className="w-[3px] h-2.5 bg-cream/50 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                  {msg.text}
                  {msg.link && (
                    <a
                      href={msg.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1.5 text-[13px] text-cream/40 hover:text-cream/70 underline underline-offset-2 transition-colors"
                    >
                      {msg.link}
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 rounded-lg border border-cream/10 bg-cream/[0.04] backdrop-blur-xl px-4 py-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Talk to my wired..."
              className="flex-1 bg-transparent text-[14px] text-cream/80 placeholder:text-cream/25 outline-none"
              style={{ fontFamily: "var(--font-inter)" }}
              autoFocus
            />
            <button
              type="submit"
              className="text-cream/30 hover:text-cream/60 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
