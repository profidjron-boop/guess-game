import { describe, expect, it } from "vitest";
import { computeRoundScoring, computeSeriesSummary } from "@/lib/game/scoring";

describe("score flow integration", () => {
  it("resets streak after early click and resumes correctly", () => {
    const r1 = computeRoundScoring({ deltaMs: 700, oldStreak: 0 }); // exact
    const r2 = computeRoundScoring({ deltaMs: -120, oldStreak: r1.newStreak }); // early
    const r3 = computeRoundScoring({ deltaMs: 500, oldStreak: r2.newStreak }); // exact

    expect(r1.newStreak).toBe(1);
    expect(r2.newStreak).toBe(0);
    expect(r3.newStreak).toBe(1);
  });

  it("computes series max streak from absolute deltas", () => {
    const summary = computeSeriesSummary({
      absDeltas: [300, 700, 1500, 900, 600],
      exactWindowMs: 1000,
    });
    expect(summary.maxStreak).toBe(2);
  });
});
