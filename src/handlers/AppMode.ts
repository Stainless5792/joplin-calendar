import joplin from "api";
import { CALENDAR_ONLY_MODE } from "@constants/Settings";

// Matches the registered default for CALENDAR_ONLY_MODE.
let calendarOnly = true;

export function isCalendarOnly() {
  return calendarOnly;
}

export function setCalendarOnly(value: boolean) {
  calendarOnly = value !== false;
}

/**
 * Load the persisted mode before any note selection events can be forwarded
 * to the webview.
 */
export async function initCalendarOnlyMode() {
  calendarOnly = (await joplin.settings.value(CALENDAR_ONLY_MODE)) !== false;
}
