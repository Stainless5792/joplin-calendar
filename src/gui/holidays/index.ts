import type moment from "moment";
import { CN_HOLIDAY_DAYS } from "./data";
import { createHolidayIndex } from "./parse";
import type { CnHolidayDay, CnHolidayInfo } from "./types";

export type CnHolidayLookup = (
  date: moment.Moment
) => CnHolidayInfo | undefined;

const bundledIndex = createHolidayIndex(CN_HOLIDAY_DAYS);

/**
 * Look up the bundled Chinese public holiday schedule for a day.
 *
 * Uses the local calendar date: never format with `toISOString()`, which would
 * shift the date in timezones ahead of UTC.
 */
export function getCnHoliday(date: moment.Moment): CnHolidayInfo | undefined {
  return bundledIndex.get(date.format("YYYY-MM-DD"));
}

/**
 * Build a lookup for runtime data (bundled + cached remote + imported file).
 */
export function createHolidayLookup(days: CnHolidayDay[]): CnHolidayLookup {
  const index = createHolidayIndex(days);
  return (date) => index.get(date.format("YYYY-MM-DD"));
}
