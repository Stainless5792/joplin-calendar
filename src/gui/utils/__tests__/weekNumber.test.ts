import moment from "moment";
import { WeekStartDay } from "@constants/Settings";
import { getWeekNumberOfRow } from "../weekNumber";

describe("getWeekNumberOfRow", () => {
  it("returns the ISO week for a Monday-start row", () => {
    const info = getWeekNumberOfRow(moment("2026-10-29"), WeekStartDay.Monday);

    expect(info.week).toBe(44);
    expect(info.label).toBe("W44");
    expect(info.spansYears).toBe(false);
  });

  it("uses the row's Thursday for Sunday-start weeks", () => {
    const info = getWeekNumberOfRow(moment("2026-11-01"), WeekStartDay.Sunday);

    expect(info.week).toBe(45);
    expect(info.label).toBe("W45");
  });

  it("gives the same week number to every day in the same row", () => {
    const weekStart = WeekStartDay.Sunday;
    const start = moment("2026-11-01");

    for (let i = 0; i < 7; i++) {
      const info = getWeekNumberOfRow(start.clone().add(i, "days"), weekStart);
      expect(info.label).toBe("W45");
    }
  });

  it("caps week 53 at 52 and shows the year boundary label", () => {
    const info = getWeekNumberOfRow(moment("2027-01-01"), WeekStartDay.Monday);

    expect(info.week).toBe(52);
    expect(info.label).toBe("W52/W1");
    expect(info.spansYears).toBe(true);
  });

  it("shows W52/W1 for a cross-year week 52", () => {
    const info = getWeekNumberOfRow(moment("2022-01-01"), WeekStartDay.Monday);

    expect(info.week).toBe(52);
    expect(info.label).toBe("W52/W1");
    expect(info.spansYears).toBe(true);
  });

  it("shows W1 when a cross-year row belongs to week 1", () => {
    const info = getWeekNumberOfRow(moment("2024-12-30"), WeekStartDay.Monday);

    expect(info.week).toBe(1);
    expect(info.label).toBe("W1");
    expect(info.spansYears).toBe(true);
  });

  it("does not add the boundary label to a normal week 52", () => {
    const info = getWeekNumberOfRow(moment("2026-12-24"), WeekStartDay.Monday);

    expect(info.week).toBe(52);
    expect(info.label).toBe("W52");
    expect(info.spansYears).toBe(false);
  });
});
