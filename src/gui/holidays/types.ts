export interface CnHolidayDay {
  /** Official name, e.g. "春节". */
  name: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** true = public holiday, false = make-up workday (调休上班). */
  isOffDay: boolean;
}

export interface CnHolidayInfo {
  name: string;
  isOffDay: boolean;
}

/** One year of data, matching the holiday-cn JSON schema. */
export interface CnHolidayYear {
  year: number;
  /** URLs of the State Council announcements this data came from. */
  papers: string[];
  days: CnHolidayDay[];
}

/** Cached runtime data persisted in plugin settings. */
export interface CnHolidayCache {
  days: CnHolidayDay[];
  sources: string[];
  /** Years already fetched, including years that had no data yet. */
  fetchedYears: number[];
  /** ISO timestamp of the last successful save. */
  updatedAt: string;
  /** Set for imported files, for display purposes. */
  fileName?: string;
}
