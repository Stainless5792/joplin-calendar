jest.mock(
  "api",
  () => ({
    settings: {
      value: jest.fn(),
      setValue: jest.fn(),
    },
    require: jest.fn(),
    views: {
      dialogs: {
        create: jest.fn(),
        addScript: jest.fn(),
        setHtml: jest.fn(),
        setButtons: jest.fn(),
        open: jest.fn(),
        showMessageBox: jest.fn(),
      },
    },
    clipboard: {
      writeText: jest.fn(),
    },
  }),
  { virtual: true }
);

import joplin from "api";
import {
  CN_HOLIDAY_FILE,
  CN_HOLIDAY_FILE_CACHE,
  CN_HOLIDAY_LAST_IMPORT,
} from "@constants/Settings";
import { reimportHolidayFile } from "../holidayDataActions";

const store: Record<string, unknown> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(store).forEach((key) => delete store[key]);

  jest
    .mocked(joplin.settings.value)
    .mockImplementation(async (key: string) => store[key]);
  jest
    .mocked(joplin.settings.setValue)
    .mockImplementation(async (key: string, value: unknown) => {
      store[key] = value;
    });

  jest.mocked(joplin.views.dialogs.create).mockResolvedValue("dialog-handle");
  jest.mocked(joplin.views.dialogs.addScript).mockResolvedValue(undefined);
  jest.mocked(joplin.views.dialogs.setHtml).mockResolvedValue("");
  jest.mocked(joplin.views.dialogs.setButtons).mockResolvedValue([]);
  jest.mocked(joplin.views.dialogs.open).mockResolvedValue({ id: "ok" });
  jest.mocked(joplin.views.dialogs.showMessageBox).mockResolvedValue(0);
  jest.mocked(joplin.clipboard.writeText).mockResolvedValue(undefined);
});

describe("reimportHolidayFile", () => {
  it("explains what to do when no file is selected", async () => {
    store[CN_HOLIDAY_FILE] = "";

    await reimportHolidayFile();

    expect(joplin.views.dialogs.showMessageBox).toHaveBeenCalledWith(
      expect.stringContaining("No holiday data file is selected")
    );
  });

  it("re-reads the current file and shows the result", async () => {
    store[CN_HOLIDAY_FILE] = "/tmp/2027.json";
    jest.mocked(joplin.require).mockReturnValue({
      statSync: () => ({ isFile: () => true, size: 100 }),
      readFileSync: () =>
        JSON.stringify({
          year: 2027,
          papers: [],
          days: [{ name: "元旦", date: "2027-01-01", isOffDay: true }],
        }),
    });

    await reimportHolidayFile();

    expect(joplin.views.dialogs.setHtml).toHaveBeenLastCalledWith(
      "dialog-handle",
      expect.stringContaining("Holiday data imported")
    );
    expect(store[CN_HOLIDAY_FILE_CACHE]).toContain("2027-01-01");
    expect(store[CN_HOLIDAY_LAST_IMPORT]).toContain('"ok":true');
  });

  it("retries without changing the setting", async () => {
    store[CN_HOLIDAY_FILE] = "/tmp/2027.json";
    let readCount = 0;
    jest.mocked(joplin.require).mockReturnValue({
      statSync: () => ({ isFile: () => true, size: 100 }),
      readFileSync: () => {
        readCount += 1;
        return readCount === 1
          ? "{not json"
          : JSON.stringify({
              year: 2027,
              papers: [],
              days: [{ name: "元旦", date: "2027-01-01", isOffDay: true }],
            });
      },
    });
    jest
      .mocked(joplin.views.dialogs.open)
      .mockResolvedValueOnce({ id: "retry" })
      .mockResolvedValueOnce({ id: "ok" });

    await reimportHolidayFile();

    expect(readCount).toBe(2);
    expect(joplin.views.dialogs.open).toHaveBeenCalledTimes(2);
    expect(joplin.views.dialogs.setHtml).toHaveBeenLastCalledWith(
      "dialog-handle",
      expect.stringContaining("Holiday data imported")
    );
  });
});
