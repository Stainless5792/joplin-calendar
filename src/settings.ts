import joplin from "api";
import { SettingItemSubType, SettingItemType } from "api/types";
import MsgType from "@constants/messageTypes";
import {
  CALENDAR_ONLY_MODE,
  CN_HOLIDAY_FILE,
  CN_HOLIDAY_FILE_CACHE,
  CN_HOLIDAY_JSON_URL,
  CN_HOLIDAY_LAST_IMPORT,
  CN_HOLIDAY_STATUS,
  FILTER_NOTES_BY_NOTEBOOK,
  SHOW_CALENDAR_BUTTON,
  SHOW_MODIFIED_NOTES,
  SHOW_RELATED_NOTES,
  SHOW_CN_HOLIDAYS,
  WEEK_START_DAY,
  WeekStartDay,
} from "@constants/Settings";
import { getDateFormat } from "./handlers/GlobalSettings";
import { FILTER_BY_NOTEBOOK_COMMAND } from "./commands";
import {
  buildHolidayJsonUrl,
  CN_HOLIDAY_JSON_MIRROR_TEMPLATE,
  CN_HOLIDAY_JSON_URL_TEMPLATE,
  formatHolidayJsonUrls,
  getCnHolidaySettings,
  getHolidayJsonYears,
} from "./holidaysSettings";
import { getInitialHolidayStatus, refreshHolidayStatus } from "./holidayData";
import { runHolidayImportFromSettings } from "./holidayDataActions";

const SETTINGS_SECTION_ID = "joplinCalendarSection";
const HOLIDAY_JSON_YEARS = getHolidayJsonYears();
const LATEST_HOLIDAY_JSON_YEAR = Math.max(...HOLIDAY_JSON_YEARS);
const LATEST_HOLIDAY_JSON_URL = buildHolidayJsonUrl(
  CN_HOLIDAY_JSON_URL_TEMPLATE,
  LATEST_HOLIDAY_JSON_YEAR
);

const settingObservers: Record<string, Array<(value: any) => void>> = {};

export async function registerSettings() {
  await joplin.settings.registerSection(SETTINGS_SECTION_ID, {
    label: "Joplin Calendar",
    iconName: "far fa-calendar",
  });

  await joplin.settings.registerSettings({
    [SHOW_CALENDAR_BUTTON]: {
      label: "Show Calendar Toggle Button",
      description:
        "Show a button on the top-right of the note editor for toggling the calendar. Restart required on change.",
      public: true,
      type: SettingItemType.Bool,
      value: true,
      section: SETTINGS_SECTION_ID,
    },
    [SHOW_MODIFIED_NOTES]: {
      label: "Show Modified Notes in Note List",
      description:
        "Show notes in the note list if their last modified day was on the same day",
      public: true,
      type: SettingItemType.Bool,
      value: true,
      section: SETTINGS_SECTION_ID,
    },
    [SHOW_RELATED_NOTES]: {
      label: "Show Related Notes in Note List",
      description: `Show notes that have the date in the title. The Joplin date
      format is used for this. Currently, it is set to: ${await getDateFormat()}. Note,
      this feature is experimental and may impact performance with large
      notebooks.`,
      public: true,
      type: SettingItemType.Bool,
      value: false,
      section: SETTINGS_SECTION_ID,
    },
    [FILTER_NOTES_BY_NOTEBOOK]: {
      label: "Filter Notes by Notebook",
      description: `If enabled, the note list will only show notes in the selected notebook.  
      Note: Selecting "All Notes" will NOT show notes from all note books, just the previously selected one.
      This setting can also be toggled using the ${FILTER_BY_NOTEBOOK_COMMAND} command.`,
      public: true,
      type: SettingItemType.Bool,
      value: false,
      section: SETTINGS_SECTION_ID,
    },
    [WEEK_START_DAY]: {
      label: "Week Start Day",
      description: "Which day the week starts on",
      public: true,
      isEnum: true,
      type: SettingItemType.String,
      options: WeekStartDay,
      value: WeekStartDay.Sunday,
      section: SETTINGS_SECTION_ID,
    },
    [CALENDAR_ONLY_MODE]: {
      label: "Calendar Only Mode",
      description:
        "Show only the calendar. Hides the note list and note-count dots, " +
        "and disables all note searches for minimal overhead. Enabled by " +
        "default; turn it off to show the note list and dots.",
      public: true,
      type: SettingItemType.Bool,
      value: true,
      section: SETTINGS_SECTION_ID,
    },
    [SHOW_CN_HOLIDAYS]: {
      ...getCnHolidaySettings(),
      public: true,
      type: SettingItemType.Bool,
      value: true,
      section: SETTINGS_SECTION_ID,
    },
    [CN_HOLIDAY_FILE]: {
      label: "Chinese Holiday Data File (desktop)",
      description:
        "Import a holiday-cn JSON file (one year object or an array of " +
        "them). A dialog reports the result. Imported entries take " +
        "precedence over bundled entries on the same date. Leave empty to " +
        'remove the import. Use the "Manage Holiday Data" command for a ' +
        "per-year overview. Not supported on mobile.",
      public: true,
      type: SettingItemType.String,
      subType: SettingItemSubType.FilePath,
      value: "",
      section: SETTINGS_SECTION_ID,
    },
    [CN_HOLIDAY_JSON_URL]: {
      label: `Chinese Holiday JSON URL (${LATEST_HOLIDAY_JSON_YEAR})`,
      description:
        "Copy this URL into a browser to check or download the JSON file, " +
        "then select it in the file setting above. Reference only: editing " +
        "this field does not change the loaded data. Other years: " +
        `${formatHolidayJsonUrls(HOLIDAY_JSON_YEARS)}. ` +
        `Mirror template: ${CN_HOLIDAY_JSON_MIRROR_TEMPLATE}`,
      public: true,
      type: SettingItemType.String,
      value: LATEST_HOLIDAY_JSON_URL,
      section: SETTINGS_SECTION_ID,
    },
    [CN_HOLIDAY_STATUS]: {
      label: "Holiday Data Status",
      description:
        "Summary of the holiday data currently in use: available years, " +
        "bundled and imported years, last import and source URLs. Managed " +
        "by the plugin; updated after a file import.",
      public: true,
      type: SettingItemType.String,
      value: getInitialHolidayStatus(),
      section: SETTINGS_SECTION_ID,
    },
    [CN_HOLIDAY_FILE_CACHE]: {
      label: "Chinese Holiday File Cache",
      public: false,
      type: SettingItemType.String,
      value: "",
      section: SETTINGS_SECTION_ID,
    },
    [CN_HOLIDAY_LAST_IMPORT]: {
      label: "Chinese Holiday Last Import",
      public: false,
      type: SettingItemType.String,
      value: "",
      section: SETTINGS_SECTION_ID,
    },
  });

  await refreshHolidayStatus();

  await joplin.settings.onChange(async ({ keys }) => {
    if (keys.includes(CN_HOLIDAY_FILE)) {
      await runHolidayImportFromSettings();
    }

    keys.forEach((key) => {
      settingObservers[key]?.forEach(async (callback) => {
        callback(await joplin.settings.value(key));
      });
    });
  });
}

