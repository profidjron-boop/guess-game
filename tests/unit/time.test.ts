import { describe, expect, it, vi } from "vitest";
import {
  computeDeltaMs,
  computePressTimeMs,
  generateEventTimeMs,
  msToCountdown,
} from "@/lib/game/time";

describe("time utils", () => {
  it("converts milliseconds to countdown format", () => {
    expect(msToCountdown(3400)).toEqual({ seconds: 3, tenths: 4 });
    expect(msToCountdown(-10)).toEqual({ seconds: 0, tenths: 0 });
  });

  it("computes non-negative press time relative to round start", () => {
    const start = "2026-03-23T12:00:00.000Z";
    expect(computePressTimeMs(start, new Date(start).getTime() + 1234)).toBe(1234);
    expect(computePressTimeMs(start, new Date(start).getTime() - 20)).toBe(0);
  });

  it("computes delta correctly", () => {
    expect(computeDeltaMs(4500, 4000)).toBe(500);
    expect(computeDeltaMs(3000, 4000)).toBe(-1000);
  });

  it("generates event time inside allowed bounds", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const value = generateEventTimeMs(10_000);
    expect(value).toBeGreaterThanOrEqual(3000);
    expect(value).toBeLessThan(8500);
    vi.restoreAllMocks();
  });
});
