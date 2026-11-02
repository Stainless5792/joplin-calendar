import type {
  CnHolidayCache,
  CnHolidayDay,
  CnHolidayInfo,
  CnHolidayYear,
} from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS_PER_YEAR = 400;
const MAX_NAME_LENGTH = 20;

function asDateString(value: unknown, context: string): string {
  const date = String(value ?? "");
  if (!DATE_PATTERN.test(date)) {
    throw new Error(`${context}: invalid date "${date}"`);
  }
  return date;
}

/**
 * Validate one year of holiday-cn data. Empty payloads (for example 2027
 * before the State Council announcement) are rejected on purpose.
 */
export function parseHolidayYear(value: unknown): CnHolidayYear {
  if (!value || typeof value !== "object") {
    throw new Error("Holiday data must be an object");
  }

  const raw = value as Record<string, unknown>;
  const year = Number(raw.year);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid holiday data year: ${String(raw.year)}`);
  }

  if (!Array.isArray(raw.days) || raw.days.length === 0) {
    throw new Error(`No holiday days found for ${year}`);
  }

  if (raw.days.length > MAX_DAYS_PER_YEAR) {
    throw new Error(`Too many holiday days for ${year}`);
  }

  const papers = Array.isArray(raw.papers)
    ? raw.papers.map((paper) => String(paper))
    : [];

  const daysByDate = new Map<string, CnHolidayDay>();

  for (const entry of raw.days) {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid holiday entry for ${year}`);
    }

    const day = entry as Record<string, unknown>;
    const date = asDateString(day.date, `${year}`);
    const name = String(day.name ?? "").trim();

    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new Error(`Invalid holiday name for ${date}`);
    }
    if (typeof day.isOffDay !== "boolean") {
      throw new Error(`Invalid isOffDay for ${date}`);
    }

    const dateYear = Number(date.slice(0, 4));
    const isCrossYearDate =
      dateYear === year - 1 && date.startsWith(`${year - 1}-12`);
    if (dateYear !== year && !isCrossYearDate) {
      throw new Error(`${date} does not belong to ${year}`);
    }

    const existing = daysByDate.get(date);
    if (
      existing &&
      (existing.name !== name || existing.isOffDay !== day.isOffDay)
    ) {
      throw new Error(`Conflicting holiday entries for ${date}`);
    }

    daysByDate.set(date, { name, date, isOffDay: day.isOffDay });
  }

  return {
    year,
    papers,
    days: [...daysByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * Parse a local file: either one year object or an array of year objects.
 */
export function parseHolidayFile(text: string): CnHolidayYear[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error("Holiday file is not valid JSON");
  }

  const entries = Array.isArray(json) ? json : [json];
  if (!entries.length) {
    throw new Error("Holiday file contains no years");
  }

  return entries.map(parseHolidayYear);
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
