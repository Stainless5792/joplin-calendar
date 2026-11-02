import { CN_HOLIDAY_SOURCES } from "../meta";
import { buildHolidayRuntimeData } from "../runtime";
import type { CnHolidayCache } from "../types";

function cache(
  days: CnHolidayCache["days"],
  sources: string[] = []
): CnHolidayCache {
  return {
    days,
    sources,
    fetchedYears: [2027],
    updatedAt: "2026-11-06T10:00:00.000Z",
  };
}

describe("buildHolidayRuntimeData", () => {
  it("falls back to bundled data", () => {
    const data = buildHolidayRuntimeData(null);

    expect(data.origin).toBe("bundled");
    expect(data.years).toContain(2025);
    expect(data.years).toContain(2026);
    expect(data.sources).toEqual([...CN_HOLIDAY_SOURCES]);
    expect(data.updatedAt).toBeUndefined();
  });

  it("adds imported years and marks the origin as file", () => {
    const data = buildHolidayRuntimeData(
      cache(
        [{ name: "元旦", date: "2027-01-01", isOffDay: true }],
        ["https://example.com/2027"]
      )
    );

    expect(data.origin).toBe("file");
    expect(data.years).toContain(2027);
    expect(data.updatedAt).toBe("2026-11-06T10:00:00.000Z");
    expect(data.sources).toContain("https://example.com/2027");
  });

  it("lets an imported file override bundled data", () => {
    const data = buildHolidayRuntimeData(
      cache([{ name: "春节", date: "2026-02-17", isOffDay: false }])
    );

    expect(data.days.find((day) => day.date === "2026-02-17")).toEqual({
      name: "春节",
      date: "2026-02-17",
      isOffDay: false,
    });
  });
});
