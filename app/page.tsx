"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect } from "react";
import { moveState } from "./components/moveState";
import MessageConversation from "./components/MessageConversation";

const Scene = dynamic(() => import("./components/Scene"), { ssr: false });

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      if (heroRef.current) {
        // Fade hero text as camera moves away from origin
        const drift = Math.abs(moveState.cameraY);
        const fade = Math.max(1 - drift * 0.5, 0);
        heroRef.current.style.opacity = `${fade}`;
        heroRef.current.style.transform = `translateY(${drift * -20}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg bg-grid">
      {/* 3D Background — fixed, full viewport */}
      <div className="fixed inset-0">
        <Scene />
      </div>

      {/* Message conversation — appears on screen 2 after face settles */}
      <MessageConversation />

      {/* Hero text — fades as camera moves */}
      <div
        ref={heroRef}
        className="fixed inset-0 z-10 flex flex-col justify-end items-center pointer-events-none pb-8"
      >
        <h1
          className="font-serif text-6xl md:text-[7rem] text-cream leading-[0.9] tracking-tight animate-fade-up whitespace-nowrap"
          style={{ animationDelay: "3.7s" }}
        >
          Scale <em className="text-cream/50">yourself.</em>
        </h1>
        <button
          onClick={() => { moveState.triggered = true; }}
          className="mt-8 mb-4 animate-fade-up pointer-events-auto w-10 h-10 rounded-full border border-cream/10 bg-cream/[0.04] backdrop-blur-sm flex items-center justify-center hover:bg-cream/[0.08] hover:border-cream/20 transition-all duration-200 cursor-pointer"
          style={{ animationDelay: "4.2s" }}
        >
          <svg
            className="animate-boop"
            width="16"
            height="10"
            viewBox="0 0 20 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 2L10 10L18 2"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
