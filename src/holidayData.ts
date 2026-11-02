import joplin from "api";
import { CN_HOLIDAY_FILE_CACHE, CN_HOLIDAY_STATUS } from "@constants/Settings";
import {
  getHolidayYears,
  mergeHolidayDays,
  parseHolidayCache,
  parseHolidayFile,
} from "./gui/holidays/parse";
import type { CnHolidayCache } from "./gui/holidays/types";
import { CN_HOLIDAY_SOURCES, CN_HOLIDAY_YEARS } from "./gui/holidays/meta";
import {
  formatHolidayStatus,
  getBundledHolidayStatus,
} from "./holidaysSettings";
import type { HolidayOrigin } from "./gui/holidays/runtime";

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Recompute the "Holiday Data Status" setting from the imported file, falling
 * back to the bundled data.
 */
export async function refreshHolidayStatus(): Promise<string> {
  const file = parseHolidayCache(
    await joplin.settings.value(CN_HOLIDAY_FILE_CACHE)
  );

  const fileDays = file?.days ?? [];
  const origin: HolidayOrigin = fileDays.length ? "file" : "bundled";

  const status = formatHolidayStatus({
    years: uniqueNumbers([...CN_HOLIDAY_YEARS, ...getHolidayYears(fileDays)]),
    sources: [...new Set([...CN_HOLIDAY_SOURCES, ...(file?.sources ?? [])])],
    origin,
    updatedAt: origin === "file" ? file?.updatedAt : undefined,
  });

  await joplin.settings.setValue(CN_HOLIDAY_STATUS, status);
  return status;
}

export async function getHolidayData() {
  const fileCache = await joplin.settings.value(CN_HOLIDAY_FILE_CACHE);
  return { fileCache };
}

/**
 * Read and validate a holiday JSON file selected in the settings.
 *
 * Use `""` to clear the imported data. Invalid files leave the previous data
 * untouched and surface the error in the status setting.
 */
export async function importHolidayFile(
  filePath: string
): Promise<CnHolidayCache | null> {
  if (!filePath) {
    await joplin.settings.setValue(CN_HOLIDAY_FILE_CACHE, "");
    await refreshHolidayStatus();
    return null;
  }

  try {
    const fs = joplin.require("fs-extra");
    const text = fs.readFileSync(filePath, "utf8");
    const years = parseHolidayFile(text);
    const days = mergeHolidayDays(...years.map((year) => year.days));

    const cache: CnHolidayCache = {
      days,
      sources: [
        ...new Set(years.flatMap((year) => year.papers).filter(Boolean)),
      ],
      fetchedYears: years.map((year) => year.year),
      updatedAt: new Date().toISOString(),
      fileName: filePath,
    };

    await joplin.settings.setValue(
      CN_HOLIDAY_FILE_CACHE,
      JSON.stringify(cache)
    );
    await refreshHolidayStatus();
    return cache;
  } catch (error) {
    await joplin.settings.setValue(
      CN_HOLIDAY_STATUS,
      `Import failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

export function getInitialHolidayStatus(): string {
  return getBundledHolidayStatus();
}
