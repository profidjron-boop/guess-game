import type { Category } from "@/types/game";

export type ScoringResult = {
  deltaMs: number;
  absDeltaMs: number;
  isEarly: boolean;
  isExact: boolean; // used for streak
  basePoints: number;
  multiplier: number; // 1 | 1.5 | 2
  roundPoints: number;
  newStreak: number;
};

function computeBasePoints(deltaMs: number) {
  if (deltaMs < 0) return -100;
  const abs = Math.abs(deltaMs);
  if (abs <= 500) return 1000;
  if (abs <= 1000) return 750;
  if (abs <= 2000) return 500;
  if (abs <= 5000) return 250;
  return 0;
}

export function computeRoundScoring(args: {
  deltaMs: number;
  oldStreak: number;
}): ScoringResult {
  const deltaMs = Math.round(args.deltaMs);
  const absDeltaMs = Math.abs(deltaMs);
  const isEarly = deltaMs < 0;
  const isExact = !isEarly && absDeltaMs <= 1000;

  const basePoints = computeBasePoints(deltaMs);
  const newStreak = isExact ? args.oldStreak + 1 : 0;

  const multiplier = newStreak === 2 ? 1.5 : newStreak >= 3 ? 2 : 1;
  const roundPoints = Math.trunc(basePoints * multiplier);

  return {
    deltaMs,
    absDeltaMs,
    isEarly,
    isExact,
    basePoints,
    multiplier,
    roundPoints,
    newStreak,
  };
}

export function computeSeriesSummary(args: { absDeltas: number[]; exactWindowMs: number }) {
  let current = 0;
  let max = 0;
  for (const d of args.absDeltas) {
    if (d <= args.exactWindowMs) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return { maxStreak: max };
}

// Placeholder for future categorization logic (sport/cyber) if you later
// move templates to DB-only configuration.
export function normalizeCategory(_category: string): Category {
  return (_category === "cyber" ? "cyber" : "sport") as Category;
}

