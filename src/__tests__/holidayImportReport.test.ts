import {
  buildHolidayImportDetails,
  buildHolidayImportReport,
  buildLastImportRecord,
  HolidayImportError,
  parseLastImport,
  renderHolidayImportHtml,
  type HolidayImportOutcome,
} from "../holidayImportReport";
import { HolidayParseError, mergeHolidayDays } from "../gui/holidays/parse";
import type { CnHolidayCache, CnHolidayYear } from "../gui/holidays/types";

function year(
  yearValue: number,
  days: CnHolidayYear["days"],
  papers: string[] = [`https://example.com/${yearValue}`]
): CnHolidayYear {
  return { year: yearValue, papers, days };
}

function successOutcome(
  years: CnHolidayYear[]
): Extract<HolidayImportOutcome, { status: "success" }> {
  const filePath = "/tmp/2027.json";
  const cache: CnHolidayCache = {
    days: mergeHolidayDays(...years.map((entry) => entry.days)),
    sources: [
      ...new Set(years.flatMap((entry) => entry.papers).filter(Boolean)),
    ],
    fetchedYears: years.map((entry) => entry.year),
    updatedAt: "2026-11-06T10:00:00.000Z",
    fileName: filePath,
  };

  return { status: "success", filePath, years, cache };
}

function errorOutcome(
  error: unknown,
  previousCache: CnHolidayCache | null = null
): HolidayImportOutcome {
  return {
    status: "error",
    filePath: "/tmp/broken.json",
    error,
    previousCache,
  };
}

const sampleYear = year(2027, [
  { name: "元旦", date: "2027-01-01", isOffDay: true },
  { name: "春节", date: "2027-02-06", isOffDay: true },
  { name: "春节", date: "2027-02-07", isOffDay: false },
]);

describe("buildHolidayImportReport", () => {
  it("summarizes a successful single-year import", () => {
    const report = buildHolidayImportReport(successOutcome([sampleYear]));

    expect(report).toMatchObject({
      kind: "success",
      title: "Holiday data imported",
      fileName: "2027.json",
      coverage: "2027",
      summary: { years: 1, days: 3, offDays: 2, workdays: 1 },
      yearRows: [{ year: 2027, days: 3, offDays: 2, workdays: 1, papers: 1 }],
    });
    expect(report.importedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it("warns when the file overlaps bundled years", () => {
    const report = buildHolidayImportReport(
      successOutcome([
        year(2026, [{ name: "春节", date: "2026-02-17", isOffDay: true }]),
        year(2027, [{ name: "元旦", date: "2027-01-01", isOffDay: true }]),
      ])
    );

    expect(report.coverage).toBe("2026–2027");
    expect(report.yearRows).toHaveLength(2);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("overlaps bundled years"),
      ])
    );
  });

  it("warns when the file has no source announcement URLs", () => {
    const report = buildHolidayImportReport(
      successOutcome([
        year(2027, [{ name: "元旦", date: "2027-01-01", isOffDay: true }], []),
      ])
    );

    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("No source announcement"),
      ])
    );
  });

  it("warns when duplicate dates are merged across year entries", () => {
    const report = buildHolidayImportReport(
      successOutcome([
        year(2026, [{ name: "元旦", date: "2026-12-31", isOffDay: true }]),
        year(2027, [{ name: "元旦", date: "2026-12-31", isOffDay: true }]),
      ])
    );

    expect(report.summary?.days).toBe(1);
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("duplicate date")])
    );
  });

  it("warns when holiday names contain invalid UTF-8 characters", () => {
    const report = buildHolidayImportReport(
      successOutcome([
        year(2027, [
          { name: "春\uFFFD节", date: "2027-02-06", isOffDay: true },
        ]),
      ])
    );

    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("UTF-8")])
    );
  });

  it("describes a cleared import without an error", () => {
    const report = buildHolidayImportReport({ status: "cleared" });

    expect(report.kind).toBe("success");
    expect(report.title).toBe("Holiday data cleared");
    expect(report.summary).toBeUndefined();
  });
});

describe("buildHolidayImportReport errors", () => {
  it("maps a JSON syntax error and keeps its position", () => {
    const report = buildHolidayImportReport(
      errorOutcome(
        new HolidayParseError(
          "json.invalid",
          "Holiday file is not valid JSON",
          { line: 4, column: 3 }
        )
      )
    );

    expect(report.kind).toBe("error");
    expect(report.title).toBe("Holiday data not imported");
    expect(report.error?.reason).toBe("The file is not valid JSON.");
    expect(report.error?.details).toContain("Holiday file is not valid JSON");
    expect(report.error?.line).toBe(4);
    expect(report.error?.column).toBe(3);
    expect(report.error?.hints.length).toBeGreaterThan(0);
    expect(report.previousDataPreserved).toBe(false);
  });

  it("maps a missing file error", () => {
    const report = buildHolidayImportReport(
      errorOutcome(
        new HolidayImportError(
          "file.notFound",
          "ENOENT: no such file or directory"
        )
      )
    );

    expect(report.error?.reason).toBe("The file could not be found.");
    expect(report.error?.hints).toEqual(
      expect.arrayContaining([expect.stringContaining("moved or deleted")])
    );
  });

  it("classifies raw filesystem errors by their code", () => {
    const error = Object.assign(
      new Error("EACCES: permission denied, open '/tmp/a.json'"),
      { code: "EACCES" }
    );
    const report = buildHolidayImportReport(errorOutcome(error));

    expect(report.error?.reason).toBe("The file could not be read.");
  });

  it("reports that previously imported data is still active", () => {
    const previousCache: CnHolidayCache = {
      days: [{ name: "春节", date: "2026-02-17", isOffDay: true }],
      sources: [],
      fetchedYears: [2026],
      updatedAt: "2026-11-01T10:00:00.000Z",
    };
    const report = buildHolidayImportReport(
      errorOutcome(
        new HolidayParseError("year.noDays", "No holiday days found for 2027", {
          year: 2027,
        }),
        previousCache
      )
    );

    expect(report.previousDataPreserved).toBe(true);
    expect(report.error?.reason).toBe(
      "No holiday days were found for this year."
    );
  });
});

