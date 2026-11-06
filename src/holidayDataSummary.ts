import type { CnHolidayCache, CnHolidayDay } from "./gui/holidays/types";
import { CN_HOLIDAY_DAYS } from "./gui/holidays/data";
import { CN_HOLIDAY_SOURCES, CN_HOLIDAY_YEARS } from "./gui/holidays/meta";
import { getHolidayYears, mergeHolidayDays } from "./gui/holidays/parse";
import { formatDateTime, formatYearList } from "./holidayFormat";
import {
  HOLIDAY_DIALOG_STYLES,
  escapeHtml,
  type HolidayLastImport,
} from "./holidayImportReport";

export type HolidayYearSource = "bundled" | "imported" | "both";

export interface HolidayYearSummary {
  year: number;
  source: HolidayYearSource;
  bundledDays: number;
  importedDays: number;
  effectiveDays: number;
  holidays: number;
  workdays: number;
  overriddenDates: number;
  updatedAt?: string;
  sources: string[];
}

export interface HolidayDataSummary {
  years: HolidayYearSummary[];
  availableYears: number[];
  bundledYears: number[];
  importedYears: number[];
  totalDays: number;
  sources: string[];
  lastImport: HolidayLastImport | null;
  origin: "bundled" | "file";
}

export interface HolidayDataManagerButton {
  id: string;
  title: string;
}

