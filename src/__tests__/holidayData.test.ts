import joplin from "api";
import {
  CN_HOLIDAY_FILE,
  CN_HOLIDAY_FILE_CACHE,
  CN_HOLIDAY_LAST_IMPORT,
  CN_HOLIDAY_STATUS,
} from "@constants/Settings";
import {
  clearImportedHolidayData,
  getHolidayData,
  importHolidayFile,
  refreshHolidayStatus,
} from "../holidayData";
import type { HolidayImportOutcome } from "../holidayImportReport";

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
const store: Record<string, unknown> = {};

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

function seedSetting(key: string, value: unknown) {
  store[key] = value;
}

function mockFileSystem(
  options: {
    text?: string;
    size?: number;
    isFile?: boolean;
    statError?: unknown;
    readError?: unknown;
  } = {}
) {
  mockedRequire.mockReturnValue({
    statSync: () => {
      if (options.statError) throw options.statError;
      return {
        isFile: () => options.isFile ?? true,
        size: options.size ?? options.text?.length ?? 0,
      };
    },
    readFileSync: () => {
      if (options.readError) throw options.readError;
      return options.text ?? "";
    },
  });
}

function errorCode(outcome: HolidayImportOutcome): string | undefined {
  if (outcome.status !== "error") return undefined;
  return (outcome.error as { code?: string }).code;
}

describe("holiday cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(store).forEach((key) => delete store[key]);
    mockedValue.mockImplementation(async (key: string) => store[key]);
    mockedSetValue.mockImplementation(async (key: string, value: unknown) => {
      store[key] = value;
    });
  });

  it("imports a local file and marks it as the active source", async () => {
    mockFileSystem({ text: JSON.stringify(filePayload) });
    seedSetting(CN_HOLIDAY_FILE_CACHE, JSON.stringify(fileCache));

    const outcome = await importHolidayFile("/tmp/2027.json");

    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") throw new Error("Expected success");
    expect(outcome.cache.days).toEqual(filePayload.days);
    expect(outcome.years).toEqual([
      {
        year: 2027,
        papers: filePayload.papers,
        days: filePayload.days,
      },
    ]);
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_FILE_CACHE,
      expect.stringContaining("2027-01-01")
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_LAST_IMPORT,
      expect.stringContaining('"ok":true')
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_STATUS,
      expect.stringContaining("Source: bundled + imported file")
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_STATUS,
      expect.stringContaining("Available years: 2025, 2026, 2027")
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_STATUS,
      expect.stringContaining("Import succeeded")
    );
  });

  it("keeps the previous data and reports an import error", async () => {
    mockFileSystem({ text: "{not json" });
    seedSetting(CN_HOLIDAY_FILE_CACHE, JSON.stringify(fileCache));

    const outcome = await importHolidayFile("/tmp/broken.json");

    expect(outcome.status).toBe("error");
    expect(errorCode(outcome)).toBe("json.invalid");
    if (outcome.status !== "error") throw new Error("Expected error");
    expect(outcome.previousCache?.days).toEqual(filePayload.days);
    expect(mockedSetValue).not.toHaveBeenCalledWith(
      CN_HOLIDAY_FILE_CACHE,
      expect.anything()
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_LAST_IMPORT,
      expect.stringContaining('"ok":false')
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_STATUS,
      expect.stringContaining("Import failed")
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_STATUS,
      expect.stringContaining("Previous data still in use")
    );
  });

  it("restores the last failure status after a restart", async () => {
    seedSetting(CN_HOLIDAY_FILE_CACHE, JSON.stringify(fileCache));
    seedSetting(
      CN_HOLIDAY_LAST_IMPORT,
      JSON.stringify({
        at: "2026-11-06T10:00:00",
        ok: false,
        filePath: "/tmp/broken.json",
        fileName: "broken.json",
        message: "The file is not valid JSON.",
      })
    );

    const status = await refreshHolidayStatus();

    expect(status).toContain("Import failed at 2026-11-06 10:00");
    expect(status).toContain("Previous data still in use");
    expect(status).toContain("Imported: 2027");
  });

  it("reports a missing file with a stable error code", async () => {
    mockFileSystem({
      statError: Object.assign(new Error("ENOENT: no such file"), {
        code: "ENOENT",
      }),
    });

    const outcome = await importHolidayFile("/tmp/missing.json");

    expect(outcome.status).toBe("error");
    expect(errorCode(outcome)).toBe("file.notFound");
  });

  it("rejects a directory path", async () => {
    mockFileSystem({ isFile: false });

    const outcome = await importHolidayFile("/tmp");

    expect(outcome.status).toBe("error");
    expect(errorCode(outcome)).toBe("file.isDirectory");
  });

  it("rejects files that are too large to be holiday data", async () => {
    mockFileSystem({ size: 3 * 1024 * 1024, text: "{}" });

    const outcome = await importHolidayFile("/tmp/huge.json");

    expect(outcome.status).toBe("error");
    expect(errorCode(outcome)).toBe("file.tooLarge");
  });

  it("clears the imported file", async () => {
    const outcome = await importHolidayFile("");

    expect(outcome.status).toBe("cleared");
    expect(mockedSetValue).toHaveBeenCalledWith(CN_HOLIDAY_FILE_CACHE, "");
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_LAST_IMPORT,
      expect.stringContaining('"cleared":true')
    );
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_STATUS,
      expect.stringContaining("Import cleared")
    );
  });

  it("clears both the selected path and the cached data", async () => {
    seedSetting(CN_HOLIDAY_FILE, "/tmp/2027.json");
    seedSetting(CN_HOLIDAY_FILE_CACHE, JSON.stringify(fileCache));

    await clearImportedHolidayData();

    expect(mockedSetValue).toHaveBeenCalledWith(CN_HOLIDAY_FILE, "");
    expect(mockedSetValue).toHaveBeenCalledWith(CN_HOLIDAY_FILE_CACHE, "");
    expect(mockedSetValue).toHaveBeenCalledWith(
      CN_HOLIDAY_LAST_IMPORT,
      expect.stringContaining('"cleared":true')
    );
    expect(store[CN_HOLIDAY_STATUS]).toContain("Import cleared");
  });

  it("describes bundled data when no file is imported", async () => {
    const status = await refreshHolidayStatus();

    expect(status).toContain("Source: bundled data");
    expect(status).toContain("Available years: 2025, 2026");
  });

  it("returns the stored file cache", async () => {
    seedSetting(CN_HOLIDAY_FILE_CACHE, "cached-file");

    await expect(getHolidayData()).resolves.toEqual({
      fileCache: "cached-file",
    });
  });
});
