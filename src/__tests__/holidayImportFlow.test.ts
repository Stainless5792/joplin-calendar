import { runHolidayImportFlow } from "../holidayImportFlow";
import type {
  HolidayImportOutcome,
  HolidayImportReport,
} from "../holidayImportReport";
import { mergeHolidayDays } from "../gui/holidays/parse";
import type { CnHolidayCache } from "../gui/holidays/types";

const years = [
  {
    year: 2027,
    papers: ["https://example.com/2027"],
    days: [{ name: "元旦", date: "2027-01-01", isOffDay: true }],
  },
];

const cache: CnHolidayCache = {
  days: mergeHolidayDays(...years.map((year) => year.days)),
  sources: ["https://example.com/2027"],
  fetchedYears: [2027],
  updatedAt: "2026-11-06T10:00:00.000Z",
  fileName: "/tmp/2027.json",
};

const successOutcome: HolidayImportOutcome = {
  status: "success",
  filePath: "/tmp/2027.json",
  years,
  cache,
};

const errorOutcome: HolidayImportOutcome = {
  status: "error",
  filePath: "/tmp/2027.json",
  error: new Error("broken"),
  previousCache: null,
};

const clearedOutcome: HolidayImportOutcome = { status: "cleared" };

function deps(
  outcomes: HolidayImportOutcome[],
  actions: string[] = [],
  paths: string[] = ["/tmp/2027.json"]
) {
  const importFile = jest.fn();
  outcomes.forEach((outcome) => importFile.mockResolvedValueOnce(outcome));

  const showReport = jest.fn();
  actions.forEach((action) => showReport.mockResolvedValueOnce(action));

  const getFilePath = jest.fn();
  paths.forEach((path) => getFilePath.mockResolvedValueOnce(path));

  return { importFile, showReport, getFilePath };
}

describe("runHolidayImportFlow", () => {
  it("clears the import without showing a dialog", async () => {
    const { importFile, showReport, getFilePath } = deps(
      [clearedOutcome],
      [],
      [""]
    );

    await runHolidayImportFlow({ importFile, showReport, getFilePath });

    expect(importFile).toHaveBeenCalledWith("");
    expect(showReport).not.toHaveBeenCalled();
  });

  it("shows one success report and stops", async () => {
    const { importFile, showReport, getFilePath } = deps(
      [successOutcome],
      ["ok"]
    );

    await runHolidayImportFlow({ importFile, showReport, getFilePath });

    expect(importFile).toHaveBeenCalledTimes(1);
    expect(showReport).toHaveBeenCalledTimes(1);
    expect((showReport.mock.calls[0][0] as HolidayImportReport).kind).toBe(
      "success"
    );
  });

  it("retries an error and shows the new result", async () => {
    const { importFile, showReport, getFilePath } = deps(
      [errorOutcome, successOutcome],
      ["retry", "ok"],
      ["/tmp/2027.json", "/tmp/2027.json"]
    );

    await runHolidayImportFlow({ importFile, showReport, getFilePath });

    expect(importFile).toHaveBeenCalledTimes(2);
    expect(showReport).toHaveBeenCalledTimes(2);
    expect((showReport.mock.calls[0][0] as HolidayImportReport).kind).toBe(
      "error"
    );
    expect((showReport.mock.calls[1][0] as HolidayImportReport).kind).toBe(
      "success"
    );
  });

  it("stops when the error dialog is closed", async () => {
    const { importFile, showReport, getFilePath } = deps(
      [errorOutcome],
      ["ok"]
    );

    await runHolidayImportFlow({ importFile, showReport, getFilePath });

    expect(importFile).toHaveBeenCalledTimes(1);
    expect(showReport).toHaveBeenCalledTimes(1);
  });

  it("stops retrying when the file path is cleared", async () => {
    const { importFile, showReport, getFilePath } = deps(
      [errorOutcome],
      ["retry"],
      ["/tmp/2027.json", ""]
    );

    await runHolidayImportFlow({ importFile, showReport, getFilePath });

    expect(importFile).toHaveBeenCalledTimes(1);
    expect(showReport).toHaveBeenCalledTimes(1);
  });
});
