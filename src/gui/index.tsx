import React, {
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { render } from "react-dom";
import Calendar from "./Calendar";
import moment, { ISO_8601 } from "moment";
import styled from "styled-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NoteList from "./NoteList";
import useGetMonthStatistics from "./hooks/useGetMonthStatistics";
import {
  GetNearestDayWithNoteRequest,
  GetNearestDayWithNoteResponse,
} from "@constants/GetNearestDayWithNote";
import MsgType from "@constants/messageTypes";
import useNoteSearchTypes from "./hooks/useNoteSearchTypes";
import useCalendarOnlyMode from "./hooks/useCalendarOnlyMode";
import useOnSettingsChange from "./hooks/useOnSettingsChange";
import useHolidayData from "./hooks/useHolidayData";
import {
  CALENDAR_VIEW_MODE,
  CalendarViewMode,
  SHOW_CN_HOLIDAYS,
  WEEK_START_DAY,
  WeekStartDay,
} from "@constants/Settings";
import NoteSearchTypes from "@constants/NoteSearchTypes";
import {
  getMonthWindow,
  getRollingWindow,
  getWindowMonths,
} from "./utils/calendarWindow";

const queryClient = new QueryClient();

async function getNearestFutureDayWithNote(
  selectedDate: moment.Moment,
  noteSearchTypes: NoteSearchTypes[]
): Promise<moment.Moment | null> {
  const response = await webviewApi.postMessage({
    type: MsgType.GetNearestDayWithNote,
    date: selectedDate.toISOString(),
    direction: "future",
    noteSearchTypes,
  } as GetNearestDayWithNoteRequest);

  if (!response) {
    return null;
  }

  return moment(response.date, ISO_8601);
}

async function getNearestPastDayWithNote(
  selectedDate: moment.Moment,
  noteSearchTypes: NoteSearchTypes[]
): Promise<moment.Moment | null> {
  const response = await webviewApi.postMessage({
    type: MsgType.GetNearestDayWithNote,
    date: selectedDate.toISOString(),
    direction: "past",
    noteSearchTypes,
  } as GetNearestDayWithNoteRequest);

  if (!response) {
    return null;
  }

  return moment(response.date, ISO_8601);
}

function App() {
  const [selectedDate, setSelectedDateBase] = useState(moment());
  const [shownMonth, setShownMonth] = useState(moment());
  const [anchorDate, setAnchorDate] = useState(moment());

  const noteSearchTypes = useNoteSearchTypes();
  const calendarOnly = useCalendarOnlyMode();
  const showCnHolidays = useOnSettingsChange<boolean>(SHOW_CN_HOLIDAYS, true);
  const viewMode = useOnSettingsChange<CalendarViewMode>(
    CALENDAR_VIEW_MODE,
    CalendarViewMode.Month
  );
  const weekStartDay = useOnSettingsChange<WeekStartDay>(
    WEEK_START_DAY,
    WeekStartDay.Sunday
  );
  const holidayData = useHolidayData();
  const dataEnabled = !calendarOnly;

  const calendarWindow = useMemo(
    () =>
      viewMode === CalendarViewMode.LookAhead
        ? getRollingWindow(anchorDate, weekStartDay)
        : getMonthWindow(shownMonth, weekStartDay),
    [viewMode, anchorDate, shownMonth, weekStartDay]
  );

  const statsMonths = useMemo(() => {
    const months = getWindowMonths(calendarWindow);
    while (months.length < 3) {
      months.push(months[months.length - 1].clone().add(1, "month"));
    }
    return months.slice(0, 3);
  }, [calendarWindow]);

  const { data: statsMonth0 } = useGetMonthStatistics(
    statsMonths[0],
    noteSearchTypes,
    { enabled: dataEnabled }
  );
  const { data: statsMonth1 } = useGetMonthStatistics(
    statsMonths[1],
    noteSearchTypes,
    { enabled: dataEnabled }
  );
  const { data: statsMonth2 } = useGetMonthStatistics(
    statsMonths[2],
    noteSearchTypes,
    { enabled: dataEnabled }
  );

  let statistics: Record<string, number> = {};

  if (dataEnabled) {
    statistics = {
      ...(statsMonth0?.notesPerDay ?? {}),
      ...(statsMonth1?.notesPerDay ?? {}),
      ...(statsMonth2?.notesPerDay ?? {}),
    };
  }

  const setSelectedDate = (date: moment.Moment) => {
    setSelectedDateBase(date);
    setShownMonth(date);

    if (
      viewMode === CalendarViewMode.LookAhead &&
      (date.isBefore(calendarWindow.start, "day") ||
        date.isAfter(calendarWindow.end, "day"))
    ) {
      setAnchorDate(date);
    }
  };

  const goToToday = () => {
    const today = moment();
    setSelectedDateBase(today);
    setShownMonth(today);
    setAnchorDate(today);
  };

  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Keep the anchor aligned with the selected date when switching views.
  useEffect(() => {
    const date = selectedDateRef.current;
    setAnchorDate(date.clone());
    setShownMonth(date.clone());
  }, [viewMode]);

  /**
   * In calendar-only mode keep the selected date in the month being viewed,
   * so the week number always describes the visible calendar.
   */
  const moveShownMonth = (nextMonth: moment.Moment) => {
    setShownMonth(nextMonth);
    if (calendarOnly) {
      const day = Math.min(selectedDate.date(), nextMonth.daysInMonth());
      setSelectedDateBase(nextMonth.clone().date(day));
    }
  };

  const moveLookAhead = (weeks: number) => {
    const next = selectedDate.clone().add(weeks, "weeks");
    setSelectedDateBase(next);
    setShownMonth(next);
    setAnchorDate(next);
  };

  useEffect(() => {
    if (!calendarOnly || viewMode === CalendarViewMode.LookAhead) {
      return;
    }
    if (!selectedDate.isSame(shownMonth, "month")) {
      const day = Math.min(selectedDate.date(), shownMonth.daysInMonth());
      setSelectedDateBase(shownMonth.clone().date(day));
    }
  }, [calendarOnly, viewMode, selectedDate, shownMonth]);

  const onCalendarKeyBoardNavigation = useCallback(
    async (event: ReactKeyboardEvent) => {
      if (event.ctrlKey) {
        if (!dataEnabled) {
          return;
        }

        let date: moment.Moment | null;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          date = await getNearestPastDayWithNote(selectedDate, noteSearchTypes);
        } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          date = await getNearestFutureDayWithNote(
            selectedDate,
            noteSearchTypes
          );
        }

        if (!date) {
          return;
        }

        setSelectedDate(date);
        return;
      }

      if (event.key === "ArrowLeft") {
        setSelectedDate(selectedDate.clone().subtract(1, "day"));
      } else if (event.key === "ArrowRight") {
        setSelectedDate(selectedDate.clone().add(1, "day"));
      } else if (event.key === "ArrowUp") {
        setSelectedDate(selectedDate.clone().subtract(1, "week"));
      } else if (event.key === "ArrowDown") {
        setSelectedDate(selectedDate.clone().add(1, "week"));
      }
    },
    [dataEnabled, selectedDate, setSelectedDate, noteSearchTypes]
  );

  return (
    <>
      <Calendar
        selectedDate={selectedDate}
        shownMonth={shownMonth}
        anchorDate={anchorDate}
        viewMode={viewMode}
        statistics={dataEnabled ? statistics : undefined}
        showDots={dataEnabled}
        showWeekNumber={calendarOnly}
        showToday={calendarOnly}
        showHolidays={calendarOnly && showCnHolidays}
        holidayLookup={holidayData.lookup}
        onTodayClick={goToToday}
        onDateSelect={(date) => setSelectedDate(date)}
        onNextMonthClick={() => {
          if (viewMode === CalendarViewMode.LookAhead) {
            moveLookAhead(1);
            return;
          }
          moveShownMonth(shownMonth.clone().add(1, "month"));
        }}
        onNextYearClick={() => {
          if (viewMode === CalendarViewMode.LookAhead) {
            moveLookAhead(4);
            return;
          }
          moveShownMonth(shownMonth.clone().add(1, "year"));
        }}
        onPreviousMonthClick={() => {
          if (viewMode === CalendarViewMode.LookAhead) {
            moveLookAhead(-1);
            return;
          }
          moveShownMonth(shownMonth.clone().subtract(1, "month"));
        }}
        onPreviousYearClick={() => {
          if (viewMode === CalendarViewMode.LookAhead) {
            moveLookAhead(-4);
            return;
          }
          moveShownMonth(shownMonth.clone().subtract(1, "year"));
        }}
        onKeyboardNavigation={onCalendarKeyBoardNavigation}
      />
      {dataEnabled && (
        <>
          <hr />
          <NoteList
            currentDate={selectedDate}
            onNextDayClick={() => {
              const newDate = selectedDate.clone().add(1, "day");
              setSelectedDate(newDate);
            }}
            onNextNoteDayClick={async () => {
              let date = await getNearestFutureDayWithNote(
                selectedDate,
                noteSearchTypes
              );
              if (!date) {
                return;
              }
              setSelectedDate(date);
            }}
            onPreviousDayClick={() => {
              const newDate = selectedDate.clone().subtract(1, "day");
              setSelectedDate(newDate);
            }}
            onPreviousNoteDayClick={async () => {
              let date = await getNearestPastDayWithNote(
                selectedDate,
                noteSearchTypes
              );
              if (!date) {
                return;
              }
              setSelectedDate(date);
            }}
            onTodayClick={goToToday}
          />
        </>
      )}
    </>
  );
}

const AppStyler = styled.div`
  background-color: var(--joplin-background-color);
  color: var(--joplin-color);
  font-size: var(--joplin-font-size);
  font-family: var(--joplin-font-family);
  margin: 0.25rem 0.5rem 0.25rem 0.5rem;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const root = document.getElementById("joplin-plugin-content");

render(
  <QueryClientProvider client={queryClient}>
    <AppStyler>
      <App />
    </AppStyler>
  </QueryClientProvider>,
  root
);
