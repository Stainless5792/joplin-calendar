import moment from "moment";
import { WeekStartDay } from "@constants/Settings";

export interface CalendarWindow {
  start: moment.Moment;
  end: moment.Moment;
}

const CALENDAR_ROWS = 6;
const DAYS_IN_A_WEEK = 7;
const WINDOW_DAYS = CALENDAR_ROWS * DAYS_IN_A_WEEK;

export function startOfWeek(
  date: moment.Moment,
  weekStartDay: WeekStartDay
): moment.Moment {
  return weekStartDay === WeekStartDay.Monday
    ? date.clone().isoWeekday(1)
    : date.clone().day(0);
}

/**
 * The existing month grid: start at the week containing the first of the
 * month, then render six rows.
 */
export function getMonthWindow(
  shownMonth: moment.Moment,
  weekStartDay: WeekStartDay
): CalendarWindow {
  const start = startOfWeek(shownMonth.clone().startOf("month"), weekStartDay);

  return {
    start,
    end: start.clone().add(WINDOW_DAYS - 1, "days"),
  };
}

/**
 * The look-ahead grid: one previous week, the anchor week, and four future
 * weeks.
 */
export function getRollingWindow(
  anchorDate: moment.Moment,
  weekStartDay: WeekStartDay
): CalendarWindow {
  const start = startOfWeek(anchorDate, weekStartDay).subtract(1, "week");

  return {
    start,
    end: start.clone().add(WINDOW_DAYS - 1, "days"),
  };
}

/** Every calendar month touched by the window, as month-start moments. */
export function getWindowMonths(window: CalendarWindow): moment.Moment[] {
  const months: moment.Moment[] = [];
  const lastMonth = window.end.clone().startOf("month");
  const current = window.start.clone().startOf("month");

  while (!current.isAfter(lastMonth, "month")) {
    months.push(current.clone());
    current.add(1, "month");
  }

  return months;
}
