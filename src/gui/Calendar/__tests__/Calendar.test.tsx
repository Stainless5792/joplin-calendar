import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Calendar from "..";
import moment from "moment";
import { act } from "react-dom/test-utils";
import useGetMonthStatistics from "../../hooks/useGetMonthStatistics";
import useWebviewApiOnMessage from "../../hooks/useWebViewApiOnMessage";
import { WeekStartDay, CalendarViewMode } from "@constants/Settings";
import useOnSettingsChange from "../../hooks/useOnSettingsChange";

jest.mock("../../hooks/useGetMonthStatistics");
const mockedUseGetMonthStatistics = jest.mocked(useGetMonthStatistics);

jest.mock("../../hooks/useOnSettingsChange");
const mockedUseOnSettingsChange = jest.mocked(useOnSettingsChange);

global.webviewApi = {
  postMessage: jest.fn(),
  onMessage: jest.fn(),
};

jest.mock("../../hooks/useWebViewApiOnMessage");
const mockedUseWebviewApiOnMessage = jest.mocked(useWebviewApiOnMessage);

describe("calendar", () => {
  beforeEach(() => {
    mockedUseGetMonthStatistics.mockReturnValue({
      data: {
        notesPerDay: {},
      },
      refetch: jest.fn(),
    });
    mockedUseOnSettingsChange.mockReset();
  });

  it("displays dates correctly", () => {
    const date = moment("May-29-2023", "MMM-DD-YYYY");
    render(<Calendar selectedDate={date} />);

    expect(screen.getByText("May 2023")).toBeDefined();

    const cells = screen.getAllByRole("cell");
    expect(cells).toHaveLength(42); // 7 days * 6 rows

    // Assert April
    expect(cells[0].textContent).toEqual("30");

    // Assert May
    for (let i = 1; i <= 31; i++) {
      expect(cells[i].textContent).toEqual(i.toString());
    }

    // Assert June
    for (let i = 1; i <= 10; i++) {
      expect(cells[i + 31].textContent).toEqual(i.toString());
    }
  });

  it("displays dates correctly if week starts on Monday", () => {
    mockedUseOnSettingsChange.mockReturnValue(WeekStartDay.Monday);

    const date = moment("May-29-2023", "MMM-DD-YYYY");
    render(<Calendar selectedDate={date} />);

    expect(screen.getByText("May 2023")).toBeDefined();

    const cells = screen.getAllByRole("cell");
    expect(cells).toHaveLength(42); // 7 days * 6 rows

    // Assert May (No April)
    for (let i = 0; i <= 30; i++) {
      expect(cells[i].textContent).toEqual((i + 1).toString());
    }

    // Assert June
    for (let i = 1; i <= 11; i++) {
      expect(cells[i + 30].textContent).toEqual(i.toString());
    }
  });

  it("does not render note dots when showDots is false", () => {
    const date = moment("May-29-2023", "MMM-DD-YYYY");
    const { container } = render(
      <Calendar
        selectedDate={date}
        statistics={{ [date.format("L")]: 9 }}
        showDots={false}
      />
    );

    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("renders one dot per three notes", () => {
    const date = moment("May-29-2023", "MMM-DD-YYYY");
    const { container } = render(
      <Calendar selectedDate={date} statistics={{ [date.format("L")]: 9 }} />
    );

    expect(container.querySelectorAll("span")).toHaveLength(3);
  });

  it("shows the week number only when requested", () => {
    mockedUseOnSettingsChange.mockReturnValue(WeekStartDay.Monday);

    const date = moment("May-29-2023", "MMM-DD-YYYY");
    const { rerender } = render(<Calendar selectedDate={date} />);

    expect(screen.queryByLabelText("week-number")).toBeNull();

    rerender(<Calendar selectedDate={date} showWeekNumber />);

    const weekBadge = screen.getByLabelText("week-number");
    expect(weekBadge).toHaveTextContent("(W22)");
    expect(weekBadge.parentElement).toHaveTextContent("2023/05/29(W22)");
  });

  it("shows the today button only when requested", () => {
    const date = moment("May-29-2023", "MMM-DD-YYYY");
    const onTodayClick = jest.fn();
    const { rerender } = render(<Calendar selectedDate={date} />);

    expect(screen.queryByRole("button", { name: "Go to today" })).toBeNull();

    rerender(
      <Calendar selectedDate={date} showToday onTodayClick={onTodayClick} />
    );

    const todayButton = screen.getByRole("button", {
      name: "Go to today",
    });
    expect(todayButton).toHaveTextContent("");
    expect(todayButton.querySelector("svg")).not.toBeNull();

    act(() => {
      todayButton.click();
    });

    expect(onTodayClick).toHaveBeenCalled();
  });

  it("calls callback when next month clicked", () => {
    const nextMonthCallback = jest.fn();
    const date = moment("May-29-2023", "MMM-DD-YYYY");
    render(
      <Calendar selectedDate={date} onNextMonthClick={nextMonthCallback} />
    );

    const nextMonthButton = screen.getByRole("button", {
      name: "calendar-next",
    });

    act(() => {
      nextMonthButton.click();
    });

    expect(nextMonthCallback).toBeCalled();
  });

  it("calls callback when previous month clicked", () => {
    const previousMonthCallback = jest.fn();
    const date = moment("May-29-2023", "MMM-DD-YYYY");
    render(
      <Calendar
        selectedDate={date}
        onPreviousMonthClick={previousMonthCallback}
      />
    );

    const previousMonthButton = screen.getByRole("button", {
      name: "calendar-previous",
    });

    act(() => {
      previousMonthButton.click();
    });

    expect(previousMonthCallback).toBeCalled();
  });

  // Broken because of https://github.com/testing-library/jest-dom/issues/322
  it.skip("highlights the currently selected date", () => {
    const date = moment("May-29-2023", "MMMM-DD-YYYY");
    render(<Calendar selectedDate={date} />);

    const dateCell = screen.getByText("29");

    expect(dateCell).toHaveStyle(
      "background-color: var(--joplin-background-color-hover3)"
    );
  });

  // Broken because of https://github.com/testing-library/jest-dom/issues/322
  it.skip("adds a border to the current day", () => {
    const date = moment("May-29-2023", "MMMM-DD-YYYY");
    render(<Calendar selectedDate={date} currentDay={date} />);

    const dateCell = screen.getByText("29");

    expect(dateCell).toHaveStyle("border: var(--joplin-color-correct)");
  });

  it("triggers onDataSelect callback when date cell clicked", () => {
    const date = moment("May-29-2023", "MMMM-DD-YYYY");
    const onDateSelectCb = jest.fn();
    render(<Calendar selectedDate={date} onDateSelect={onDateSelectCb} />);

    act(() => {
      screen.getByText("28").click();
    });

    expect(onDateSelectCb).toHaveBeenCalled();
  });

  it("highlights Chinese holidays only when requested", () => {
    const date = moment("2026-02-17");
    const { rerender } = render(
      <Calendar selectedDate={date} showDots={false} />
    );

    expect(screen.queryByTitle("2026-02-17 春节（放假）")).toBeNull();

    rerender(<Calendar selectedDate={date} showDots={false} showHolidays />);

    expect(screen.getByTitle("2026-02-17 春节（放假）")).toBeDefined();
  });

  it("marks make-up workdays", () => {
    render(
      <Calendar
        selectedDate={moment("2026-02-14")}
        showDots={false}
        showHolidays
      />
    );

    expect(screen.getByTitle("2026-02-14 春节（调休上班）")).toBeDefined();
  });

  it("shows holidays on adjacent-month dates", () => {
    mockedUseOnSettingsChange.mockReturnValue(WeekStartDay.Sunday);
    render(
      <Calendar
        selectedDate={moment("2026-04-01")}
        showDots={false}
        showHolidays
      />
    );

    expect(screen.getByTitle("2026-05-01 劳动节（放假）")).toBeDefined();
  });

  it("renders a rolling look-ahead window", () => {
    mockedUseOnSettingsChange.mockReturnValue(WeekStartDay.Monday);
    const date = moment("2026-11-06");

    render(
      <Calendar
        selectedDate={date}
        anchorDate={date}
        viewMode={CalendarViewMode.LookAhead}
        showDots={false}
        showHolidays
      />
    );

    const cells = screen.getAllByRole("cell");
    expect(cells).toHaveLength(42);
    expect(cells[0]).toHaveTextContent(/Oct\s*26/);
    expect(cells[6]).toHaveTextContent(/Nov\s*1/);
    expect(cells[7]).toHaveTextContent("2");
    expect(cells[36]).toHaveTextContent(/Dec\s*1/);
    expect(cells[41]).toHaveTextContent("6");
  });

  it("keeps the normal header format in look-ahead mode", () => {
    mockedUseOnSettingsChange.mockReturnValue(WeekStartDay.Monday);
    const date = moment("2026-11-06");
    const { rerender } = render(
      <Calendar
        selectedDate={date}
        anchorDate={date}
        viewMode={CalendarViewMode.LookAhead}
        showDots={false}
      />
    );

    expect(screen.getByText("Nov 2026")).toBeDefined();

    rerender(
      <Calendar
        selectedDate={date}
        anchorDate={date}
        viewMode={CalendarViewMode.LookAhead}
        showDots={false}
        showWeekNumber
      />
    );

    const weekBadge = screen.getByLabelText("week-number");
    expect(weekBadge).toHaveTextContent("(W45)");
    expect(weekBadge.parentElement).toHaveTextContent("2026/11/06(W45)");
  });

  it("shows future-month holidays and month labels in look-ahead mode", () => {
    mockedUseOnSettingsChange.mockReturnValue(WeekStartDay.Monday);
    const date = moment("2026-04-01");

    render(
      <Calendar
        selectedDate={date}
        anchorDate={date}
        viewMode={CalendarViewMode.LookAhead}
        showDots={false}
        showHolidays
      />
    );

    const cells = screen.getAllByRole("cell");
    expect(cells[0]).toHaveTextContent(/Mar\s*23/);
    expect(cells[9]).toHaveTextContent(/Apr\s*1/);
    expect(cells[39]).toHaveTextContent(/May\s*1/);
    expect(screen.getByTitle("2026-05-01 劳动节（放假）")).toBeDefined();
  });
});
