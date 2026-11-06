import joplin from "api";
import type { ViewHandle } from "api/types";
import {
  CN_HOLIDAY_FILE,
  CN_HOLIDAY_FILE_CACHE,
  CN_HOLIDAY_LAST_IMPORT,
} from "@constants/Settings";
import { clearImportedHolidayData } from "./holidayData";
import { reimportHolidayFile } from "./holidayDataActions";
import { parseHolidayCache } from "./gui/holidays/parse";
import { parseLastImport } from "./holidayImportReport";
import {
  buildHolidayDataManagerButtons,
  buildHolidayDataSummary,
  renderHolidayDataManagerHtml,
} from "./holidayDataSummary";
import { setDialogFitToContent } from "./joplinDialogUtils";

const DIALOG_ID = "holidayDataManagerDialog";

let dialogHandle: ViewHandle | undefined;
let dialogChain: Promise<unknown> = Promise.resolve();

/**
 * Open the holiday data manager and keep it open after actions that change the
 * data, so the table reflects the new state.
 */
export function showHolidayDataManager(): Promise<void> {
  const run = async (): Promise<void> => {
    try {
      while (true) {
        const [cacheValue, lastImportValue, filePathValue] = await Promise.all([
          joplin.settings.value(CN_HOLIDAY_FILE_CACHE),
          joplin.settings.value(CN_HOLIDAY_LAST_IMPORT),
          joplin.settings.value(CN_HOLIDAY_FILE),
        ]);

        const filePath = String(filePathValue ?? "");
        const summary = buildHolidayDataSummary(parseHolidayCache(cacheValue), {
          lastImport: parseLastImport(lastImportValue),
        });

        if (!dialogHandle) {
          dialogHandle = await joplin.views.dialogs.create(DIALOG_ID);
          try {
            await joplin.views.dialogs.addScript(
              dialogHandle,
              "gui/holidayDialogSize.js"
            );
          } catch (error) {
            // Fixed CSS sizes still provide a usable fallback.
          }
        }

        await joplin.views.dialogs.setHtml(
          dialogHandle,
          renderHolidayDataManagerHtml(summary, { filePath })
        );
        await setDialogFitToContent(dialogHandle, true);
        await joplin.views.dialogs.setButtons(
          dialogHandle,
          buildHolidayDataManagerButtons(summary, Boolean(filePath))
        );

        const result = await joplin.views.dialogs.open(dialogHandle);

        if (result.id === "reimport") {
          await reimportHolidayFile();
          continue;
        }
        if (result.id === "clear") {
          await clearImportedHolidayData();
          continue;
        }
        if (result.id === "copy") {
          try {
            await joplin.clipboard.writeText(summary.sources.join("\n"));
          } catch (error) {
            // Copying is optional; keep the manager usable if the clipboard
            // is unavailable.
          }
          continue;
        }

        return;
      }
    } catch (error) {
      // The manager is a convenience view. A dialog failure should not break
      // the calendar or the import flow.
      return;
    }
  };

  const result = dialogChain.then(run, run);
  dialogChain = result.catch(() => undefined);
  return result;
}
