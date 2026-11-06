import joplin from "api";
import type { ViewHandle } from "api/types";
import {
  buildHolidayImportDetails,
  renderHolidayImportHtml,
  type HolidayImportReport,
} from "./holidayImportReport";
import { setDialogFitToContent } from "./joplinDialogUtils";

const DIALOG_ID = "holidayImportDialog";

let dialogHandle: ViewHandle | undefined;
let dialogChain: Promise<unknown> = Promise.resolve();

/**
 * Show the import report in a modal Joplin dialog.
 *
 * Dialogs are serialized because a second import can be triggered while the
 * previous one is still open. The handle is reused so Joplin only creates one
 * webview per session.
 */
export function showHolidayImportDialog(
  report: HolidayImportReport
): Promise<string> {
  const run = async (): Promise<string> => {
    try {
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
        renderHolidayImportHtml(report)
      );
      await setDialogFitToContent(dialogHandle, true);

      await joplin.views.dialogs.setButtons(
        dialogHandle,
        report.kind === "error"
          ? [
              { id: "copy", title: "Copy Details" },
              { id: "retry", title: "Try Again" },
              { id: "cancel", title: "Close" },
            ]
          : [
              { id: "copy", title: "Copy Details" },
              { id: "ok", title: "OK" },
            ]
      );

      while (true) {
        const result = await joplin.views.dialogs.open(dialogHandle);
        const action = String(result.id);

        if (action !== "copy") {
          return action;
        }

        await joplin.clipboard.writeText(buildHolidayImportDetails(report));
      }
    } catch (error) {
      // The import has already been applied or rejected at this point. The
      // status setting still carries the result, so a dialog failure must not
      // break the settings change handler.
      return "ok";
    }
  };

  const result = dialogChain.then(run, run);
  dialogChain = result.catch(() => undefined);
  return result;
}