export interface HolidayDataSummaryOptions {
  bundledDays?: CnHolidayDay[];
  bundledSources?: readonly string[];
  lastImport?: HolidayLastImport | null;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function daysForYear(days: CnHolidayDay[], year: number): CnHolidayDay[] {
  return days.filter((day) => day.date.startsWith(`${year}-`));
}

export function buildHolidayDataSummary(
  fileCache: CnHolidayCache | null,
  options: HolidayDataSummaryOptions = {}
): HolidayDataSummary {
  const bundledDays = options.bundledDays ?? CN_HOLIDAY_DAYS;
  const bundledSources = options.bundledSources ?? CN_HOLIDAY_SOURCES;
  const importedDays = fileCache?.days ?? [];
  const importedSources = fileCache?.sources ?? [];
  const effectiveDays = mergeHolidayDays(bundledDays, importedDays);

  const years = uniqueNumbers([
    ...getHolidayYears(bundledDays),
    ...getHolidayYears(importedDays),
    ...getHolidayYears(effectiveDays),
  ]);

  const yearRows = years.map<HolidayYearSummary>((year) => {
    const bundledForYear = daysForYear(bundledDays, year);
    const importedForYear = daysForYear(importedDays, year);
    const effectiveForYear = daysForYear(effectiveDays, year);
    const bundledByDate = new Map(bundledForYear.map((day) => [day.date, day]));

    const overriddenDates = importedForYear.filter((day) => {
      const bundledDay = bundledByDate.get(day.date);
      return (
        bundledDay !== undefined &&
        (bundledDay.name !== day.name || bundledDay.isOffDay !== day.isOffDay)
      );
    }).length;

    const source: HolidayYearSource =
      bundledForYear.length && importedForYear.length
        ? "both"
        : importedForYear.length
        ? "imported"
        : "bundled";

    return {
      year,
      source,
      bundledDays: bundledForYear.length,
      importedDays: importedForYear.length,
      effectiveDays: effectiveForYear.length,
      holidays: effectiveForYear.filter((day) => day.isOffDay).length,
      workdays: effectiveForYear.filter((day) => !day.isOffDay).length,
      overriddenDates,
      updatedAt: importedForYear.length ? fileCache?.updatedAt : undefined,
      sources: uniqueStrings([
        ...(bundledForYear.length ? bundledSources : []),
        ...(importedForYear.length ? importedSources : []),
      ]),
    };
  });

  return {
    years: yearRows,
    availableYears: getHolidayYears(effectiveDays),
    bundledYears: getHolidayYears(bundledDays),
    importedYears: getHolidayYears(importedDays),
    totalDays: effectiveDays.length,
    sources: uniqueStrings([...bundledSources, ...importedSources]),
    lastImport: options.lastImport ?? null,
    origin: importedDays.length ? "file" : "bundled",
  };
}

const SOURCE_LABELS: Record<HolidayYearSource, string> = {
  bundled: "Bundled",
  imported: "Imported",
  both: "Bundled + Imported",
};

function renderLastImport(summary: HolidayDataSummary): string {
  const lastImport = summary.lastImport;
  if (!lastImport) return "";

  const time = formatDateTime(lastImport.at);
  const fileLabel = lastImport.fileName ? ` (${lastImport.fileName})` : "";

  if (lastImport.cleared) {
    return `<p class="jci-muted">Import cleared at ${escapeHtml(time)}.</p>`;
  }

  if (lastImport.ok) {
    return `<p class="jci-muted">Import succeeded at ${escapeHtml(
      time
    )}${escapeHtml(fileLabel)}.</p>`;
  }

  return `
    <div class="jci-warning">
      <strong>Import failed at ${escapeHtml(time)}${escapeHtml(
    fileLabel
  )}: ${escapeHtml(lastImport.message ?? "Unknown error")}</strong>
      <p>${
        summary.origin === "file"
          ? "Previous imported data is still in use."
          : "Bundled data is still in use."
      }</p>
    </div>
  `;
}

function renderTable(summary: HolidayDataSummary): string {
  if (!summary.years.length) {
    return `<p class="jci-muted">No holiday data is available.</p>`;
  }

  const rows = summary.years
    .map(
      (year) => `
        <tr>
          <td class="jci-year">${year.year}</td>
          <td>${SOURCE_LABELS[year.source]}</td>
          <td>${year.effectiveDays}</td>
          <td>${year.holidays}</td>
          <td>${year.workdays}</td>
          <td>${year.overriddenDates}</td>
          <td>${
            year.updatedAt ? escapeHtml(formatDateTime(year.updatedAt)) : "—"
          }</td>
          <td>${year.sources.length}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th>Year</th>
          <th>Source</th>
          <th>Days</th>
          <th>Holidays</th>
          <th>Workdays</th>
          <th>Overridden</th>
          <th>Updated</th>
          <th>Sources</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function renderHolidayDataManagerHtml(
  summary: HolidayDataSummary,
  options: { filePath?: string } = {}
): string {
  const overriddenDates = summary.years.reduce(
    (total, year) => total + year.overriddenDates,
    0
  );

  return `
    ${HOLIDAY_DIALOG_STYLES}
    <style>
      html, body { width: 760px; height: 600px; }
      .jci-manager table { font-size: 12px; }
      .jci-manager th, .jci-manager td { white-space: nowrap; }
      .jci-manager .jci-year { font-weight: 600; }
      .jci-manager .jci-current-file { word-break: break-all; }
    </style>
    <div class="jci-dialog jci-manager" data-dialog-size data-max-width="760" data-max-height="600" role="document">
      <div class="jci-header">
        <div class="jci-icon jci-icon-neutral" aria-hidden="true">i</div>
        <div>
          <h1>Holiday Data</h1>
          <div class="jci-subtitle">Bundled and imported Chinese public holidays</div>
        </div>
      </div>

      <div class="jci-scroll">
        <div class="jci-stats">
          <div class="jci-stat"><strong>${
            summary.availableYears.length
          }</strong><span>Available years</span></div>
          <div class="jci-stat"><strong>${
            summary.totalDays
          }</strong><span>Days</span></div>
          <div class="jci-stat"><strong>${
            summary.importedYears.length
          }</strong><span>Imported years</span></div>
          <div class="jci-stat"><strong>${overriddenDates}</strong><span>Overridden dates</span></div>
        </div>

        <section>
          <h2>AVAILABLE YEARS</h2>
          <p>Available years: ${escapeHtml(
            formatYearList(summary.availableYears)
          )}</p>
          <p class="jci-muted">Bundled: ${escapeHtml(
            formatYearList(summary.bundledYears)
          )} · Imported: ${escapeHtml(
    formatYearList(summary.importedYears)
  )}</p>
          ${renderLastImport(summary)}
        </section>

        <section>
          <h2>CURRENT FILE</h2>
          ${
            options.filePath
              ? `<p class="jci-current-file"><code>${escapeHtml(
                  options.filePath
                )}</code></p>`
              : `<p class="jci-warning">No holiday data file is selected. Choose one in Settings → Joplin Calendar → Chinese Holiday Data File.</p>`
          }
        </section>

        <section>
          <h2>YEARS</h2>
          ${renderTable(summary)}
        </section>

        ${
          summary.sources.length
            ? `<details class="jci-sources">
                <summary>Source URLs (${summary.sources.length})</summary>
                <ul>${summary.sources
                  .map((source) => `<li>${escapeHtml(source)}</li>`)
                  .join("")}</ul>
              </details>`
            : ""
        }

        <p class="jci-footer">Bundled data is always available. Imported entries take precedence on the same date.</p>
      </div>
    </div>
  `;
}

export function buildHolidayDataManagerButtons(
  summary: HolidayDataSummary,
  hasFile: boolean
): HolidayDataManagerButton[] {
  const buttons: HolidayDataManagerButton[] = [];

  if (hasFile) {
    buttons.push({ id: "reimport", title: "Re-import Current File" });
  }
  if (summary.importedYears.length) {
    buttons.push({ id: "clear", title: "Clear Imported Data" });
  }
  if (summary.sources.length) {
    buttons.push({ id: "copy", title: "Copy Source URLs" });
  }

  buttons.push({ id: "cancel", title: "Close" });
  return buttons;
}
