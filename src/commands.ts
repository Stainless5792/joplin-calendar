import { FILTER_NOTES_BY_NOTEBOOK } from "@constants/Settings";
import joplin from "api";
import { reimportHolidayFile } from "./holidayDataActions";
import { showHolidayDataManager } from "./holidayDataManager";

export const TOGGLE_CALENDAR_COMMAND = "toggleCalendar";
export const FILTER_BY_NOTEBOOK_COMMAND = "filterNotesByNotebook";
export const REIMPORT_HOLIDAY_FILE_COMMAND = "reimportHolidayData";
export const MANAGE_HOLIDAY_DATA_COMMAND = "manageHolidayData";

export async function registerCommands(panelHandle: string) {
  await joplin.commands.register({
    name: TOGGLE_CALENDAR_COMMAND,
    label: "Toggle Calendar",
    iconName: "far fa-calendar",
    execute: async () => {
      if (await joplin.views.panels.visible(panelHandle)) {
        await joplin.views.panels.hide(panelHandle);
      } else {
        await joplin.views.panels.show(panelHandle);
      }
    },
  });

  await joplin.commands.register({
    name: FILTER_BY_NOTEBOOK_COMMAND,
    label: "Toggle Filter by Notebook",
    iconName: "fas fa-filter",
    execute: async () => {
      const currentSetting = await joplin.settings.value(
        FILTER_NOTES_BY_NOTEBOOK
      );
      if (currentSetting) {
        await joplin.settings.setValue(FILTER_NOTES_BY_NOTEBOOK, false);
      } else {
        await joplin.settings.setValue(FILTER_NOTES_BY_NOTEBOOK, true);
      }
    },
  });

  await joplin.commands.register({
    name: REIMPORT_HOLIDAY_FILE_COMMAND,
    label: "Re-import Holiday Data",
    iconName: "fas fa-sync",
    execute: async () => {
      await reimportHolidayFile();
    },
  });

  await joplin.commands.register({
    name: MANAGE_HOLIDAY_DATA_COMMAND,
    label: "Manage Holiday Data",
    iconName: "far fa-calendar-check",
    execute: async () => {
      await showHolidayDataManager();
    },
  });

  joplin.views.menus.create("calendar-menu", "Calendar", [
    {
      label: "Toggle Calendar",
      commandName: TOGGLE_CALENDAR_COMMAND,
      accelerator: "CmdOrCtrl+Shift+`",
    },
    {
      label: "Holiday Data...",
      commandName: MANAGE_HOLIDAY_DATA_COMMAND,
    },
    {
      label: "Re-import Holiday Data",
      commandName: REIMPORT_HOLIDAY_FILE_COMMAND,
    },
  ]);
}
