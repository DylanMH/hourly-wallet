import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export type DateRange = { start: Date; end: Date };

/** Weeks start on Monday to match typical overtime weeks. */
export const WEEK_STARTS_ON = 1 as const;

export function getCurrentWeekRange(now: Date = new Date()): DateRange {
  return {
    start: startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
  };
}

export function getCurrentMonthRange(now: Date = new Date()): DateRange {
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function getWeekRangeFor(date: Date): DateRange {
  return {
    start: startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
  };
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDateKey(key: string): Date {
  return parseISO(key);
}

export function formatShortDate(iso: string): string {
  return format(parseISO(iso), 'MMM d');
}

export function formatFullDate(iso: string): string {
  return format(parseISO(iso), 'EEE, MMM d, yyyy');
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'h:mm a');
}
