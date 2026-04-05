"use client";

import { useState, useEffect, useRef } from "react";
import { moveState } from "./moveState";

const LINES = [
  "Hey! I'm Arda's digital twin.",
  "I can answer questions about his work, experience, and projects.",
  "Want to get in touch? Reach out via contact or GitHub above.",
];

export default function DialogueBox() {
  const [visible, setVisible] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const pollRef = useRef<number>(0);

  // Poll moveState for trigger conditions
  useEffect(() => {
    function check() {
      if (!visible && (moveState.conversationDone || moveState.contactPressed)) {
        setVisible(true);
      }
      pollRef.current = requestAnimationFrame(check);
    }
    pollRef.current = requestAnimationFrame(check);
    return () => cancelAnimationFrame(pollRef.current);
  }, [visible]);

  const currentLine = LINES[lineIndex];
  const displayedText = currentLine.slice(0, charIndex);

  // Typewriter effect — only starts once visible
  useEffect(() => {
    if (!visible) return;

    setCharIndex(0);
    setDone(false);

    intervalRef.current = setInterval(() => {
      setCharIndex((prev) => {
        if (prev >= currentLine.length) {
          clearInterval(intervalRef.current!);
          setDone(true);
          return prev;
        }
        return prev + 1;
      });
    }, 35);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, lineIndex, currentLine]);

  function advance() {
    if (!done) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setCharIndex(currentLine.length);
      setDone(true);
    } else if (lineIndex < LINES.length - 1) {
      setLineIndex((i) => i + 1);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center animate-fade-up cursor-pointer select-none"
      style={{ backgroundColor: "rgba(8, 8, 10, 0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      onClick={advance}
    >
      <div className="relative rounded-lg border-2 border-cream/15 bg-bg/80 px-6 py-4 min-h-[72px] w-[min(92vw,640px)]">
        <p
          className="text-[15px] text-cream/80 leading-relaxed tracking-wide"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {displayedText}
          {!done && (
            <span className="inline-block w-[2px] h-[1em] bg-cream/50 ml-0.5 align-text-bottom animate-pulse" />
          )}
        </p>

        {/* Advance indicator */}
        {done && lineIndex < LINES.length - 1 && (
          <div className="absolute bottom-2 right-3">
            <svg
              className="animate-boop"
              width="10"
              height="8"
              viewBox="0 0 20 12"
              fill="none"
            >
              <path
                d="M2 2L10 10L18 2"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
