import joplin from "api";
import {
  CN_HOLIDAY_FILE,
  CN_HOLIDAY_FILE_CACHE,
  CN_HOLIDAY_LAST_IMPORT,
  CN_HOLIDAY_STATUS,
} from "@constants/Settings";
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
import {
  HolidayImportError,
  buildLastImportRecord,
  parseLastImport,
  type HolidayImportOutcome,
} from "./holidayImportReport";

export const MAX_HOLIDAY_FILE_BYTES = 2 * 1024 * 1024;

const FILE_SYSTEM_ERROR_CODES = new Set([
  "ENOENT",
  "EACCES",
  "EPERM",
  "EISDIR",
  "EMFILE",
  "ENFILE",
]);

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mapFileSystemError(error: unknown): unknown {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  const message = error instanceof Error ? error.message : String(error);

  if (code && FILE_SYSTEM_ERROR_CODES.has(code)) {
    switch (code) {
      case "ENOENT":
        return new HolidayImportError("file.notFound", message);
      case "EACCES":
      case "EPERM":
        return new HolidayImportError("file.permission", message);
      case "EISDIR":
        return new HolidayImportError("file.isDirectory", message);
      default:
        return new HolidayImportError("file.unreadable", message);
    }
  }

  if (code && /^E[A-Z]+$/.test(code)) {
    return new HolidayImportError("file.unreadable", message);
  }

  return error;
}

/**
 * Recompute the "Holiday Data Status" setting from the imported file, falling
 * back to the bundled data.
 */
export async function refreshHolidayStatus(): Promise<string> {
  const file = parseHolidayCache(
    await joplin.settings.value(CN_HOLIDAY_FILE_CACHE)
  );
  const lastImport = parseLastImport(
    await joplin.settings.value(CN_HOLIDAY_LAST_IMPORT)
  );

  const fileDays = file?.days ?? [];
  const importedYears = getHolidayYears(fileDays);
  const bundledYears = [...CN_HOLIDAY_YEARS];
  const origin: HolidayOrigin = fileDays.length ? "file" : "bundled";

  const status = formatHolidayStatus({
    years: uniqueNumbers([...bundledYears, ...importedYears]),
    bundledYears,
    importedYears,
    sources: [...new Set([...CN_HOLIDAY_SOURCES, ...(file?.sources ?? [])])],
    origin,
    updatedAt: origin === "file" ? file?.updatedAt : undefined,
    lastImport,
  });

  await joplin.settings.setValue(CN_HOLIDAY_STATUS, status);
  return status;
}

export async function getHolidayData() {
  const fileCache = await joplin.settings.value(CN_HOLIDAY_FILE_CACHE);
  return { fileCache };
}

async function setLastImportRecord(
  outcome: HolidayImportOutcome,
  at?: string
): Promise<void> {
  await joplin.settings.setValue(
    CN_HOLIDAY_LAST_IMPORT,
    JSON.stringify(buildLastImportRecord(outcome, at))
  );
}

/**
 * Clear both the selected path and the imported data, then fall back to the
 * bundled schedule.
 */
export async function clearImportedHolidayData(): Promise<void> {
  const outcome: HolidayImportOutcome = { status: "cleared" };

  await joplin.settings.setValue(CN_HOLIDAY_FILE, "");
  await joplin.settings.setValue(CN_HOLIDAY_FILE_CACHE, "");
  await setLastImportRecord(outcome);
  await refreshHolidayStatus();
}

/**
 * Read and validate a holiday JSON file selected in the settings.
 *
 * Use `""` to clear the imported data. Invalid files leave the previous data
 * untouched and surface the error in the status setting.
 */
export async function importHolidayFile(
  filePath: string
): Promise<HolidayImportOutcome> {
  if (!filePath) {
    const outcome: HolidayImportOutcome = { status: "cleared" };

    await joplin.settings.setValue(CN_HOLIDAY_FILE_CACHE, "");
    await setLastImportRecord(outcome);
    await refreshHolidayStatus();
    return outcome;
  }

  try {
    const fs = joplin.require("fs-extra");
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) {
      throw new HolidayImportError(
        "file.isDirectory",
        `Selected path is not a file: ${filePath}`
      );
    }

    if (stat.size > MAX_HOLIDAY_FILE_BYTES) {
      throw new HolidayImportError(
        "file.tooLarge",
        `File is ${formatBytes(stat.size)}; limit is ${formatBytes(
          MAX_HOLIDAY_FILE_BYTES
        )}`
      );
    }

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

    const outcome: HolidayImportOutcome = {
      status: "success",
      filePath,
      years,
      cache,
    };

    await joplin.settings.setValue(
      CN_HOLIDAY_FILE_CACHE,
      JSON.stringify(cache)
    );
    await setLastImportRecord(outcome, cache.updatedAt);
    await refreshHolidayStatus();
    return outcome;
  } catch (error) {
    const importError = mapFileSystemError(error);
    const previousCache = parseHolidayCache(
      await joplin.settings.value(CN_HOLIDAY_FILE_CACHE)
    );
    const outcome: HolidayImportOutcome = {
      status: "error",
      filePath,
      error: importError,
      previousCache,
    };

    await setLastImportRecord(outcome);
    await refreshHolidayStatus();
    return outcome;
  }
}

export function getInitialHolidayStatus(): string {
  return getBundledHolidayStatus();
}
