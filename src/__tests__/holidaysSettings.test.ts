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
  it("shows coverage, origin, update date and source URLs", () => {
    expect(
      formatHolidayStatus({
        years: [2025, 2027],
        sources: ["https://example.com/2027"],
        origin: "file",
        updatedAt: "2026-11-06T10:00:00.000Z",
      })
    ).toBe(
      "Coverage: 2025–2027 · Source: imported file · Updated: 2026-11-06 · " +
        "URLs: https://example.com/2027"
    );
  });

  it("labels imported files", () => {
    expect(
      formatHolidayStatus({
        years: [2027],
        sources: [],
        origin: "file",
        updatedAt: "2026-11-06T10:00:00.000Z",
      })
    ).toContain("Source: imported file");
  });

  it("describes the bundled data", () => {
    const status = getBundledHolidayStatus();

    expect(status).toContain("Coverage: 2025–2026");
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
