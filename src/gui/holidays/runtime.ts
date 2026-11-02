import { CN_HOLIDAY_DAYS } from "./data";
import { CN_HOLIDAY_SOURCES } from "./meta";
import { getHolidayYears, mergeHolidayDays } from "./parse";
import type { CnHolidayCache, CnHolidayDay } from "./types";

export type HolidayOrigin = "bundled" | "file";

export interface HolidayRuntimeData {
  days: CnHolidayDay[];
  years: number[];
  sources: string[];
  origin: HolidayOrigin;
  updatedAt?: string;
}

/**
 * Merge bundled data with an optional imported file.
 * Imported data wins when both contain the same date.
 */
export function buildHolidayRuntimeData(
  file: CnHolidayCache | null
): HolidayRuntimeData {
  const fileDays = file?.days ?? [];
  const days = mergeHolidayDays(CN_HOLIDAY_DAYS, fileDays);

  const origin: HolidayOrigin = fileDays.length ? "file" : "bundled";

  return {
    days,
    years: getHolidayYears(days),
    sources: [...new Set([...CN_HOLIDAY_SOURCES, ...(file?.sources ?? [])])],
    origin,
    updatedAt: origin === "file" ? file?.updatedAt : undefined,
  };
}
