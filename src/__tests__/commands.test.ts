jest.mock(
  "api",
  () => ({
    commands: {
      register: jest.fn(),
      execute: jest.fn(),
    },
    settings: {
      value: jest.fn(),
      setValue: jest.fn(),
    },
    views: {
      menus: {
        create: jest.fn(),
      },
      panels: {
        visible: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
      },
    },
  }),
  { virtual: true }
);

jest.mock("../holidayDataActions", () => ({
  reimportHolidayFile: jest.fn(),
}));

jest.mock("../holidayDataManager", () => ({
  showHolidayDataManager: jest.fn(),
}));

import joplin from "api";
import {
  MANAGE_HOLIDAY_DATA_COMMAND,
  REIMPORT_HOLIDAY_FILE_COMMAND,
  registerCommands,
} from "../commands";
import { reimportHolidayFile } from "../holidayDataActions";
import { showHolidayDataManager } from "../holidayDataManager";

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(reimportHolidayFile).mockResolvedValue(undefined);
  jest.mocked(showHolidayDataManager).mockResolvedValue(undefined);
});

describe("registerCommands", () => {
  it("registers holiday data commands and menu items", async () => {
    await registerCommands("panel");

    const registeredNames = jest
      .mocked(joplin.commands.register)
      .mock.calls.map(([command]) => command.name);

    expect(registeredNames).toEqual(
      expect.arrayContaining([
        REIMPORT_HOLIDAY_FILE_COMMAND,
        MANAGE_HOLIDAY_DATA_COMMAND,
      ])
    );
    expect(joplin.views.menus.create).toHaveBeenCalledWith(
      "calendar-menu",
      "Calendar",
      expect.arrayContaining([
        expect.objectContaining({
          commandName: MANAGE_HOLIDAY_DATA_COMMAND,
        }),
        expect.objectContaining({
          commandName: REIMPORT_HOLIDAY_FILE_COMMAND,
        }),
      ])
    );
  });

  it("executes the manage command", async () => {
    await registerCommands("panel");

    const command = jest
      .mocked(joplin.commands.register)
      .mock.calls.map(([registered]) => registered)
      .find((registered) => registered.name === MANAGE_HOLIDAY_DATA_COMMAND);

    await command?.execute();

    expect(showHolidayDataManager).toHaveBeenCalledTimes(1);
  });

  it("executes the re-import command", async () => {
    await registerCommands("panel");

    const command = jest
      .mocked(joplin.commands.register)
      .mock.calls.map(([registered]) => registered)
      .find((registered) => registered.name === REIMPORT_HOLIDAY_FILE_COMMAND);

    await command?.execute();

    expect(reimportHolidayFile).toHaveBeenCalledTimes(1);
  });
});
