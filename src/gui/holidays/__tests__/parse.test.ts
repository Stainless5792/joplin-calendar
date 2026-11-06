import {
  getHolidayYears,
  mergeHolidayDays,
  parseHolidayCache,
  parseHolidayFile,
  parseHolidayYear,
} from "../parse";

const springFestival = {
  year: 2026,
  papers: ["https://www.gov.cn/example"],
  days: [
    { name: "春节", date: "2026-02-14", isOffDay: false },
    { name: "春节", date: "2026-02-17", isOffDay: true },
  ],
};

describe("parseHolidayYear", () => {
  it("accepts valid holiday-cn data", () => {
    expect(parseHolidayYear(springFestival)).toEqual(springFestival);
  });

  it("sorts days by date", () => {
    const parsed = parseHolidayYear({
      ...springFestival,
      days: [...springFestival.days].reverse(),
    });

    expect(parsed.days.map((day) => day.date)).toEqual([
      "2026-02-14",
      "2026-02-17",
    ]);
  });

  it("rejects empty years, such as an unpublished schedule", () => {
    expect(() =>
      parseHolidayYear({ year: 2027, papers: [], days: [] })
    ).toThrow("No holiday days found for 2027");
  });

  it("rejects invalid dates", () => {
    expect(() =>
      parseHolidayYear({
        ...springFestival,
        days: [{ name: "春节", date: "2026-2-17", isOffDay: true }],
      })
    ).toThrow("invalid date");
  });

  it("rejects days from a different year", () => {
    expect(() =>
      parseHolidayYear({
        ...springFestival,
        days: [{ name: "春节", date: "2025-02-17", isOffDay: true }],
      })
    ).toThrow("does not belong to 2026");
  });

  it("accepts December dates carried over from the previous year", () => {
    const parsed = parseHolidayYear({
      year: 2027,
      papers: ["https://www.gov.cn/example"],
      days: [{ name: "元旦", date: "2026-12-31", isOffDay: true }],
    });

    expect(parsed.days[0].date).toBe("2026-12-31");
  });

  it("rejects conflicting duplicates", () => {
    expect(() =>
      parseHolidayYear({
        ...springFestival,
        days: [
          { name: "春节", date: "2026-02-17", isOffDay: true },
          { name: "春节", date: "2026-02-17", isOffDay: false },
        ],
      })
    ).toThrow("Conflicting holiday entries");
  });

  it("rejects dates that do not exist on the calendar", () => {
    expect(() =>
      parseHolidayYear({
        ...springFestival,
        days: [{ name: "春节", date: "2026-02-30", isOffDay: true }],
      })
    ).toThrow("invalid date");
  });

  it("attaches a stable error code and field context", () => {
    try {
      parseHolidayYear({
        ...springFestival,
        days: [{ name: "春节", date: "2026-2-17", isOffDay: true }],
      });
      throw new Error("Expected parseHolidayYear to throw");
    } catch (error) {
      expect(error).toMatchObject({
        code: "day.dateInvalid",
        context: { year: 2026, entryIndex: 0, field: "date" },
      });
    }
  });
});

describe("parseHolidayFile", () => {
  it("accepts a single year object", () => {
    expect(parseHolidayFile(JSON.stringify(springFestival))).toHaveLength(1);
  });

  it("accepts a UTF-8 BOM", () => {
    expect(
      parseHolidayFile(`\uFEFF${JSON.stringify(springFestival)}`)
    ).toHaveLength(1);
  });

  it("accepts an array of years", () => {
    const parsed = parseHolidayFile(
      JSON.stringify([
        springFestival,
        {
          year: 2027,
          papers: [],
          days: [{ name: "元旦", date: "2027-01-01", isOffDay: true }],
        },
      ])
    );

    expect(parsed.map((year) => year.year)).toEqual([2026, 2027]);
  });

  it("rejects the same year declared more than once", () => {
    expect(() =>
      parseHolidayFile(JSON.stringify([springFestival, springFestival]))
    ).toThrow("duplicate year");
  });

  it("rejects invalid JSON", () => {
    expect(() => parseHolidayFile("{not json")).toThrow("not valid JSON");
  });

  it("reports the JSON syntax error position", () => {
    try {
      parseHolidayFile('{\n  "year": 2026,\n  "days": [\n  ]\n}extra');
      throw new Error("Expected parseHolidayFile to throw");
    } catch (error) {
      expect(error).toMatchObject({ code: "json.invalid" });
      expect((error as { context?: { line?: number } }).context?.line).toBe(5);
    }
  });
});

describe("parseHolidayCache", () => {
  it("returns null for empty or invalid values", () => {
    expect(parseHolidayCache("")).toBeNull();
    expect(parseHolidayCache("{}")).toBeNull();
    expect(parseHolidayCache("{not json")).toBeNull();
  });

  it("parses a serialized cache", () => {
    const cache = {
      days: springFestival.days,
      sources: springFestival.papers,
      fetchedYears: [2026],
      updatedAt: "2026-11-06T10:00:00.000Z",
    };

    expect(parseHolidayCache(JSON.stringify(cache))).toEqual(cache);
  });
});

describe("mergeHolidayDays", () => {
  it("lets later sources override earlier ones by date", () => {
    const merged = mergeHolidayDays(
      [{ name: "旧名称", date: "2026-02-17", isOffDay: true }],
      [{ name: "春节", date: "2026-02-17", isOffDay: false }]
    );

    expect(merged).toEqual([
      { name: "春节", date: "2026-02-17", isOffDay: false },
    ]);
  });

  it("derives the covered years", () => {
    expect(
      getHolidayYears([
        { name: "元旦", date: "2025-01-01", isOffDay: true },
        { name: "春节", date: "2026-02-17", isOffDay: true },
      ])
    ).toEqual([2025, 2026]);
  });
});
