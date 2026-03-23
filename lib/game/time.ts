import { Round } from "@/types/game";

export function msToCountdown(ms: number) {
  const clamped = Math.max(0, ms);
  const seconds = Math.floor(clamped / 1000);
  const tenths = Math.floor((clamped % 1000) / 100);
  return { seconds, tenths };
}

export function computePressTimeMs(roundStartedAtIso: string, nowMs: number) {
  const startedMs = new Date(roundStartedAtIso).getTime();
  return Math.max(0, Math.round(nowMs - startedMs));
}

export function computeDeltaMs(pressTimeMs: number, eventTimeMs: number) {
  return Math.round(pressTimeMs - eventTimeMs);
}

export function generateEventTimeMs(durationMs: number) {
  // Keep enough space for players to press and for early clicks to be possible.
  const min = Math.floor(durationMs * 0.3);
  const max = Math.floor(durationMs * 0.85);
  return Math.floor(min + Math.random() * (Math.max(min + 1, max) - min));
}

export function isRoundReadyForGuess(round: Round | null) {
  return !!round && round.status === "running" && round.started_at && round.event_time_ms != null;
}