describe("renderHolidayImportHtml", () => {
  it("renders the success summary and year table", () => {
    const html = renderHolidayImportHtml(
      buildHolidayImportReport(successOutcome([sampleYear]))
    );

    expect(html).toContain("Holiday data imported");
    expect(html).toContain("2027.json");
    expect(html).toContain("2027");
    expect(html).toContain("jci-dialog");
  });

  it("sizes the import dialog through html/body and uses an inner scroll area", () => {
    const html = renderHolidayImportHtml(
      buildHolidayImportReport(successOutcome([sampleYear]))
    );

    expect(html).toContain("width: 520px");
    expect(html).toContain("height: 520px");
    expect(html).toContain('class="jci-scroll"');
    expect(html).not.toContain("90vw");
  });

  it("escapes file paths, names and error details", () => {
    const maliciousOutcome = successOutcome([
      year(2027, [
        {
          name: "<b>春节</b>",
          date: "2027-02-06",
          isOffDay: true,
        },
      ]),
    ]);
    maliciousOutcome.filePath = "/tmp/<script>alert(1)</script>.json";

    const successHtml = renderHolidayImportHtml(
      buildHolidayImportReport(maliciousOutcome)
    );
    expect(successHtml).not.toContain("<script>");
    expect(successHtml).not.toContain("<b>春节</b>");
    expect(successHtml).toContain("&lt;script&gt;");

    const errorHtml = renderHolidayImportHtml(
      buildHolidayImportReport(
        errorOutcome(
          new HolidayImportError(
            "file.unreadable",
            '<img src=x onerror="alert(1)">'
          )
        )
      )
    );
    expect(errorHtml).not.toContain("<img");
    expect(errorHtml).toContain("&lt;img");
  });

  it("renders error guidance", () => {
    const html = renderHolidayImportHtml(
      buildHolidayImportReport(
        errorOutcome(
          new HolidayParseError(
            "json.invalid",
            "Holiday file is not valid JSON",
            { line: 2, column: 10 }
          )
        )
      )
    );

    expect(html).toContain("The file is not valid JSON.");
    expect(html).toContain("WHAT TO CHECK");
    expect(html).toContain("TECHNICAL DETAILS");
    expect(html).toContain("line 2, column 10");
  });
});

describe("last import record", () => {
  const at = "2026-11-06T10:00:00.000Z";

  it("records a successful import", () => {
    const record = buildLastImportRecord(successOutcome([sampleYear]), at);

    expect(record).toMatchObject({
      at,
      ok: true,
      filePath: "/tmp/2027.json",
      fileName: "2027.json",
      years: [2027],
    });
    expect(record.cleared).toBeUndefined();
  });

  it("records a failed import with its position and friendly reason", () => {
    const record = buildLastImportRecord(
      errorOutcome(
        new HolidayParseError(
          "json.invalid",
          "Holiday file is not valid JSON",
          { line: 4, column: 3 }
        )
      ),
      at
    );

    expect(record).toMatchObject({
      at,
      ok: false,
      code: "json.invalid",
      message: "The file is not valid JSON.",
      details: "Holiday file is not valid JSON",
      line: 4,
      column: 3,
    });
  });

  it("records a cleared import", () => {
    expect(buildLastImportRecord({ status: "cleared" }, at)).toMatchObject({
      at,
      ok: true,
      cleared: true,
    });
  });

  it("parses a stored record and rejects invalid values", () => {
    const record = buildLastImportRecord(successOutcome([sampleYear]), at);

    expect(parseLastImport(JSON.stringify(record))).toEqual(record);
    expect(parseLastImport("")).toBeNull();
    expect(parseLastImport("{not json")).toBeNull();
    expect(parseLastImport(JSON.stringify({ ok: "yes" }))).toBeNull();
  });
});

describe("buildHolidayImportDetails", () => {
  it("builds copyable success details", () => {
    const details = buildHolidayImportDetails(
      buildHolidayImportReport(successOutcome([sampleYear]))
    );

    expect(details).toContain("Result: imported");
    expect(details).toContain("/tmp/2027.json");
    expect(details).toContain("Days: 3");
    expect(details).toContain("Warnings:");
  });

  it("builds copyable failure details", () => {
    const details = buildHolidayImportDetails(
      buildHolidayImportReport(
        errorOutcome(
          new HolidayParseError(
            "json.invalid",
            "Holiday file is not valid JSON",
            { line: 4, column: 3 }
          )
        )
      )
    );

    expect(details).toContain("Result: failed");
    expect(details).toContain("Reason: The file is not valid JSON.");
    expect(details).toContain("Details: Holiday file is not valid JSON");
    expect(details).toContain("line 4, column 3");
    expect(details).toContain("Hints:");
  });
});
