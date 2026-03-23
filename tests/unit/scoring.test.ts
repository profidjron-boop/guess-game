import { describe, expect, it } from "vitest";
import { computeRoundScoring } from "@/lib/game/scoring";

describe("computeRoundScoring", () => {
  it("returns early penalty for negative delta", () => {
    const result = computeRoundScoring({ deltaMs: -100, oldStreak: 2 });
    expect(result.basePoints).toBe(-100);
    expect(result.isEarly).toBe(true);
    expect(result.newStreak).toBe(0);
    expect(result.multiplier).toBe(1);
    expect(result.roundPoints).toBe(-100);
  });

  it("applies x1.5 multiplier on second exact hit", () => {
    const result = computeRoundScoring({ deltaMs: 800, oldStreak: 1 });
    expect(result.isExact).toBe(true);
    expect(result.newStreak).toBe(2);
    expect(result.basePoints).toBe(750);
    expect(result.multiplier).toBe(1.5);
    expect(result.roundPoints).toBe(1125);
  });

  it("applies x2 multiplier on third exact hit", () => {
    const result = computeRoundScoring({ deltaMs: 400, oldStreak: 2 });
    expect(result.newStreak).toBe(3);
    expect(result.multiplier).toBe(2);
    expect(result.roundPoints).toBe(2000);
  });
});
