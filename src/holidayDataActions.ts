import joplin from "api";
import { CN_HOLIDAY_FILE } from "@constants/Settings";
import { importHolidayFile } from "./holidayData";
import { runHolidayImportFlow } from "./holidayImportFlow";
import { showHolidayImportDialog } from "./holidayImportDialog";

/**
 * Run the import flow for the file currently selected in the settings.
 */
export async function runHolidayImportFromSettings(): Promise<void> {
  await runHolidayImportFlow({
    getFilePath: async () =>
      String((await joplin.settings.value(CN_HOLIDAY_FILE)) ?? ""),
    importFile: importHolidayFile,
    showReport: showHolidayImportDialog,
  });
}

/**
 * Re-read the current file even when its path has not changed.
 *
 * Joplin does not emit onChange when the same value is selected again, so this
 * is the recovery path after the user edits the file in place.
 */
export async function reimportHolidayFile(): Promise<void> {
  const filePath = String((await joplin.settings.value(CN_HOLIDAY_FILE)) ?? "");

  if (!filePath) {
    await joplin.views.dialogs.showMessageBox(
      "No holiday data file is selected. Choose one in Settings → Joplin Calendar → Chinese Holiday Data File."
    );
    return;
  }

  await runHolidayImportFlow({
    getFilePath: async () => filePath,
    importFile: importHolidayFile,
    showReport: showHolidayImportDialog,
  });
}
