import {
  buildHolidayDataManagerButtons,
  buildHolidayDataSummary,
  renderHolidayDataManagerHtml,
  type HolidayDataSummary,
} from "../holidayDataSummary";
import type { CnHolidayCache, CnHolidayDay } from "../gui/holidays/types";

const bundledDays: CnHolidayDay[] = [
  { name: "元旦", date: "2025-01-01", isOffDay: true },
  { name: "春节", date: "2025-01-28", isOffDay: true },
  { name: "春节", date: "2025-01-26", isOffDay: false },
];

const fileCache: CnHolidayCache = {
  days: [
    { name: "元旦", date: "2027-01-01", isOffDay: true },
    { name: "春节", date: "2025-01-28", isOffDay: false },
  ],
  sources: ["https://example.com/2027"],
  fetchedYears: [2027],
  updatedAt: "2026-11-06T10:00:00.000Z",
  fileName: "/tmp/2027.json",
};

function summary(
  overrides: Partial<HolidayDataSummary> = {}
): HolidayDataSummary {
  return {
    ...buildHolidayDataSummary(fileCache, {
      bundledDays,
      bundledSources: ["https://example.com/bundled"],
    }),
    ...overrides,
  };
}

describe("buildHolidayDataSummary", () => {
  it("merges bundled and imported data per year", () => {
    const result = buildHolidayDataSummary(fileCache, {
      bundledDays,
      bundledSources: ["https://example.com/bundled"],
    });

    expect(result.origin).toBe("file");
    expect(result.availableYears).toEqual([2025, 2027]);
    expect(result.bundledYears).toEqual([2025]);
    expect(result.importedYears).toEqual([2025, 2027]);
    expect(result.totalDays).toBe(4);

    expect(result.years).toEqual([
      {
        year: 2025,
        source: "both",
        bundledDays: 3,
        importedDays: 1,
        effectiveDays: 3,
        holidays: 1,
        workdays: 2,
        overriddenDates: 1,
        updatedAt: "2026-11-06T10:00:00.000Z",
        sources: ["https://example.com/bundled", "https://example.com/2027"],
      },
      {
        year: 2027,
        source: "imported",
        bundledDays: 0,
        importedDays: 1,
        effectiveDays: 1,
        holidays: 1,
        workdays: 0,
        overriddenDates: 0,
        updatedAt: "2026-11-06T10:00:00.000Z",
        sources: ["https://example.com/2027"],
      },
    ]);
  });

  it("describes bundled-only data", () => {
    const result = buildHolidayDataSummary(null, {
      bundledDays,
      bundledSources: ["https://example.com/bundled"],
    });

    expect(result.origin).toBe("bundled");
    expect(result.availableYears).toEqual([2025]);
    expect(result.importedYears).toEqual([]);
    expect(result.years[0]).toMatchObject({
      year: 2025,
      source: "bundled",
      bundledDays: 3,
      importedDays: 0,
      effectiveDays: 3,
    });
  });

  it("describes imported-only data", () => {
    const result = buildHolidayDataSummary(fileCache, {
      bundledDays: [],
      bundledSources: [],
    });

    expect(result.origin).toBe("file");
    expect(result.years.map((year) => year.source)).toEqual([
      "imported",
      "imported",
    ]);
    expect(result.totalDays).toBe(2);
  });

  it("passes the last import record through", () => {
    const lastImport = {
      at: "2026-11-06T10:00:00",
      ok: false,
      filePath: "/tmp/broken.json",
      fileName: "broken.json",
      message: "The file is not valid JSON.",
    };

    const result = buildHolidayDataSummary(fileCache, {
      bundledDays,
      lastImport,
    });

    expect(result.lastImport).toEqual(lastImport);
  });
});

describe("renderHolidayDataManagerHtml", () => {
  it("renders the year table and last import status", () => {
    const lastImport = {
      at: "2026-11-06T10:00:00",
      ok: false,
      filePath: "/tmp/broken.json",
      fileName: "broken.json",
      message: "The file is not valid JSON.",
    };
    const html = renderHolidayDataManagerHtml(summary({ lastImport }), {
      filePath: "/tmp/2027.json",
    });

    expect(html).toContain("Holiday Data");
    expect(html).toContain("Available years: 2025, 2027");
    expect(html).toContain("Bundled + Imported");
    expect(html).toContain("Imported");
    expect(html).toContain("Import failed");
    expect(html).toContain("/tmp/2027.json");
    expect(html).toContain("Source URLs");
  });

  it("escapes the current file path", () => {
    const html = renderHolidayDataManagerHtml(summary(), {
      filePath: "/tmp/<script>alert(1)</script>.json",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("shows instructions when no file is selected", () => {
    const html = renderHolidayDataManagerHtml(summary(), {});

    expect(html).toContain("No holiday data file is selected");
  });

  it("sizes the manager through html/body and uses an inner scroll area", () => {
    const html = renderHolidayDataManagerHtml(summary(), {});

    expect(html).not.toContain("70vh");
    expect(html).toContain("width: 760px");
    expect(html).toContain("height: 600px");
    expect(html).toContain('class="jci-scroll"');
  });
});

describe("buildHolidayDataManagerButtons", () => {
  it("offers re-import, clear, copy and close for an imported file", () => {
    expect(
      buildHolidayDataManagerButtons(summary(), true).map((button) => button.id)
    ).toEqual(["reimport", "clear", "copy", "cancel"]);
  });

  it("omits re-import when no file is selected", () => {
    expect(
      buildHolidayDataManagerButtons(summary(), false).map(
        (button) => button.id
      )
    ).toEqual(["clear", "copy", "cancel"]);
  });

  it("omits clear and copy when there is nothing to clear or copy", () => {
    const bundledOnly = buildHolidayDataSummary(null, {
      bundledDays,
      bundledSources: [],
    });

    expect(
      buildHolidayDataManagerButtons(bundledOnly, true).map(
        (button) => button.id
      )
    ).toEqual(["reimport", "cancel"]);
  });
});
