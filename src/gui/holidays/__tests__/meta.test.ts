import { CN_HOLIDAY_DAYS } from "../data";
import { CN_HOLIDAY_SOURCES, CN_HOLIDAY_YEARS } from "../meta";

describe("generated holiday metadata", () => {
  it("lists the covered years", () => {
    expect([...CN_HOLIDAY_YEARS]).toEqual([2025, 2026]);
  });

  it("keeps only official sources", () => {
    expect(CN_HOLIDAY_SOURCES.length).toBeGreaterThan(0);
    for (const source of CN_HOLIDAY_SOURCES) {
      expect(source).toMatch(/^https:\/\/www\.gov\.cn\//);
    }
  });

  it("only contains days from the covered years", () => {
    const years = new Set<number>(CN_HOLIDAY_YEARS);
    for (const day of CN_HOLIDAY_DAYS) {
      expect(years.has(Number(day.date.slice(0, 4)))).toBe(true);
    }
  });
});
