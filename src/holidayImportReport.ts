import { CN_HOLIDAY_YEARS } from "./gui/holidays/meta";
import { getHolidayYears } from "./gui/holidays/parse";
import type { CnHolidayCache, CnHolidayYear } from "./gui/holidays/types";
import { formatDateTime, formatYearRange } from "./holidayFormat";

export type HolidayImportErrorCode =
  | "file.notFound"
  | "file.permission"
  | "file.isDirectory"
  | "file.tooLarge"
  | "file.unreadable";

export class HolidayImportError extends Error {
  constructor(public readonly code: HolidayImportErrorCode, message: string) {
    super(message);
    this.name = "HolidayImportError";
  }
}

export type HolidayImportOutcome =
  | {
      status: "success";
      filePath: string;
      years: CnHolidayYear[];
      cache: CnHolidayCache;
    }
  | { status: "cleared" }
  | {
      status: "error";
      filePath: string;
      error: unknown;
      previousCache: CnHolidayCache | null;
    };

export interface HolidayLastImport {
  at: string;
  ok: boolean;
  filePath: string;
  fileName: string;
  cleared?: boolean;
  code?: string;
  message?: string;
  details?: string;
  line?: number;
  column?: number;
  years?: number[];
}

export interface HolidayImportYearRow {
  year: number;
  days: number;
  offDays: number;
  workdays: number;
  papers: number;
}

export interface HolidayImportReport {
  kind: "success" | "error";
  filePath: string;
  fileName: string;
  title: string;
  summary?: {
    years: number;
    days: number;
    offDays: number;
    workdays: number;
  };
  coverage?: string;
  yearRows?: HolidayImportYearRow[];
  importedAt?: string;
  warnings?: string[];
  sources?: string[];
  error?: {
    reason: string;
    details?: string;
    hints: string[];
    line?: number;
    column?: number;
  };
  previousDataPreserved?: boolean;
}

interface ClassifiedImportError {
  reason: string;
  details?: string;
  hints: string[];
  line?: number;
  column?: number;
}

function basename(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  return String((error as { code?: unknown }).code);
}

function errorContext(error: unknown): { line?: number; column?: number } {
  if (!error || typeof error !== "object" || !("context" in error)) {
    return {};
  }

  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== "object") {
    return {};
  }

  return context as { line?: number; column?: number };
}

