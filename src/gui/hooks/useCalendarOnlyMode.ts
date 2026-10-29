import { CALENDAR_ONLY_MODE } from "@constants/Settings";
import useOnSettingsChange from "./useOnSettingsChange";

/**
 * Returns whether the panel is in calendar-only mode.
 *
 * The default is `true` (matching the registered setting default), so the
 * first render never starts note searches before the persisted value is known.
 */
function useCalendarOnlyMode() {
  return useOnSettingsChange<boolean>(CALENDAR_ONLY_MODE, true);
}

export default useCalendarOnlyMode;
