import { describe, expect, it } from "vitest";
import { formatUnknownError } from "@/lib/formatError";

describe("formatUnknownError", () => {
  it("plain message string", () => {
    expect(formatUnknownError("oops")).toBe("oops");
  });

  it("Error instance", () => {
    expect(formatUnknownError(new Error("boom"))).toBe("boom");
  });

  it("object with message (no instanceof Error)", () => {
    expect(formatUnknownError({ message: "too_late" })).toBe("too_late");
  });

  it("nested error", () => {
    expect(formatUnknownError({ error: { message: "nested" } })).toBe("nested");
  });

  it("falls back to JSON for unknown shapes", () => {
    const s = formatUnknownError({ foo: 1 });
    expect(s).toContain("foo");
  });
});
