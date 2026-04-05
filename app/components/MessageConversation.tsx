"use client";

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from "react";
import { moveState } from "./moveState";
import { MessageBubble } from "@/components/ui/message-bubble";

type Msg = { text: string; variant: "sent" | "received"; grouped?: "first" | "middle" | "last" | "none"; gap?: boolean };

const INCOMING: Msg[] = [
  { text: "Hey... I don't think this is working.", variant: "received" },
  { text: "I want to break up.", variant: "received" },
];

const PATHS = {
  "end-well": {
    sent: [
      { text: "alr no hard feelings", variant: "sent" as const, grouped: "first" as const, gap: true },
      { text: "i'll never forget the daytrip we took to Antioch", variant: "sent" as const, grouped: "last" as const },
    ] as Msg[],
    response: [
      { text: "Wow you sound so GENUINE and HUMAN and REAL", variant: "received" as const, gap: true },
      { text: "I changed my mind wanna get dinner tn?", variant: "received" as const },
    ] as Msg[],
  },
  "beg": {
    sent: [
      { text: "please don't do this 😭", variant: "sent" as const, grouped: "first" as const, gap: true },
      { text: "ill do anything please", variant: "sent" as const, grouped: "last" as const },
    ] as Msg[],
    response: [
      { text: "lol no", variant: "received" as const, gap: true },
    ] as Msg[],
  },
};

const TIMELINE = {
  msg0: 0.0,
  msg1: 1.8,
  lookFront: 3.5,
  footer: 4.0,
};

// Post-choice timeline (seconds after choice)
const POST = {
  sent0: 0.5,
  sent1: 1.1,
  lookLeft: 2.0,
  resp0: 2.5,
  resp1: 3.1,
};

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

function fadeIn(elapsed: number, start: number, duration = 0.4) {
  const t = Math.max((elapsed - start) / duration, 0);
  return easeOutQuint(Math.min(t, 1));
}

function renderBubble(msg: Msg, i: number, allMsgs: Msg[], ref: (el: HTMLDivElement | null) => void) {
  const next = allMsgs[i + 1];
  const showAvatar = !next || next.variant !== msg.variant;
  const isSent = msg.variant === "sent";

  return (
    <div
      key={`${msg.text}-${i}`}
      ref={ref}
      className={msg.gap ? "mt-6" : "mt-1"}
      style={{
        opacity: 0,
        transform: "translateY(12px)",
        alignSelf: isSent ? "flex-end" : "flex-start",
        display: "flex",
        flexDirection: isSent ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: "8px",
      }}
    >
      {showAvatar ? (
        <div
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: isSent ? "rgba(255,255,255,0.12)" : "#e8508a",
            color: isSent ? "rgba(255,255,255,0.6)" : "white",
            fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          {isSent ? "Y" : "J"}
        </div>
      ) : (
        <div style={{ width: 28, flexShrink: 0 }} />
      )}
      <MessageBubble message={msg.text} variant={msg.variant} grouped={msg.grouped} />
    </div>
  );
}

