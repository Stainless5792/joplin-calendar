import MsgType from "@constants/messageTypes";
import joplin from "api";
import { isCalendarOnly } from "./AppMode";

export function notifyNoteChanged(panelHandle: string) {
  // In calendar-only mode the webview has nothing to refresh.
  if (isCalendarOnly()) {
    return;
  }

  joplin.views.panels.postMessage(panelHandle, {
    type: MsgType.NoteChanged,
  });
}