/**
 * Alerts panel when certain settings change.
 */
export async function registerPanelAlertOnSettingChange(panelHandle: string) {
  await onSettingChangeAlertPanel(panelHandle, SHOW_MODIFIED_NOTES);
  await onSettingChangeAlertPanel(panelHandle, SHOW_RELATED_NOTES);
  await onSettingChangeAlertPanel(panelHandle, FILTER_NOTES_BY_NOTEBOOK);
  await onSettingChangeAlertPanel(panelHandle, WEEK_START_DAY);
  await onSettingChangeAlertPanel(panelHandle, CALENDAR_ONLY_MODE);
  await onSettingChangeAlertPanel(panelHandle, SHOW_CN_HOLIDAYS);
  await onSettingChangeAlertPanel(panelHandle, CN_HOLIDAY_FILE);
}

const PANEL_SETTINGS_KEYS = [
  SHOW_CALENDAR_BUTTON,
  SHOW_MODIFIED_NOTES,
  SHOW_RELATED_NOTES,
  FILTER_NOTES_BY_NOTEBOOK,
  WEEK_START_DAY,
  CALENDAR_ONLY_MODE,
  SHOW_CN_HOLIDAYS,
  CN_HOLIDAY_FILE,
  CN_HOLIDAY_FILE_CACHE,
];

/**
 * Get a snapshot of all settings used by the panel.
 *
 * Used by the webview to initialize itself without triggering any note
 * searches before the actual mode is known.
 */
export async function getSettingsSnapshot(): Promise<Record<string, any>> {
  const values = await Promise.all(
    PANEL_SETTINGS_KEYS.map((key) => joplin.settings.value(key))
  );

  return PANEL_SETTINGS_KEYS.reduce<Record<string, any>>(
    (snapshot, key, index) => {
      snapshot[key] = values[index];
      return snapshot;
    },
    {}
  );
}

export async function triggerAllSettingsCallbacks() {
  Object.entries(settingObservers).forEach(async ([key, callbacks]) => {
    callbacks.forEach(async (callback) => {
      callback(await joplin.settings.value(key));
    });
  });
}

export async function onSettingChange(
  key: string,
  callback: (value: any) => void
) {
  settingObservers[key] = settingObservers[key] || [];
  settingObservers[key].push(callback);
}

/**
 * Post a SettingsChanged message to webview whenever settings change.
 *
 * @param handle The handle of the webview
 * @param key The key of the setting that changed
 *
 * @see {MsgType.SettingsChanged} For post message type.
 */
export async function onSettingChangeAlertPanel(handle: string, key: string) {
  await onSettingChange(key, (value) => {
    joplin.views.panels.postMessage(handle, {
      type: MsgType.SettingChanged,
      key,
      value,
    });
  });
}
