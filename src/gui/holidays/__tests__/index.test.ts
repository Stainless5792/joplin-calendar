import moment from "moment";
import { getCnHoliday } from "..";

describe("getCnHoliday", () => {
  it("returns the holiday name and off-day flag", () => {
    expect(getCnHoliday(moment("2026-02-17"))).toEqual({
      name: "春节",
      isOffDay: true,
    });
  });

  it("marks make-up workdays", () => {
    expect(getCnHoliday(moment("2026-02-14"))).toEqual({
      name: "春节",
      isOffDay: false,
    });
  });

  it("handles combined holiday names", () => {
    expect(getCnHoliday(moment("2025-10-01"))?.name).toBe("国庆节、中秋节");
  });

  it("returns undefined for ordinary days", () => {
    expect(getCnHoliday(moment("2026-03-02"))).toBeUndefined();
  });

  it("returns undefined for years without data", () => {
    expect(getCnHoliday(moment("2030-10-01"))).toBeUndefined();
  });

  it("matches on the local calendar date", () => {
    // 23:30 local time must not shift to the previous day (UTC) or the next.
    expect(getCnHoliday(moment("2026-02-17 23:30"))?.name).toBe("春节");
  });
});
