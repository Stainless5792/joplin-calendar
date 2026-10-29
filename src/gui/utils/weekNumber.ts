import moment from "moment";
import { WeekStartDay } from "@constants/Settings";

export interface WeekNumberInfo {
  /** Week number, capped at 52. */
  week: number;
  /** Compact label shown in the calendar header, e.g. "W44" or "W52/W1". */
  label: string;
  /** Accessible description of the label. */
  title: string;
  /** Whether the calendar row contains days from two calendar years. */
  spansYears: boolean;
}

/**
 * Get the ISO-8601 week number for the calendar row containing `date`.
 *
 * ISO weeks are Monday-based. Using the Thursday of the row as the anchor
 * makes the number stable for both Monday- and Sunday-start calendars: the
 * Thursday always belongs to the ISO week that owns the row's Monday-Saturday
 * days, so every day in the same row reports the same week.
 *
 * The number is capped at 52. A year-crossing row in the last week of the
 * year is displayed as "W52/W1".
 */
export function getWeekNumberOfRow(
  date: moment.Moment,
  weekStartDay: WeekStartDay
): WeekNumberInfo {
  const mondayStart = weekStartDay === WeekStartDay.Monday;

  const rowStart = mondayStart
    ? date.clone().isoWeekday(1)
    : date.clone().day(0);
  const rowEnd = rowStart.clone().add(6, "days");

  const anchor = rowStart.clone().add(mondayStart ? 3 : 4, "days");
  const week = Math.min(anchor.isoWeek(), 52);
  const spansYears = rowStart.year() !== rowEnd.year();

  if (spansYears && week === 52) {
    return {
      week,
      label: "W52/W1",
      title: "Year boundary week (week 52 / week 1)",
      spansYears,
    };
  }

  return {
    week,
    label: `W${week}`,
    title: `ISO week ${week}`,
    spansYears,
  };
}
