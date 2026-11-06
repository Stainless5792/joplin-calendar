import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import moment from "moment";
import CalendarCell from "../CalendarCell";

function renderCell(cell: React.ReactElement) {
  return render(
    <table>
      <tbody>
        <tr>{cell}</tr>
      </tbody>
    </table>
  );
}

describe("CalendarCell holidays", () => {
  it("keeps the number-only text and exposes the holiday name in the title", () => {
    renderCell(
      <CalendarCell
        date={moment("2026-02-17")}
        showDots={false}
        holiday={{ name: "春节", isOffDay: true }}
      />
    );

    const cell = screen.getByRole("cell");
    expect(cell.textContent).toBe("17");
    expect(cell).toHaveAttribute("title", "2026-02-17 春节（放假）");
  });

  it("describes make-up workdays in the title", () => {
    renderCell(
      <CalendarCell
        date={moment("2026-02-14")}
        showDots={false}
        holiday={{ name: "春节", isOffDay: false }}
      />
    );

    expect(screen.getByRole("cell")).toHaveAttribute(
      "title",
      "2026-02-14 春节（调休上班）"
    );
  });

  it("keeps holiday markers on muted days", () => {
    renderCell(
      <CalendarCell
        date={moment("2026-02-17")}
        muted
        showDots={false}
        holiday={{ name: "春节", isOffDay: true }}
      />
    );

    const cell = screen.getByRole("cell");
    expect(cell).toHaveAttribute("title", "2026-02-17 春节（放假）");
    expect(cell).toHaveStyle(
      "background-image: linear-gradient(rgba(217, 48, 37, 0.14), rgba(217, 48, 37, 0.14))"
    );
  });

  it("renders a month label when requested", () => {
    renderCell(
      <CalendarCell
        date={moment("2026-02-17")}
        showDots={false}
        showMonthLabel
      />
    );

    expect(screen.getByRole("cell")).toHaveTextContent(/Feb\s*17/);
  });

  it("tints holidays and make-up workdays differently", () => {
    const { unmount } = renderCell(
      <CalendarCell
        date={moment("2026-02-17")}
        showDots={false}
        holiday={{ name: "春节", isOffDay: true }}
      />
    );

    expect(screen.getByRole("cell")).toHaveStyle(
      "background-image: linear-gradient(rgba(217, 48, 37, 0.14), rgba(217, 48, 37, 0.14))"
    );
    unmount();

    renderCell(
      <CalendarCell
        date={moment("2026-02-14")}
        showDots={false}
        holiday={{ name: "春节", isOffDay: false }}
      />
    );

    expect(screen.getByRole("cell")).toHaveStyle(
      "background-image: linear-gradient(rgba(47, 111, 208, 0.13), rgba(47, 111, 208, 0.13))"
    );
  });

  it("renders nothing special for ordinary days", () => {
    renderCell(<CalendarCell date={moment("2026-03-02")} showDots={false} />);

    const cell = screen.getByRole("cell");
    expect(cell.textContent).toBe("2");
    expect(cell).not.toHaveAttribute("title");
  });
});