function classifyImportError(error: unknown): ClassifiedImportError {
  const message = error instanceof Error ? error.message : String(error);
  const code = errorCode(error);
  const context = errorContext(error);
  const base = { details: message, ...context };

  switch (code) {
    case "file.notFound":
    case "ENOENT":
      return {
        ...base,
        reason: "The file could not be found.",
        hints: [
          "The file may have been moved or deleted.",
          "Select the file again in the settings.",
        ],
      };
    case "file.permission":
    case "EACCES":
    case "EPERM":
      return {
        ...base,
        reason: "The file could not be read.",
        hints: [
          "Check that you have permission to read the file.",
          "Copy it to your Documents folder and try again.",
        ],
      };
    case "file.isDirectory":
    case "EISDIR":
      return {
        ...base,
        reason: "The selected path is a folder, not a file.",
        hints: ["Select a JSON file instead of a folder."],
      };
    case "file.tooLarge":
      return {
        ...base,
        reason: "The file is too large to be holiday data.",
        hints: [
          "Holiday data files are usually under 100 KB.",
          "Make sure you selected the holiday-cn JSON file.",
        ],
      };
    case "file.unreadable":
    case "EMFILE":
    case "ENFILE":
      return {
        ...base,
        reason: "The file could not be read.",
        hints: [
          "Check that the file is readable and is a holiday-cn JSON file.",
          "Try downloading the file again.",
        ],
      };
    case "json.invalid":
      return {
        ...base,
        reason: "The file is not valid JSON.",
        hints: [
          'Download the file again from the URL shown in "Chinese Holiday JSON URL".',
          "Make sure the file is JSON, not an HTML page.",
        ],
      };
    case "json.rootInvalid":
      return {
        ...base,
        reason: "The JSON does not match the holiday-cn format.",
        hints: [
          "Expected an object or an array of objects.",
          "Each year needs year, papers and days fields.",
        ],
      };
    case "years.empty":
      return {
        ...base,
        reason: "The file contains no years.",
        hints: [
          "The file must contain one holiday year object or an array of them.",
        ],
      };
    case "years.tooMany":
      return {
        ...base,
        reason: "The file contains too many years.",
        hints: ["Make sure you selected the holiday-cn JSON file."],
      };
    case "year.duplicate":
      return {
        ...base,
        reason: "The same year appears more than once.",
        hints: ["Remove the duplicate year entry and try again."],
      };
    case "year.invalid":
      return {
        ...base,
        reason: "A holiday year is invalid.",
        hints: ["The year must be an integer between 2000 and 2100."],
      };
    case "year.noDays":
      return {
        ...base,
        reason: "No holiday days were found for this year.",
        hints: [
          "The schedule for this year may not be published yet.",
          "Try importing the current or previous year instead.",
        ],
      };
    case "year.tooManyDays":
      return {
        ...base,
        reason: "The file contains too many holiday days for one year.",
        hints: ["Make sure you selected the holiday-cn JSON file."],
      };
    case "day.invalid":
      return {
        ...base,
        reason: "A holiday entry has an invalid format.",
        hints: [
          "Each day must be an object with date, name and isOffDay fields.",
        ],
      };
    case "day.dateInvalid":
      return {
        ...base,
        reason: "A holiday date is invalid.",
        hints: ["Dates must use the YYYY-MM-DD format."],
      };
    case "day.dateInvalidCalendar":
      return {
        ...base,
        reason: "A holiday date does not exist.",
        hints: ["Check for impossible dates such as 2027-02-30."],
      };
    case "day.nameInvalid":
      return {
        ...base,
        reason: "A holiday name is missing or too long.",
        hints: ["Each day needs a name between 1 and 20 characters."],
      };
    case "day.isOffDayInvalid":
      return {
        ...base,
        reason: 'A holiday entry is missing "isOffDay".',
        hints: [
          "Set isOffDay to true for a public holiday or false for a make-up workday.",
        ],
      };
    case "day.yearMismatch":
      return {
        ...base,
        reason: "A date does not belong to its declared year.",
        hints: [
          "A year file may only contain dates in that year, plus late December of the previous year.",
        ],
      };
    case "day.conflict":
      return {
        ...base,
        reason: "The same date has conflicting entries.",
        hints: [
          "Remove the duplicate date or make the name and isOffDay values match.",
        ],
      };
    default:
      return {
        ...base,
        reason: "The file could not be imported.",
        hints: [
          "Check that the file is readable and is a holiday-cn JSON file.",
          "Try downloading the file again.",
        ],
      };
  }
}

export function buildHolidayImportReport(
  outcome: HolidayImportOutcome,
  options: { bundledYears?: readonly number[] } = {}
): HolidayImportReport {
  if (outcome.status === "cleared") {
    return {
      kind: "success",
      filePath: "",
      fileName: "",
      title: "Holiday data cleared",
      warnings: [],
    };
  }

  if (outcome.status === "error") {
    return {
      kind: "error",
      filePath: outcome.filePath,
      fileName: basename(outcome.filePath),
      title: "Holiday data not imported",
      error: classifyImportError(outcome.error),
      previousDataPreserved: (outcome.previousCache?.days.length ?? 0) > 0,
    };
  }

  const days = outcome.cache.days;
  const offDays = days.filter((day) => day.isOffDay).length;
  const workdays = days.length - offDays;
  const yearRows: HolidayImportYearRow[] = outcome.years.map((year) => {
    const yearOffDays = year.days.filter((day) => day.isOffDay).length;
    return {
      year: year.year,
      days: year.days.length,
      offDays: yearOffDays,
      workdays: year.days.length - yearOffDays,
      papers: year.papers.length,
    };
  });

  const bundledYears = options.bundledYears ?? CN_HOLIDAY_YEARS;
  const warnings: string[] = [];

  const overlappingYears = outcome.years
    .map((year) => year.year)
    .filter((year) => bundledYears.includes(year));
  if (overlappingYears.length) {
    warnings.push(
      `This file overlaps bundled years ${overlappingYears.join(
        ", "
      )}. Imported entries replace bundled entries on the same date.`
    );
  }

  const yearsWithoutPapers = outcome.years
    .filter((year) => year.papers.length === 0)
    .map((year) => year.year);
  if (yearsWithoutPapers.length) {
    warnings.push(
      `No source announcement URL (papers) was found for ${yearsWithoutPapers.join(
        ", "
      )}.`
    );
  }

  const declaredDays = outcome.years.reduce(
    (total, year) => total + year.days.length,
    0
  );
  const duplicateDates = declaredDays - days.length;
  if (duplicateDates > 0) {
    warnings.push(
      `${duplicateDates} duplicate ${plural(
        duplicateDates,
        "date",
        "dates"
      )} across year entries ${plural(
        duplicateDates,
        "was",
        "were"
      )} merged; the last entry wins.`
    );
  }

  const hasReplacementCharacters = outcome.years.some((year) =>
    year.days.some((day) => day.name.includes("\uFFFD"))
  );
  if (hasReplacementCharacters) {
    warnings.push(
      "The file may not be UTF-8 encoded; some holiday names contain invalid characters."
    );
  }

  return {
    kind: "success",
    filePath: outcome.filePath,
    fileName: basename(outcome.filePath),
    title: "Holiday data imported",
    summary: {
      years: outcome.years.length,
      days: days.length,
      offDays,
      workdays,
    },
    coverage: formatYearRange(getHolidayYears(days)),
    yearRows,
    importedAt: formatDateTime(outcome.cache.updatedAt),
    warnings,
    sources: [...new Set(outcome.cache.sources.filter(Boolean))],
  };
}