export default function MessageConversation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const incomingRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const responseRefs = useRef<(HTMLDivElement | null)[]>([]);
  const footerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const [choice, setChoice] = useState<"end-well" | "beg" | null>(null);
  const choiceRef = useRef<"end-well" | "beg" | null>(null);
  const choiceTimeRef = useRef<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const prevTopRef = useRef<number | null>(null);

  const handleChoice = useCallback((c: "end-well" | "beg") => {
    // FLIP step 1: snapshot position before re-render
    if (columnRef.current) {
      prevTopRef.current = columnRef.current.getBoundingClientRect().top;
    }
    choiceRef.current = c;
    choiceTimeRef.current = performance.now();
    setChoice(c);
  }, []);

  // FLIP step 2: after re-render, animate from old position to new
  useLayoutEffect(() => {
    if (prevTopRef.current !== null && columnRef.current) {
      const newTop = columnRef.current.getBoundingClientRect().top;
      const delta = prevTopRef.current - newTop;
      if (Math.abs(delta) > 2) {
        columnRef.current.style.transition = "";
        columnRef.current.style.transform = `translateY(${delta}px)`;
        // Force reflow
        columnRef.current.getBoundingClientRect();
        columnRef.current.style.transition = "transform 0.6s ease-out";
        columnRef.current.style.transform = "translateY(0)";
      }
      prevTopRef.current = null;
    }
  }, [choice]);

  useEffect(() => {
    function tick() {
      if (!containerRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const visible = Math.abs(moveState.cameraY) > 2;
      const xDrift = Math.abs(moveState.cameraX);
      const xFade = Math.max(1 - xDrift * 0.3, 0);
      containerRef.current.style.display = visible ? "" : "none";
      containerRef.current.style.opacity = `${xFade}`;
      containerRef.current.style.transform = `translateX(${-xDrift * 30}px)`;

      if (!visible) {
        startTimeRef.current = null;
        moveState.sequencePhase = "idle";
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (moveState.migrationDone) {
        if (startTimeRef.current === null) {
          startTimeRef.current = performance.now();
        }

        const elapsed = (performance.now() - startTimeRef.current) / 1000;

        // --- Phase 1: Incoming messages ---
        if (elapsed >= TIMELINE.lookFront) {
          moveState.sequencePhase = "look-front";
          // Stop frowning when turning to viewer (unless post-choice overrides)
          if (!choiceRef.current) moveState.frown = 0;
        } else if (elapsed >= TIMELINE.msg1) {
          // Frown when reading "I want to break up"
          moveState.sequencePhase = "look-left";
          moveState.frown = 1;
        } else if (elapsed >= TIMELINE.msg0) {
          moveState.sequencePhase = "look-left";
        }

        // Incoming message 0
        const b0 = incomingRefs.current[0];
        if (b0) {
          const e = fadeIn(elapsed, TIMELINE.msg0);
          b0.style.opacity = `${e}`;
          b0.style.transform = `translateY(${(1 - e) * 12}px)`;
        }

        // Incoming message 1
        const b1 = incomingRefs.current[1];
        if (b1) {
          const e = fadeIn(elapsed, TIMELINE.msg1);
          b1.style.opacity = `${e}`;
          b1.style.transform = `translateY(${(1 - e) * 12}px)`;
        }

        // Footer bar
        if (footerRef.current) {
          if (choiceRef.current) {
            footerRef.current.style.opacity = "0";
            footerRef.current.style.transform = "translateY(20px)";
            footerRef.current.style.pointerEvents = "none";
          } else {
            const e = fadeIn(elapsed, TIMELINE.footer, 0.6);
            footerRef.current.style.opacity = `${e}`;
            footerRef.current.style.transform = `translateY(${(1 - e) * 20}px)`;
            footerRef.current.style.pointerEvents = e > 0.5 ? "auto" : "none";
          }
        }

        // --- Phase 2: Post-choice ---
        if (choiceRef.current && choiceTimeRef.current) {
          const postElapsed = (performance.now() - choiceTimeRef.current) / 1000;

          // Face turns to look at messages when response arrives
          if (postElapsed >= POST.lookLeft) {
            moveState.sequencePhase = "look-left";
          }

          // Frown when reading "lol no" (beg path response)
          if (choiceRef.current === "beg" && postElapsed >= POST.resp0 + 0.6) {
            moveState.frown = 1;
          } else if (postElapsed < POST.lookLeft) {
            moveState.frown = 0;
          }

          // Sent messages
          for (let i = 0; i < sentRefs.current.length; i++) {
            const el = sentRefs.current[i];
            if (!el) continue;
            const showAt = i === 0 ? POST.sent0 : POST.sent1;
            const e = fadeIn(postElapsed, showAt);
            el.style.opacity = `${e}`;
            el.style.transform = `translateY(${(1 - e) * 12}px)`;
          }

          // Response messages
          for (let i = 0; i < responseRefs.current.length; i++) {
            const el = responseRefs.current[i];
            if (!el) continue;
            const showAt = POST.resp0 + i * 0.6;
            const e = fadeIn(postElapsed, showAt);
            el.style.opacity = `${e}`;
            el.style.transform = `translateY(${(1 - e) * 12}px)`;

            if (i === responseRefs.current.length - 1 && e >= 1) {
              moveState.demoDone = true;
            }
          }
        }
      } else {
        startTimeRef.current = null;
        choiceRef.current = null;
        choiceTimeRef.current = null;
        moveState.sequencePhase = "idle";
        moveState.frown = 0;
        for (const el of incomingRefs.current) {
          if (el) { el.style.opacity = "0"; el.style.transform = "translateY(12px)"; }
        }
        for (const el of sentRefs.current) {
          if (el) { el.style.opacity = "0"; el.style.transform = "translateY(12px)"; }
        }
        for (const el of responseRefs.current) {
          if (el) { el.style.opacity = "0"; el.style.transform = "translateY(12px)"; }
        }
        if (footerRef.current) {
          footerRef.current.style.opacity = "0";
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const path = choice ? PATHS[choice] : null;
  const allSent = path?.sent ?? [];
  const allResponse = path?.response ?? [];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-10 pointer-events-none"
      style={{ display: "none" }}
    >
      {/* Messages — left side, vertically centered */}
      <div
        className="absolute inset-0 flex items-center"
      >
        <div ref={columnRef} className="flex flex-col pl-[8vw]" style={{ width: "55vw", maxWidth: "900px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif" }}>
          {/* Incoming messages */}
          {INCOMING.map((msg, i) =>
            renderBubble(msg, i, INCOMING, (el) => { incomingRefs.current[i] = el; })
          )}

          {/* Sent messages (after choice) */}
          {allSent.map((msg, i) =>
            renderBubble(msg, i, allSent, (el) => { sentRefs.current[i] = el; })
          )}

          {/* Response messages (after sent) */}
          {allResponse.map((msg, i) =>
            renderBubble(msg, i, allResponse, (el) => { responseRefs.current[i] = el; })
          )}
        </div>
      </div>

      {/* Liquid glass footer */}
      <div
        ref={footerRef}
        className="fixed bottom-0 left-0 right-0"
        style={{
          opacity: 0,
          transform: "translateY(20px)",
          pointerEvents: "none",
        }}
      >
        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(212,203,191,0.15) 20%, rgba(212,203,191,0.15) 80%, transparent)" }} />

        {/* Glass bar */}
        <div
          style={{
            backdropFilter: "blur(24px) saturate(1.4)",
            WebkitBackdropFilter: "blur(24px) saturate(1.4)",
            background: "rgba(255,255,255,0.04)",
          }}
          className="flex items-center justify-between px-10 py-5"
        >
          <p
            className="text-white/80 text-base"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            Jenny wants to break up. What should I tell her?
          </p>

          <div className="flex gap-3 pointer-events-auto">
            <button
              onClick={() => handleChoice("end-well")}
              className="px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-white/70 text-sm backdrop-blur-sm hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200 cursor-pointer"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              End things well
            </button>
            <button
              onClick={() => handleChoice("beg")}
              className="px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-white/70 text-sm backdrop-blur-sm hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200 cursor-pointer"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              Beg for her back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
