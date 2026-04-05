"use client";

import { useRef, useEffect } from "react";
import { scrollState } from "./scrollState";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function range(offset: number, from: number, distance: number) {
  return clamp((offset - from) / distance, 0, 1);
}

function inflateScale(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 + 0.06 * Math.sin(t * Math.PI) + (t - 1) * (1 - t) * -0.5;
}

export default function MessageSequence() {
  const heroRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const incomingRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const outgoingRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      const offset = scrollState.offset;

      if (heroRef.current) {
        const heroFade = 1 - range(offset, 0.25, 0.15);
        heroRef.current.style.opacity = `${heroFade}`;
        heroRef.current.style.transform = `translateY(${(1 - heroFade) * -30}px)`;
      }

      if (chevronRef.current) {
        const chevronFade = 1 - range(offset, 0.20, 0.10);
        chevronRef.current.style.opacity = `${chevronFade}`;
      }

      // Header + input bar fade in just before the first message
      if (headerRef.current) {
        const t = range(offset, 0.45, 0.06);
        headerRef.current.style.opacity = `${clamp(t, 0, 1)}`;
        headerRef.current.style.transform = `translateY(${(1 - t) * 8}px)`;
      }

      if (inputBarRef.current) {
        const t = range(offset, 0.47, 0.06);
        inputBarRef.current.style.opacity = `${clamp(t, 0, 1)}`;
        inputBarRef.current.style.transform = `translateY(${(1 - t) * 8}px)`;
      }

      if (incomingRef.current) {
        const t = range(offset, 0.50, 0.08);
        const s = inflateScale(t);
        incomingRef.current.style.transform = `scale(${s})`;
        incomingRef.current.style.opacity = `${clamp(t * 5, 0, 1)}`;
      }

      if (captionRef.current) {
        const fadeIn = range(offset, 0.58, 0.05);
        const fadeOut = 1 - range(offset, 0.66, 0.04);
        const alpha = Math.min(fadeIn, fadeOut);
        captionRef.current.style.opacity = `${clamp(alpha, 0, 1)}`;
        captionRef.current.style.transform = `translateY(${(1 - clamp(fadeIn, 0, 1)) * 10}px)`;
      }

      if (outgoingRef.current) {
        const t = range(offset, 0.68, 0.08);
        const s = inflateScale(t);
        outgoingRef.current.style.transform = `scale(${s})`;
        outgoingRef.current.style.opacity = `${clamp(t * 5, 0, 1)}`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Screen 1: Hero text */}
      <div
        ref={heroRef}
        className="absolute inset-0 flex flex-col justify-end items-center pb-8"
      >
        <h1
          className="font-serif text-6xl md:text-[7rem] text-cream leading-[0.9] tracking-tight animate-fade-up whitespace-nowrap"
          style={{ animationDelay: "3.7s" }}
        >
          Scale <em className="text-cream/50">yourself.</em>
        </h1>
        <div
          ref={chevronRef}
          className="mt-8 mb-4 animate-fade-up"
          style={{ animationDelay: "4.2s" }}
        >
          <svg
            className="animate-boop"
            width="20"
            height="12"
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
        </div>
      </div>

      {/* Screen 2: iMessage conversation */}
      <div className="absolute inset-0 flex items-center justify-start pl-[12vw]">
        <div
          className="flex flex-col"
          style={{ width: "40vw", maxWidth: "500px" }}
        >
          {/* Chat header */}
          <div
            ref={headerRef}
            className="flex items-center gap-3 mb-6 pb-4"
            style={{ opacity: 0, borderBottom: "1px solid rgba(212, 203, 191, 0.08)" }}
          >
            <div className="avatar">J</div>
            <div>
              <div className="font-mono text-[13px] text-cream/70 tracking-wide">Jennie</div>
              <div className="font-mono text-[10px] text-cream/30 tracking-wider">iMessage</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-4">
            {/* Incoming message row */}
            <div
              ref={incomingRef}
              className="flex items-end gap-2"
              style={{ opacity: 0, transform: "scale(0)", transformOrigin: "left bottom" }}
            >
              <div className="avatar avatar-sm">J</div>
              <div className="bubble bubble-incoming">
                This isn&apos;t working out...
                <br />
                I think we should break up.
              </div>
            </div>

            {/* Outgoing message row */}
            <div
              ref={outgoingRef}
              className="flex items-end gap-2 self-end"
              style={{ opacity: 0, transform: "scale(0)", transformOrigin: "right bottom" }}
            >
              <div className="bubble bubble-outgoing">
                nice knowing ya
              </div>
              <div className="avatar avatar-sm avatar-you">Y</div>
            </div>
          </div>

          {/* iMessage input bar */}
          <div
            ref={inputBarRef}
            className="mt-6 flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              opacity: 0,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(212, 203, 191, 0.08)",
            }}
          >
            <div className="font-mono text-[13px] text-cream/20 flex-1">iMessage</div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="rgba(212,203,191,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="rgba(212,203,191,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* 4th wall caption — below the face on the right */}
        <div
          ref={captionRef}
          className="bubble-caption absolute"
          style={{
            opacity: 0,
            right: "12vw",
            bottom: "18vh",
          }}
        >
          Jennie just broke up with us
        </div>
      </div>
    </div>
  );
}
