import { describe, expect, it } from "vitest";
import { matchCatalogCategoryToSportCyber } from "@/lib/matches/catalog";

describe("matchCatalogCategoryToSportCyber", () => {
  it("maps hockey to sport", () => {
    expect(matchCatalogCategoryToSportCyber("hockey")).toBe("sport");
  });
  it("maps cs2 to cyber", () => {
    expect(matchCatalogCategoryToSportCyber("cs2")).toBe("cyber");
  });
  it("returns null for unknown", () => {
    expect(matchCatalogCategoryToSportCyber("weird")).toBe(null);
  });
  it("returns null for empty", () => {
    expect(matchCatalogCategoryToSportCyber(null)).toBe(null);
  });
});
