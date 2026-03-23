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

/** Раунд принимает нажатия после старта; эталон события на эфире задаётся отдельно (mark_round_event). */
export function isRoundReadyForGuess(round: Round | null) {
  return !!round && round.status === "running" && !!round.started_at;
}