export function buildLastImportRecord(
  outcome: HolidayImportOutcome,
  at = new Date().toISOString()
): HolidayLastImport {
  if (outcome.status === "cleared") {
    return {
      at,
      ok: true,
      cleared: true,
      filePath: "",
      fileName: "",
    };
  }

  if (outcome.status === "error") {
    const classified = classifyImportError(outcome.error);
    return {
      at,
      ok: false,
      filePath: outcome.filePath,
      fileName: basename(outcome.filePath),
      code: errorCode(outcome.error),
      message: classified.reason,
      details: classified.details,
      line: classified.line,
      column: classified.column,
    };
  }

  return {
    at,
    ok: true,
    filePath: outcome.filePath,
    fileName: basename(outcome.filePath),
    years: outcome.years.map((year) => year.year),
  };
}

export function parseLastImport(value: unknown): HolidayLastImport | null {
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
  if (typeof raw.at !== "string" || typeof raw.ok !== "boolean") {
    return null;
  }

  const record: HolidayLastImport = {
    at: raw.at,
    ok: raw.ok,
    filePath: typeof raw.filePath === "string" ? raw.filePath : "",
    fileName: typeof raw.fileName === "string" ? raw.fileName : "",
  };

  if (raw.cleared === true) {
    record.cleared = true;
  }
  if (typeof raw.code === "string") {
    record.code = raw.code;
  }
  if (typeof raw.message === "string") {
    record.message = raw.message;
  }
  if (typeof raw.details === "string") {
    record.details = raw.details;
  }
  if (typeof raw.line === "number") {
    record.line = raw.line;
  }
  if (typeof raw.column === "number") {
    record.column = raw.column;
  }
  if (Array.isArray(raw.years)) {
    const years = raw.years
      .map(Number)
      .filter((year) => Number.isInteger(year));
    if (years.length) {
      record.years = years;
    }
  }

  return record;
}

