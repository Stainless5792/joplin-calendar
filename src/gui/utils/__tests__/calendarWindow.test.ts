import moment from "moment";
import { WeekStartDay } from "@constants/Settings";
import {
  getMonthWindow,
  getRollingWindow,
  getWindowMonths,
} from "../calendarWindow";

describe("getRollingWindow", () => {
  it("starts one week before the anchor week with Monday start", () => {
    const window = getRollingWindow(moment("2026-11-06"), WeekStartDay.Monday);

    expect(window.start.format("YYYY-MM-DD")).toBe("2026-10-26");
    expect(window.end.format("YYYY-MM-DD")).toBe("2026-12-06");
  });

  it("starts one week before the anchor week with Sunday start", () => {
    const window = getRollingWindow(moment("2026-11-06"), WeekStartDay.Sunday);

    expect(window.start.format("YYYY-MM-DD")).toBe("2026-10-25");
    expect(window.end.format("YYYY-MM-DD")).toBe("2026-12-05");
  });

  it("handles a year boundary", () => {
    const window = getRollingWindow(moment("2025-12-31"), WeekStartDay.Monday);

    expect(window.start.format("YYYY-MM-DD")).toBe("2025-12-22");
    expect(window.end.format("YYYY-MM-DD")).toBe("2026-02-01");
  });
});

describe("getMonthWindow", () => {
  it("keeps the existing May 2023 Sunday grid", () => {
    const window = getMonthWindow(moment("2023-05-29"), WeekStartDay.Sunday);

    expect(window.start.format("YYYY-MM-DD")).toBe("2023-04-30");
    expect(window.end.format("YYYY-MM-DD")).toBe("2023-06-10");
  });

  it("keeps the existing May 2023 Monday grid", () => {
    const window = getMonthWindow(moment("2023-05-29"), WeekStartDay.Monday);

    expect(window.start.format("YYYY-MM-DD")).toBe("2023-05-01");
    expect(window.end.format("YYYY-MM-DD")).toBe("2023-06-11");
  });
});

describe("getWindowMonths", () => {
  it("returns each month touched by the window", () => {
    const window = getRollingWindow(moment("2026-11-06"), WeekStartDay.Monday);

    expect(
      getWindowMonths(window).map((month) => month.format("YYYY-MM"))
    ).toEqual(["2026-10", "2026-11", "2026-12"]);
  });

  it("includes three months around a year boundary", () => {
    const window = getRollingWindow(moment("2025-12-31"), WeekStartDay.Monday);

    expect(
      getWindowMonths(window).map((month) => month.format("YYYY-MM"))
    ).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});
