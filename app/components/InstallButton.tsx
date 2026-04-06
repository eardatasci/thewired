"use client";

import { useRef, useEffect, useState } from "react";
import { moveState } from "./moveState";

export default function InstallButton() {
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function check() {
      if (!visible && moveState.demoDone) {
        setVisible(true);
      }
      if (visible && Math.abs(moveState.cameraX) > 0.5) {
        setHidden(true);
      }
      rafRef.current = requestAnimationFrame(check);
    }
    rafRef.current = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible]);

  if (!visible || hidden) return null;

  const tagline = moveState.demoChoice === "beg"
    ? "At least you didn't waste your time!"
    : "Close one!";

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 animate-fade-up pointer-events-auto">
      <button
        onClick={() => { moveState.wiredTriggered = true; }}
        className="flex items-center gap-2 px-6 py-3 rounded-full border border-cream/15 bg-cream/[0.06] backdrop-blur-xl hover:bg-cream/[0.12] hover:border-cream/25 transition-all duration-200 cursor-pointer"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <span className="text-[14px] text-cream/70">{tagline} · Install the Wired</span>
        <svg
          width="8"
          height="12"
          viewBox="0 0 12 20"
          fill="none"
        >
          <path
            d="M2 2L10 10L2 18"
            stroke="currentColor"
            strokeOpacity="0.4"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