export function buildHolidayImportDetails(report: HolidayImportReport): string {
  const lines = ["Joplin Calendar - Holiday Import"];

  if (report.kind === "error") {
    lines.push("Result: failed");
    if (report.filePath) {
      lines.push(`File: ${report.filePath}`);
    }
    if (report.error) {
      lines.push(`Reason: ${report.error.reason}`);
      if (report.error.details) {
        lines.push(`Details: ${report.error.details}`);
      }
      if (report.error.line !== undefined) {
        lines.push(
          `Position: line ${report.error.line}${
            report.error.column !== undefined
              ? `, column ${report.error.column}`
              : ""
          }`
        );
      }
      lines.push(
        `Previous data preserved: ${
          report.previousDataPreserved ? "yes" : "no"
        }`
      );
      if (report.error.hints.length) {
        lines.push("Hints:");
        report.error.hints.forEach((hint) => lines.push(`- ${hint}`));
      }
    }
    return lines.join("\n");
  }

  if (!report.filePath && !report.summary) {
    lines.push("Result: cleared");
    return lines.join("\n");
  }

  lines.push("Result: imported");
  if (report.filePath) {
    lines.push(`File: ${report.filePath}`);
  }
  if (report.importedAt) {
    lines.push(`Imported at: ${report.importedAt}`);
  }
  if (report.coverage) {
    lines.push(`Coverage: ${report.coverage}`);
  }
  if (report.summary) {
    lines.push(`Years: ${report.summary.years}`);
    lines.push(`Days: ${report.summary.days}`);
    lines.push(`Holidays: ${report.summary.offDays}`);
    lines.push(`Make-up workdays: ${report.summary.workdays}`);
  }
  if (report.warnings?.length) {
    lines.push("Warnings:");
    report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  } else {
    lines.push("Warnings: none");
  }
  if (report.sources?.length) {
    lines.push("Sources:");
    report.sources.forEach((source) => lines.push(`- ${source}`));
  } else {
    lines.push("Sources: none");
  }
  return lines.join("\n");
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

function renderList(items: string[]): string {
  if (!items.length) return "";
  return `<ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function renderSuccessContent(report: HolidayImportReport): string {
  const summary = report.summary;
  const stats = summary
    ? `
      <div class="jci-stats">
        <div class="jci-stat"><strong>${summary.years}</strong><span>${plural(
        summary.years,
        "Year",
        "Years"
      )}</span></div>
        <div class="jci-stat"><strong>${summary.days}</strong><span>${plural(
        summary.days,
        "Day",
        "Days"
      )}</span></div>
        <div class="jci-stat"><strong>${summary.offDays}</strong><span>${plural(
        summary.offDays,
        "Holiday",
        "Holidays"
      )}</span></div>
        <div class="jci-stat"><strong>${
          summary.workdays
        }</strong><span>Make-up workdays</span></div>
      </div>
    `
    : "";

  const yearTable = report.yearRows?.length
    ? `
      <section>
        <h2>DETAILS</h2>
        <table>
          <thead>
            <tr><th>Year</th><th>Days</th><th>Holidays</th><th>Workdays</th><th>Sources</th></tr>
          </thead>
          <tbody>
            ${report.yearRows
              .map(
                (row) =>
                  `<tr><td>${row.year}</td><td>${row.days}</td><td>${row.offDays}</td><td>${row.workdays}</td><td>${row.papers}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>
    `
    : "";

  const sources = report.sources?.length
    ? `
      <details class="jci-sources">
        <summary>Source URLs (${report.sources.length})</summary>
        ${renderList(report.sources)}
      </details>
    `
    : "";

  const warnings = report.warnings?.length
    ? `
      <section>
        <h2>NOTES</h2>
        <div class="jci-warning">${renderList(report.warnings)}</div>
      </section>
    `
    : "";

  return `
    ${stats}
    ${
      report.coverage
        ? `<section><h2>IMPORTED COVERAGE</h2><p>${escapeHtml(
            report.coverage
          )}</p></section>`
        : ""
    }
    ${yearTable}
    <section>
      <h2>FILE</h2>
      <p><code>${escapeHtml(report.filePath)}</code></p>
      ${
        report.importedAt
          ? `<p class="jci-muted">Imported ${escapeHtml(report.importedAt)}</p>`
          : ""
      }
    </section>
    ${sources}
    ${warnings}
    <p class="jci-footer">Imported entries are merged with the bundled schedule. On the same date, the imported file wins.</p>
  `;
}

function renderErrorContent(report: HolidayImportReport): string {
  const error = report.error;
  if (!error) return "";

  const position =
    error.line !== undefined
      ? `<p class="jci-muted">line ${error.line}${
          error.column !== undefined ? `, column ${error.column}` : ""
        }</p>`
      : "";

  return `
    <p class="jci-reason">${escapeHtml(error.reason)}</p>
    <section>
      <h2>WHAT TO CHECK</h2>
      ${renderList(error.hints)}
    </section>
    ${
      error.details
        ? `<section>
            <h2>TECHNICAL DETAILS</h2>
            <pre class="jci-details">${escapeHtml(error.details)}</pre>
            ${position}
          </section>`
        : ""
    }
    <p class="jci-footer">${
      report.previousDataPreserved
        ? "Your previous holiday data is still in use."
        : "Bundled holiday data is still in use."
    }</p>
  `;
}

export const HOLIDAY_DIALOG_STYLES = `
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 520px;
        height: 520px;
        overflow: hidden;
        background: var(--joplin-background-color, #ffffff);
      }
      #joplin-plugin-content-root,
      #joplin-plugin-content {
        width: 100%;
        height: 100%;
        min-height: 0;
      }
      #joplin-plugin-content {
        display: flex;
        flex-direction: column;
      }
      .jci-dialog {
        --jci-bg: var(--joplin-background-color, #ffffff);
        --jci-fg: var(--joplin-color, #1f2328);
        --jci-muted: var(--joplin-color-faded, #6b7280);
        --jci-border: var(--joplin-divider-color, #d0d7de);
        --jci-green: #1a7f37;
        --jci-amber: #9a6700;
        --jci-red: #cf222e;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
        padding: 18px 20px;
        color: var(--jci-fg);
        background: var(--jci-bg);
        color-scheme: light dark;
        font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .jci-scroll {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
      .jci-dialog * { box-sizing: border-box; }
      .jci-dialog h1 { margin: 0; font-size: 18px; line-height: 1.3; }
      .jci-dialog h2 { margin: 0 0 6px; color: var(--jci-muted); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
      .jci-dialog section { margin-top: 16px; }
      .jci-dialog p { margin: 4px 0; }
      .jci-dialog ul { margin: 4px 0; padding-left: 20px; }
      .jci-dialog .jci-header { display: flex; flex: 0 0 auto; gap: 10px; align-items: flex-start; }
      .jci-dialog .jci-icon { flex: 0 0 24px; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-weight: 700; line-height: 24px; text-align: center; }
      .jci-dialog .jci-icon-success { background: var(--jci-green); }
      .jci-dialog .jci-icon-error { background: var(--jci-red); }
      .jci-dialog .jci-icon-neutral { background: var(--jci-muted); }
      .jci-dialog .jci-subtitle { margin-top: 2px; color: var(--jci-muted); word-break: break-all; }
      .jci-dialog .jci-stats { display: flex; gap: 8px; margin-top: 16px; }
      .jci-dialog .jci-stat { flex: 1; min-width: 0; border: 1px solid var(--jci-border); border-radius: 6px; padding: 8px 10px; }
      .jci-dialog .jci-stat strong { display: block; font-size: 18px; line-height: 1.2; }
      .jci-dialog .jci-stat span { color: var(--jci-muted); font-size: 11px; text-transform: uppercase; }
      .jci-dialog table { width: 100%; border-collapse: collapse; }
      .jci-dialog th, .jci-dialog td { padding: 5px 4px; border-bottom: 1px solid var(--jci-border); text-align: left; }
      .jci-dialog th { color: var(--jci-muted); font-size: 11px; text-transform: uppercase; }
      .jci-dialog code { word-break: break-all; }
      .jci-dialog .jci-warning { border-left: 3px solid var(--jci-amber); padding-left: 10px; color: var(--jci-amber); }
      .jci-dialog .jci-reason { margin-top: 16px; font-size: 15px; }
      .jci-dialog .jci-details { background: rgba(127, 127, 127, 0.08); border-radius: 4px; padding: 8px 10px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
      .jci-dialog .jci-muted { color: var(--jci-muted); }
      .jci-dialog .jci-footer { margin-top: 16px; color: var(--jci-muted); }
      .jci-dialog .jci-sources { margin-top: 16px; }
      .jci-dialog .jci-sources summary { cursor: pointer; color: var(--jci-muted); }
      .jci-dialog .jci-sources ul { word-break: break-all; }
      @media (prefers-color-scheme: dark) {
        html, body {
          background: var(--joplin-background-color, #1e1e1e);
        }
        .jci-dialog {
          --jci-bg: var(--joplin-background-color, #1e1e1e);
          --jci-fg: var(--joplin-color, #e6e6e6);
          --jci-muted: var(--joplin-color-faded, #a0a0a0);
          --jci-border: var(--joplin-divider-color, #3a3a3a);
        }
      }
    </style>
  `;

export function renderHolidayImportHtml(report: HolidayImportReport): string {
  const success = report.kind === "success";
  const icon = success ? "✓" : "!";
  const iconClass = success ? "jci-icon-success" : "jci-icon-error";

  return `
    ${HOLIDAY_DIALOG_STYLES}
    <div class="jci-dialog" data-dialog-size data-max-width="520" data-max-height="520" role="document">
      <div class="jci-header">
        <div class="jci-icon ${iconClass}" aria-hidden="true">${icon}</div>
        <div>
          <h1>${escapeHtml(report.title)}</h1>
          ${
            report.fileName
              ? `<div class="jci-subtitle">${escapeHtml(report.fileName)}</div>`
              : ""
          }
        </div>
      </div>
      <div class="jci-scroll">
        ${success ? renderSuccessContent(report) : renderErrorContent(report)}
      </div>
    </div>
  `;
}
