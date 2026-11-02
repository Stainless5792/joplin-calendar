import { CN_HOLIDAY_SOURCES, CN_HOLIDAY_YEARS } from "./gui/holidays/meta";
import type { HolidayOrigin } from "./gui/holidays/runtime";

/**
 * Label and description for the holiday visibility toggle.
 *
 * The coverage year and source URLs are shown in the "Holiday Data Status"
 * setting, which is refreshed at runtime (bundled data, online cache or an
 * imported file).
 */
export function getCnHolidaySettings() {
  return {
    label: "Show Chinese Public Holidays",
    description:
      "Highlight statutory holidays and make-up workdays from the State " +
      "Council schedule. Only used in Calendar Only Mode. Data coverage, " +
      'source URLs and last import are shown under "Holiday Data Status".',
  };
}

export interface HolidayStatusInput {
  years: number[];
  sources: string[];
  origin: HolidayOrigin;
  updatedAt?: string;
}

const ORIGIN_LABELS: Record<HolidayOrigin, string> = {
  bundled: "bundled data",
  file: "imported file",
};

export function formatHolidayStatus({
  years,
  sources,
  origin,
  updatedAt,
}: HolidayStatusInput): string {
  const coverage = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : "none";
  const parts = [`Coverage: ${coverage}`, `Source: ${ORIGIN_LABELS[origin]}`];

  if (updatedAt) {
    parts.push(`Updated: ${updatedAt.slice(0, 10)}`);
  }
  if (sources.length) {
    parts.push(`URLs: ${sources.join(" ")}`);
  }

  return parts.join(" · ");
}

export function getBundledHolidayStatus(): string {
  return formatHolidayStatus({
    years: [...CN_HOLIDAY_YEARS],
    sources: [...CN_HOLIDAY_SOURCES],
    origin: "bundled",
  });
}

export const CN_HOLIDAY_JSON_URL_TEMPLATE =
  "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json";
export const CN_HOLIDAY_JSON_MIRROR_TEMPLATE =
  "https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{year}.json";

export function buildHolidayJsonUrl(template: string, year: number): string {
  return template.replace(/\{year\}/g, String(year));
}

/**
 * Years whose JSON file is useful to check: bundled years plus the current and
 * next year.
 */
export function getHolidayJsonYears(
  currentYear = new Date().getFullYear()
): number[] {
  return [...new Set([...CN_HOLIDAY_YEARS, currentYear, currentYear + 1])].sort(
    (a, b) => a - b
  );
}

export function formatHolidayJsonUrls(
  years: number[],
  template = CN_HOLIDAY_JSON_URL_TEMPLATE
): string {
  return years
    .map((year) => `${year}: ${buildHolidayJsonUrl(template, year)}`)
    .join(" | ");
}
