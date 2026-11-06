import {
  buildHolidayJsonUrl,
  CN_HOLIDAY_JSON_URL_TEMPLATE,
  formatHolidayJsonUrls,
  formatHolidayStatus,
  getBundledHolidayStatus,
  getCnHolidaySettings,
  getHolidayJsonYears,
} from "../holidaysSettings";
import { CN_HOLIDAY_SOURCES } from "../gui/holidays/meta";

describe("getCnHolidaySettings", () => {
  it("points at the status setting instead of hard-coding a year", () => {
    const { label, description } = getCnHolidaySettings();

    expect(label).toBe("Show Chinese Public Holidays");
    expect(description).toContain("Holiday Data Status");
  });
});

describe("formatHolidayStatus", () => {
  it("lists available, bundled and imported years", () => {
    expect(
      formatHolidayStatus({
        years: [2025, 2026, 2027],
        bundledYears: [2025, 2026],
        importedYears: [2027],
        sources: ["https://example.com/2027"],
        origin: "file",
        updatedAt: "2026-11-06T10:00:00.000Z",
        lastImport: {
          at: "2026-11-06T10:00:00",
          ok: true,
          filePath: "/tmp/2027.json",
          fileName: "2027.json",
        },
      })
    ).toBe(
      "Available years: 2025, 2026, 2027 · Bundled: 2025, 2026 · " +
        "Imported: 2027 · Import succeeded at 2026-11-06 10:00 · " +
        "Source: bundled + imported file · Updated: 2026-11-06 · " +
        "URLs: https://example.com/2027"
    );
  });

  it("keeps the failure reason after a restart", () => {
    const status = formatHolidayStatus({
      years: [2025, 2026],
      bundledYears: [2025, 2026],
      importedYears: [],
      sources: [],
      origin: "bundled",
      lastImport: {
        at: "2026-11-06T10:00:00",
        ok: false,
        filePath: "/tmp/broken.json",
        fileName: "broken.json",
        message: "The file is not valid JSON.",
      },
    });

    expect(status).toContain(
      "Import failed at 2026-11-06 10:00: The file is not valid JSON."
    );
    expect(status).toContain("Bundled data still in use");
  });

  it("says previous imported data is still active when a new import fails", () => {
    const status = formatHolidayStatus({
      years: [2025, 2026, 2027],
      bundledYears: [2025, 2026],
      importedYears: [2027],
      sources: [],
      origin: "file",
      lastImport: {
        at: "2026-11-06T10:00:00",
        ok: false,
        filePath: "/tmp/broken.json",
        fileName: "broken.json",
        message: "The file is not valid JSON.",
      },
    });

    expect(status).toContain("Previous data still in use");
  });

  it("describes the bundled data", () => {
    const status = getBundledHolidayStatus();

    expect(status).toContain("Available years: 2025, 2026");
    expect(status).toContain("Bundled: 2025, 2026");
    expect(status).toContain("Imported: none");
    expect(status).toContain("Source: bundled data");
    for (const source of CN_HOLIDAY_SOURCES) {
      expect(status).toContain(source);
    }
  });
});

describe("holiday JSON URLs", () => {
  it("builds a URL for a given year", () => {
    expect(buildHolidayJsonUrl(CN_HOLIDAY_JSON_URL_TEMPLATE, 2027)).toBe(
      "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/2027.json"
    );
  });

  it("includes bundled, current and next year", () => {
    expect(getHolidayJsonYears(2026)).toEqual([2025, 2026, 2027]);
  });

  it("formats every year as a copyable line", () => {
    const text = formatHolidayJsonUrls([2025, 2026, 2027]);

    expect(text).toContain("2025: https://");
    expect(text).toContain("2026: https://");
    expect(text).toContain("2027: https://");
  });
});
