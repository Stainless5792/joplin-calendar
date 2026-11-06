import type {
  CnHolidayCache,
  CnHolidayDay,
  CnHolidayInfo,
  CnHolidayYear,
} from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS_PER_YEAR = 400;
const MAX_YEARS = 50;
const MAX_NAME_LENGTH = 20;

export type HolidayParseErrorCode =
  | "json.invalid"
  | "json.rootInvalid"
  | "years.empty"
  | "years.tooMany"
  | "year.duplicate"
  | "year.invalid"
  | "year.noDays"
  | "year.tooManyDays"
  | "day.invalid"
  | "day.dateInvalid"
  | "day.dateInvalidCalendar"
  | "day.nameInvalid"
  | "day.isOffDayInvalid"
  | "day.yearMismatch"
  | "day.conflict";

export interface HolidayParseErrorContext {
  year?: number;
  date?: string;
  entryIndex?: number;
  field?: string;
  line?: number;
  column?: number;
}

export class HolidayParseError extends Error {
  constructor(
    public readonly code: HolidayParseErrorCode,
    message: string,
    public readonly context: HolidayParseErrorContext = {}
  ) {
    super(message);
    this.name = "HolidayParseError";
  }
}

function isValidCalendarDate(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function asDateString(
  value: unknown,
  year: number,
  entryIndex: number
): string {
  const date = String(value ?? "");
  if (!DATE_PATTERN.test(date)) {
    throw new HolidayParseError(
      "day.dateInvalid",
      `Year ${year}, entry ${entryIndex + 1}: invalid date "${date}"`,
      { year, entryIndex, field: "date" }
    );
  }
  if (!isValidCalendarDate(date)) {
    throw new HolidayParseError(
      "day.dateInvalidCalendar",
      `Year ${year}, entry ${entryIndex + 1}: invalid date "${date}"`,
      { year, entryIndex, field: "date" }
    );
  }
  return date;
}

/**
 * Validate one year of holiday-cn data. Empty payloads (for example 2027
 * before the State Council announcement) are rejected on purpose.
 */
export function parseHolidayYear(value: unknown): CnHolidayYear {
  if (!value || typeof value !== "object") {
    throw new HolidayParseError(
      "json.rootInvalid",
      "Holiday data must be an object"
    );
  }

  const raw = value as Record<string, unknown>;
  const year = Number(raw.year);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new HolidayParseError(
      "year.invalid",
      `Invalid holiday data year: ${String(raw.year)}`,
      { field: "year" }
    );
  }

  if (!Array.isArray(raw.days) || raw.days.length === 0) {
    throw new HolidayParseError(
      "year.noDays",
      `No holiday days found for ${year}`,
      { year }
    );
  }

  if (raw.days.length > MAX_DAYS_PER_YEAR) {
    throw new HolidayParseError(
      "year.tooManyDays",
      `Too many holiday days for ${year}`,
      { year }
    );
  }

  const papers = Array.isArray(raw.papers)
    ? raw.papers.map((paper) => String(paper))
    : [];

  const daysByDate = new Map<string, CnHolidayDay>();

  raw.days.forEach((entry, entryIndex) => {
    if (!entry || typeof entry !== "object") {
      throw new HolidayParseError(
        "day.invalid",
        `Invalid holiday entry for ${year}`,
        { year, entryIndex }
      );
    }

    const day = entry as Record<string, unknown>;
    const date = asDateString(day.date, year, entryIndex);
    const name = String(day.name ?? "").trim();

    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new HolidayParseError(
        "day.nameInvalid",
        `Invalid holiday name for ${date}`,
        { year, date, entryIndex, field: "name" }
      );
    }
    if (typeof day.isOffDay !== "boolean") {
      throw new HolidayParseError(
        "day.isOffDayInvalid",
        `Invalid isOffDay for ${date}`,
        { year, date, entryIndex, field: "isOffDay" }
      );
    }

    const dateYear = Number(date.slice(0, 4));
    const isCrossYearDate =
      dateYear === year - 1 && date.startsWith(`${year - 1}-12`);
    if (dateYear !== year && !isCrossYearDate) {
      throw new HolidayParseError(
        "day.yearMismatch",
        `${date} does not belong to ${year}`,
        { year, date, entryIndex, field: "date" }
      );
    }

    const existing = daysByDate.get(date);
    if (
      existing &&
      (existing.name !== name || existing.isOffDay !== day.isOffDay)
    ) {
      throw new HolidayParseError(
        "day.conflict",
        `Conflicting holiday entries for ${date}`,
        { year, date, entryIndex }
      );
    }

    daysByDate.set(date, { name, date, isOffDay: day.isOffDay });
  });

  return {
    year,
    papers,
    days: [...daysByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

interface JsonErrorPosition {
  line?: number;
  column?: number;
}

function getJsonErrorPosition(text: string, error: unknown): JsonErrorPosition {
  const message = error instanceof Error ? error.message : String(error);
  const lineColumnMatch = /line (\d+) column (\d+)/i.exec(message);
  if (lineColumnMatch) {
    return {
      line: Number(lineColumnMatch[1]),
      column: Number(lineColumnMatch[2]),
    };
  }

  const positionMatch = /position (\d+)/i.exec(message);
  if (!positionMatch) {
    return {};
  }

  const position = Number(positionMatch[1]);
  const before = text.slice(0, position);
  const lastLineBreak = Math.max(
    before.lastIndexOf("\n"),
    before.lastIndexOf("\r")
  );

  return {
    line: before.split(/\r\n|\r|\n/).length,
    column: position - lastLineBreak,
  };
}

/**
 * Parse a local file: either one year object or an array of year objects.
 */
export function parseHolidayFile(text: string): CnHolidayYear[] {
  const normalizedText = text.replace(/^\uFEFF/, "");
  let json: unknown;
  try {
    json = JSON.parse(normalizedText);
  } catch (error) {
    throw new HolidayParseError(
      "json.invalid",
      "Holiday file is not valid JSON",
      getJsonErrorPosition(normalizedText, error)
    );
  }

  const entries = Array.isArray(json) ? json : [json];
  if (!entries.length) {
    throw new HolidayParseError(
      "years.empty",
      "Holiday file contains no years"
    );
  }
  if (entries.length > MAX_YEARS) {
    throw new HolidayParseError(
      "years.tooMany",
      `Holiday file contains too many years (max ${MAX_YEARS})`
    );
  }

  const years = entries.map(parseHolidayYear);
  const seenYears = new Set<number>();

  for (const year of years) {
    if (seenYears.has(year.year)) {
      throw new HolidayParseError(
        "year.duplicate",
        `Holiday file contains duplicate year ${year.year}`,
        { year: year.year }
      );
    }
    seenYears.add(year.year);
  }

  return years;
}

export function parseHolidayCache(value: unknown): CnHolidayCache | null {
  let json: unknown = value;

  if (typeof value === "string") {
    if (!value.trim()) {
      return null;
    }
    try {
      json = JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  if (!json || typeof json !== "object") {
    return null;
  }

  const raw = json as Record<string, unknown>;

  if (!Array.isArray(raw.days)) {
    return null;
  }

  const days: CnHolidayDay[] = [];

  for (const entry of raw.days) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const day = entry as Record<string, unknown>;
    if (
      typeof day.name !== "string" ||
      !day.name ||
      typeof day.date !== "string" ||
      !DATE_PATTERN.test(day.date) ||
      typeof day.isOffDay !== "boolean"
    ) {
      return null;
    }
    days.push({
      name: day.name,
      date: day.date,
      isOffDay: day.isOffDay,
    });
  }

  return {
    days,
    sources: Array.isArray(raw.sources)
      ? raw.sources.map((source) => String(source))
      : [],
    fetchedYears: Array.isArray(raw.fetchedYears)
      ? raw.fetchedYears
          .map((year) => Number(year))
          .filter((year) => Number.isInteger(year))
      : [],
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    fileName: typeof raw.fileName === "string" ? raw.fileName : undefined,
  };
}

/** Merge day lists by date; later lists win. */
export function mergeHolidayDays(...groups: CnHolidayDay[][]): CnHolidayDay[] {
  const byDate = new Map<string, CnHolidayDay>();

  for (const group of groups) {
    for (const day of group) {
      byDate.set(day.date, day);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getHolidayYears(days: CnHolidayDay[]): number[] {
  return [...new Set(days.map((day) => Number(day.date.slice(0, 4))))].sort(
    (a, b) => a - b
  );
}

export function createHolidayIndex(
  days: CnHolidayDay[]
): Map<string, CnHolidayInfo> {
  return new Map(
    days.map((day) => [day.date, { name: day.name, isOffDay: day.isOffDay }])
  );
}
