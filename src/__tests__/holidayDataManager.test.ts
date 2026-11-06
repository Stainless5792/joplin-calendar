jest.mock(
  "api",
  () => ({
    settings: {
      value: jest.fn(),
    },
    views: {
      dialogs: {
        create: jest.fn(),
        addScript: jest.fn(),
        setHtml: jest.fn(),
        setButtons: jest.fn(),
        setFitToContent: jest.fn(),
        open: jest.fn(),
      },
    },
    clipboard: {
      writeText: jest.fn(),
    },
  }),
  { virtual: true }
);

jest.mock("../holidayData", () => ({
  clearImportedHolidayData: jest.fn(),
}));

jest.mock("../holidayDataActions", () => ({
  reimportHolidayFile: jest.fn(),
}));

import joplin from "api";
import {
  CN_HOLIDAY_FILE,
  CN_HOLIDAY_FILE_CACHE,
  CN_HOLIDAY_LAST_IMPORT,
} from "@constants/Settings";
import { clearImportedHolidayData } from "../holidayData";
import { reimportHolidayFile } from "../holidayDataActions";
import { showHolidayDataManager } from "../holidayDataManager";

const fileCache = {
  days: [{ name: "元旦", date: "2027-01-01", isOffDay: true }],
  sources: ["https://example.com/2027"],
  fetchedYears: [2027],
  updatedAt: "2026-11-06T10:00:00.000Z",
  fileName: "/tmp/2027.json",
};

beforeEach(() => {
  jest.clearAllMocks();

  jest.mocked(joplin.settings.value).mockImplementation(async (key: string) => {
    if (key === CN_HOLIDAY_FILE_CACHE) return JSON.stringify(fileCache);
    if (key === CN_HOLIDAY_LAST_IMPORT) return "";
    if (key === CN_HOLIDAY_FILE) return "/tmp/2027.json";
    return "";
  });

  jest.mocked(joplin.views.dialogs.create).mockResolvedValue("dialog-handle");
  jest.mocked(joplin.views.dialogs.addScript).mockResolvedValue(undefined);
  jest.mocked(joplin.views.dialogs.setHtml).mockResolvedValue("");
  jest.mocked(joplin.views.dialogs.setButtons).mockResolvedValue([]);
  jest.mocked(joplin.views.dialogs.setFitToContent).mockResolvedValue(true);
  jest.mocked(joplin.views.dialogs.open).mockResolvedValue({ id: "cancel" });
  jest.mocked(joplin.clipboard.writeText).mockResolvedValue(undefined);
  jest.mocked(clearImportedHolidayData).mockResolvedValue(undefined);
  jest.mocked(reimportHolidayFile).mockResolvedValue(undefined);
});

describe("showHolidayDataManager", () => {
  it("renders the current years and file", async () => {
    await showHolidayDataManager();

    expect(joplin.views.dialogs.setHtml).toHaveBeenLastCalledWith(
      "dialog-handle",
      expect.stringContaining("Holiday Data")
    );
    expect(joplin.views.dialogs.setHtml).toHaveBeenLastCalledWith(
      "dialog-handle",
      expect.stringContaining("2027")
    );
    expect(joplin.views.dialogs.setFitToContent).toHaveBeenCalledWith(
      "dialog-handle",
      true
    );
    expect(joplin.views.dialogs.addScript).toHaveBeenCalledWith(
      "dialog-handle",
      "gui/holidayDialogSize.js"
    );
  });

  it("copies source URLs and keeps the manager open", async () => {
    jest
      .mocked(joplin.views.dialogs.open)
      .mockResolvedValueOnce({ id: "copy" })
      .mockResolvedValueOnce({ id: "cancel" });

    await showHolidayDataManager();

    expect(joplin.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("https://example.com/2027")
    );
    expect(joplin.views.dialogs.open).toHaveBeenCalledTimes(2);
  });

  it("clears imported data and refreshes the manager", async () => {
    jest
      .mocked(joplin.views.dialogs.open)
      .mockResolvedValueOnce({ id: "clear" })
      .mockResolvedValueOnce({ id: "cancel" });

    await showHolidayDataManager();

    expect(clearImportedHolidayData).toHaveBeenCalledTimes(1);
    expect(joplin.views.dialogs.open).toHaveBeenCalledTimes(2);
  });

  it("re-imports the current file and refreshes the manager", async () => {
    jest
      .mocked(joplin.views.dialogs.open)
      .mockResolvedValueOnce({ id: "reimport" })
      .mockResolvedValueOnce({ id: "cancel" });

    await showHolidayDataManager();

    expect(reimportHolidayFile).toHaveBeenCalledTimes(1);
    expect(joplin.views.dialogs.open).toHaveBeenCalledTimes(2);
  });
});
