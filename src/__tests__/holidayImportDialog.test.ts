jest.mock(
  "api",
  () => ({
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

import joplin from "api";
import { showHolidayImportDialog } from "../holidayImportDialog";
import type { HolidayImportReport } from "../holidayImportReport";

const dialogs = joplin.views.dialogs;
const clipboard = joplin.clipboard;

function report(kind: "success" | "error"): HolidayImportReport {
  return {
    kind,
    filePath: "/tmp/a.json",
    fileName: "a.json",
    title:
      kind === "success"
        ? "Holiday data imported"
        : "Holiday data not imported",
    summary:
      kind === "success"
        ? { years: 1, days: 1, offDays: 1, workdays: 0 }
        : undefined,
    error:
      kind === "error"
        ? { reason: "Broken file", hints: ["Try again"] }
        : undefined,
  };
}

beforeEach(() => {
  jest.mocked(dialogs.create).mockResolvedValue("dialog-handle");
  jest.mocked(dialogs.addScript).mockResolvedValue(undefined);
  jest.mocked(dialogs.setHtml).mockResolvedValue("");
  jest.mocked(dialogs.setButtons).mockResolvedValue([]);
  jest.mocked(dialogs.setFitToContent).mockResolvedValue(true);
  jest.mocked(dialogs.open).mockResolvedValue({ id: "ok" });
  jest.mocked(clipboard.writeText).mockResolvedValue(undefined);
});

describe("showHolidayImportDialog", () => {
  it("offers copy and OK for a success report", async () => {
    await showHolidayImportDialog(report("success"));

    expect(dialogs.setHtml).toHaveBeenLastCalledWith(
      "dialog-handle",
      expect.stringContaining("Holiday data imported")
    );
    expect(dialogs.setButtons).toHaveBeenLastCalledWith("dialog-handle", [
      { id: "copy", title: "Copy Details" },
      { id: "ok", title: "OK" },
    ]);
    expect(dialogs.addScript).toHaveBeenCalledWith(
      "dialog-handle",
      "gui/holidayDialogSize.js"
    );
  });

  it("offers copy, retry and close for an error report", async () => {
    await showHolidayImportDialog(report("error"));

    expect(dialogs.setButtons).toHaveBeenLastCalledWith("dialog-handle", [
      { id: "copy", title: "Copy Details" },
      { id: "retry", title: "Try Again" },
      { id: "cancel", title: "Close" },
    ]);
  });

  it("copies the details and reopens the dialog", async () => {
    jest
      .mocked(dialogs.open)
      .mockResolvedValueOnce({ id: "copy" })
      .mockResolvedValueOnce({ id: "ok" });

    await expect(showHolidayImportDialog(report("error"))).resolves.toBe("ok");

    expect(clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(jest.mocked(clipboard.writeText).mock.calls[0][0]).toContain(
      "Result: failed"
    );
    expect(dialogs.open).toHaveBeenCalledTimes(2);
  });

  it("returns the clicked button id", async () => {
    jest.mocked(dialogs.open).mockResolvedValue({ id: "retry" });

    await expect(showHolidayImportDialog(report("error"))).resolves.toBe(
      "retry"
    );
  });

  it("reuses the same dialog handle", async () => {
    await showHolidayImportDialog(report("success"));
    const createCalls = jest.mocked(dialogs.create).mock.calls.length;

    await showHolidayImportDialog(report("error"));

    expect(dialogs.create).toHaveBeenCalledTimes(createCalls);
  });

  it("refits the dialog to its content on every open", async () => {
    await showHolidayImportDialog(report("success"));
    await showHolidayImportDialog(report("error"));

    expect(dialogs.setFitToContent).toHaveBeenCalledWith("dialog-handle", true);
    expect(dialogs.setFitToContent).toHaveBeenCalledTimes(2);
  });

  it("does not break the import when the dialog cannot be opened", async () => {
    jest.mocked(dialogs.open).mockRejectedValueOnce(new Error("dialog failed"));

    await expect(showHolidayImportDialog(report("error"))).resolves.toBe("ok");
  });
});
