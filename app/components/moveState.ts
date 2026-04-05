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
};
