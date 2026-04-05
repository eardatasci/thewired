// Shared mutable state for face movement — written by UI, read by AsciiSwarm in useFrame
export const moveState = {
  triggered: false,
  // Written by AsciiSwarm each frame so HTML overlays can react
  cameraY: 0,
  // Set true when migration completes and face is settled
  migrationDone: false,
  // Scripted face rotation phase — written by MessageConversation, read by AsciiSwarm
  sequencePhase: "idle" as "idle" | "look-left" | "look-front",
  // Frown target (0-1) — driven by message sequence
  frown: 0,
  // Sideways migration trigger for "talk to my wired"
  wiredTriggered: false,
  // Track camera X for UI overlays
  cameraX: 0,
  // Set true when wired migration completes
  wiredDone: false,
  // Set true when the demo conversation fully completes
  demoDone: false,
  // Set true while wired audio is playing — drives mouth movement
  speaking: false,
};
