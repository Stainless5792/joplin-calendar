import moment from "moment";
import React, { useCallback } from "react";
import styled, { css } from "styled-components";
import DotBar from "../DotBar/DotBar";
import type { CnHolidayInfo } from "../holidays/types";

const StyledCell = styled.td<{
  muted?: boolean;
  selected?: boolean;
  currentDay?: boolean;
  offDay?: boolean;
  workDay?: boolean;
}>`
  position: relative;
  text-align: center;
  background-color: var(--joplin-background-color);
  border-radius: 0.325rem;
  padding: 0.5rem;

  ${(props) =>
    props.muted
      ? css`
          color: var(--joplin-color3);
        `
      : null}

  ${(props) =>
    props.selected
      ? css`
          background-color: var(--joplin-background-color-hover3);
        `
      : null}

  ${(props) =>
    props.currentDay
      ? css`
          border: var(--joplin-color-correct) solid 3px;
        `
      : null}

  ${(props) =>
    props.offDay
      ? css`
          font-weight: 600;
          color: var(--joplin-color-error, #d93025);
          background-image: linear-gradient(
            rgba(217, 48, 37, 0.14),
            rgba(217, 48, 37, 0.14)
          );

          &::after {
            content: "";
            position: absolute;
            top: 0.2rem;
            right: 0.25rem;
            width: 0.3rem;
            height: 0.3rem;
            border-radius: 50%;
            background-color: var(--joplin-color-error, #d93025);
          }
        `
      : null}

  ${(props) =>
    props.workDay
      ? css`
          color: #2f6fd0;
          background-image: linear-gradient(
            rgba(47, 111, 208, 0.13),
            rgba(47, 111, 208, 0.13)
          );

          &::after {
            content: "";
            position: absolute;
            top: 0.2rem;
            right: 0.25rem;
            width: 0.3rem;
            height: 0.3rem;
            box-sizing: border-box;
            border: 1.5px solid #2f6fd0;
            border-radius: 1px;
          }
        `
      : null}

  &:hover {
    background-color: var(--joplin-background-color-hover3);
  }
`;

const MonthLabel = styled.span<{ $tone: number }>`
  display: block;
  font-size: 0.6em;
  line-height: 1;
  font-weight: 600;
  opacity: 0.9;
  margin-bottom: 0.1rem;
  color: ${(props) =>
    `var(--calendar-month-tone-${props.$tone}, var(--joplin-color))`};
`;

export interface CalendarCellProps {
  date: moment.Moment;
  muted?: boolean;
  selected?: boolean;
  currentDay?: boolean;
  numberOfDots?: number;
  showDots?: boolean;
  showMonthLabel?: boolean;
  holiday?: CnHolidayInfo;
  onSelect?: (date: moment.Moment) => void;
}

function CalendarCell({
  date,
  muted,
  selected,
  currentDay,
  numberOfDots,
  showDots = true,
  showMonthLabel = false,
  holiday,
  onSelect,
}: CalendarCellProps) {
  const onClickCallback = useCallback(() => {
    onSelect(date);
  }, [date, onSelect]);

  const visibleHoliday = holiday;
  const offDay = visibleHoliday?.isOffDay === true;
  const workDay = visibleHoliday?.isOffDay === false;

  const title = visibleHoliday
    ? `${date.format("YYYY-MM-DD")} ${visibleHoliday.name}${
        visibleHoliday.isOffDay ? "（放假）" : "（调休上班）"
      }`
    : undefined;

  const monthTone = date.month() % 3;

  return (
    <StyledCell
      muted={muted}
      selected={selected}
      onClick={onClickCallback}
      currentDay={currentDay}
      offDay={offDay}
      workDay={workDay}
      title={title}
      aria-label={date.format("YYYY-MM-DD")}
    >
      {showMonthLabel && (
        <MonthLabel
          aria-hidden="true"
          data-month-tone={monthTone}
          $tone={monthTone}
        >
          {date.format("MMM")}
        </MonthLabel>
      )}
      {date.format("D")}
      {showDots && <DotBar numberOfDots={numberOfDots ?? 0} />}
    </StyledCell>
  );
}

export default CalendarCell;
