import moment from "moment";
import React from "react";
import styled from "styled-components";
import ButtonBar from "../StyledComponents/ButtonBar";
import Button from "../StyledComponents/Button";
import PlainText from "../StyledComponents/PlainText";
import useControlHeld from "../hooks/useControlHeld";
import { WeekNumberInfo } from "../utils/weekNumber";
import {
  FaAngleLeft,
  FaAngleRight,
  FaAnglesLeft,
  FaAnglesRight,
} from "react-icons/fa6";

const CalendarDate = styled(PlainText)`
  flex-grow: 2;
  flex-basis: 50%;
  font-size: calc(var(--joplin-font-size) * 1.1);
  white-space: nowrap;
`;

const WeekBadge = styled.span`
  white-space: nowrap;
  color: var(--joplin-color3);
`;

const TodayButton = styled(Button)`
  flex-grow: 0;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
`;

export interface CalendarControlsProps {
  shownMonth: moment.Moment;
  selectedDate?: moment.Moment;
  weekInfo?: WeekNumberInfo;
  showToday?: boolean;
  onTodayClicked?: () => void;
  onNextMonthClicked: () => void;
  onNextYearClicked: () => void;
  onPreviousMonthClicked: () => void;
  onPreviousYearClicked: () => void;
}

function CalendarControls({
  shownMonth,
  selectedDate,
  weekInfo,
  showToday = false,
  onTodayClicked,
  onNextMonthClicked,
  onNextYearClicked,
  onPreviousMonthClicked,
  onPreviousYearClicked,
}: CalendarControlsProps) {
  const controlHeld = useControlHeld();
  return (
    <tr>
      <th colSpan={7}>
        <ButtonBar>
          <Button
            onClick={
              controlHeld ? onPreviousYearClicked : onPreviousMonthClicked
            }
            aria-label="calendar-previous"
          >
            {controlHeld ? <FaAnglesLeft /> : <FaAngleLeft />}
          </Button>
          <CalendarDate
            title={
              weekInfo && selectedDate
                ? `${selectedDate.format("MMMM D, YYYY")} — ${weekInfo.title}`
                : shownMonth.format("MMMM YYYY")
            }
          >
            {weekInfo && selectedDate ? (
              <>
                {selectedDate.format("YYYY/MM/DD")}
                <WeekBadge aria-label="week-number" title={weekInfo.title}>
                  ({weekInfo.label})
                </WeekBadge>
              </>
            ) : (
              shownMonth.format("MMM YYYY")
            )}
          </CalendarDate>
          <Button
            onClick={controlHeld ? onNextYearClicked : onNextMonthClicked}
            aria-label="calendar-next"
          >
            {controlHeld ? <FaAnglesRight /> : <FaAngleRight />}
          </Button>
          {showToday && (
            <TodayButton
              onClick={onTodayClicked}
              aria-label="calendar-today"
              title="Go to today"
            >
              Today
            </TodayButton>
          )}
        </ButtonBar>
      </th>
    </tr>
  );
}

export default CalendarControls;
