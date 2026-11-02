import joplin from "api";
import { CN_HOLIDAY_FILE_CACHE, CN_HOLIDAY_STATUS } from "@constants/Settings";
import {
  getHolidayData,
  importHolidayFile,
  refreshHolidayStatus,
} from "../holidayData";

jest.mock(
  "api",
  () => ({
    settings: {
      value: jest.fn(),
      setValue: jest.fn(),
    },
    require: jest.fn(),
  }),
  { virtual: true }
);

const mockedValue = jest.mocked(joplin.settings.value);
const mockedSetValue = jest.mocked(joplin.settings.setValue);
const mockedRequire = jest.mocked(joplin.require);

const filePayload = {
  year: 2027,
  papers: ["https://www.gov.cn/example"],
  days: [{ name: "元旦", date: "2027-01-01", isOffDay: true }],
};

const fileCache = {
  days: filePayload.days,
  sources: filePayload.papers,
  fetchedYears: [2027],
  updatedAt: "2026-11-06T10:00:00.000Z",
  fileName: "/tmp/2027.json",
};

function mockStoredFile(value = "") {
  mockedValue.mockImplementation(async (key: string) => {
    if (key === CN_HOLIDAY_FILE_CACHE) return value;
    return "";
  });
}

describe("holiday cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("imports a local file and marks it as the active source", async () => {
    mockedRequire.mockReturnValue({
      readFileSync: () => JSON.stringify(filePayload),
    });
    mockStoredFile(JSON.stringify(fileCache));

    const cache = await importHolidayFile("/tmp/2027.json");

    expect(cache?.days).toEqual(filePayload.days);
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_FILE_CACHE,
      expect.stringContaining("2027-01-01")
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_STATUS,
      expect.stringContaining("Source: imported file")
    );
  });

  it("keeps the previous data and reports an import error", async () => {
    mockedRequire.mockReturnValue({ readFileSync: () => "{not json" });

    const cache = await importHolidayFile("/tmp/broken.json");

    expect(cache).toBeNull();
    expect(mockedSetValue).not.toHaveBeenCalledWith(
      CN_HOLIDAY_FILE_CACHE,
      expect.anything()
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_STATUS,
      expect.stringContaining("Import failed")
    );
  });

  it("clears the imported file", async () => {
    await importHolidayFile("");

    expect(mockedSetValue).toHaveBeenCalledWith(CN_HOLIDAY_FILE_CACHE, "");
  });

  it("describes bundled data when no file is imported", async () => {
    mockStoredFile();

    const status = await refreshHolidayStatus();

    expect(status).toContain("Source: bundled data");
  });

  it("returns the stored file cache", async () => {
    mockStoredFile("cached-file");

    await expect(getHolidayData()).resolves.toEqual({
      fileCache: "cached-file",
    });
  });
});
