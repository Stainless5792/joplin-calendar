import joplin from "api";
import type { ViewHandle } from "api/types";

type DialogWithFitToContent = {
  setFitToContent?: (handle: ViewHandle, status: boolean) => Promise<boolean>;
};

/**
 * Re-apply fit-to-content after changing a dialog's HTML.
 *
 * Joplin keeps the previous window size when a dialog handle is reused, which
 * makes later imports and manager refreshes appear at the wrong size on some
 * versions. The API is also missing on older app versions, so call it only
 * when available.
 */
export async function setDialogFitToContent(
  handle: ViewHandle,
  fit: boolean
): Promise<void> {
  const dialogs = joplin.views.dialogs as DialogWithFitToContent;
  if (typeof dialogs.setFitToContent !== "function") {
    return;
  }

  try {
    await dialogs.setFitToContent(handle, fit);
  } catch (error) {
    // Sizing is cosmetic; never block the dialog from opening.
  }
}
