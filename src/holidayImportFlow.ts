import {
  buildHolidayImportReport,
  type HolidayImportOutcome,
  type HolidayImportReport,
} from "./holidayImportReport";

export const MAX_HOLIDAY_IMPORT_RETRIES = 5;

export interface HolidayImportFlowDeps {
  getFilePath(): Promise<string>;
  importFile(filePath: string): Promise<HolidayImportOutcome>;
  showReport(report: HolidayImportReport): Promise<string>;
}

/**
 * Run the import flow for the file currently selected in the settings.
 *
 * Clearing the path only resets the data and does not open a dialog. A failed
 * import can be retried up to MAX_HOLIDAY_IMPORT_RETRIES times without changing
 * the setting, which matters because Joplin does not emit onChange when the
 * same file path is selected again.
 */
export async function runHolidayImportFlow(
  deps: HolidayImportFlowDeps
): Promise<void> {
  let filePath = await deps.getFilePath();

  if (!filePath) {
    await deps.importFile("");
    return;
  }

  for (let attempt = 0; attempt < MAX_HOLIDAY_IMPORT_RETRIES; attempt += 1) {
    const outcome = await deps.importFile(filePath);
    if (outcome.status === "cleared") {
      return;
    }

    const action = await deps.showReport(buildHolidayImportReport(outcome));
    if (action !== "retry") {
      return;
    }

    filePath = await deps.getFilePath();
    if (!filePath) {
      return;
    }
  }
}
