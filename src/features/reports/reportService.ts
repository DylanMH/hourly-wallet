import { addDays, endOfMonth, endOfWeek, format, isSameDay, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';

import { calculateWeeklyPay, PayBreakdown } from '@/lib/calculations/pay';
import { sumPayForShifts } from '@/lib/calculations/affordability';
import { calculateWorkedMinutes } from '@/lib/calculations/shifts';
import { DateRange, WEEK_STARTS_ON } from '@/lib/dates';
import type { BillOccurrenceWithBill, Shift } from '@/lib/types';

export type ReportPeriod = 'this-week' | 'last-week' | 'this-month' | 'last-month';

export function getReportRange(period: ReportPeriod, now: Date = new Date()): DateRange {
  switch (period) {
    case 'this-week':
      return {
        start: startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
        end: endOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
      };
    case 'last-week': {
      const lastWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: WEEK_STARTS_ON }),
        end: endOfWeek(lastWeek, { weekStartsOn: WEEK_STARTS_ON }),
      };
    }
    case 'this-month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last-month': {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
  }
}

export type DailyHours = { label: string; minutes: number };

/** Minutes worked per day across the range (max 31 bars). */
export function getDailyHours(shifts: Shift[], range: DateRange): DailyHours[] {
  const days: DailyHours[] = [];
  let cursor = range.start;
  let guard = 0;
  while (cursor <= range.end && guard < 32) {
    const dayShifts = shifts.filter((s) => isSameDay(parseISO(s.clockIn), cursor));
    const minutes = dayShifts.reduce((sum, s) => sum + calculateWorkedMinutes(s), 0);
    days.push({ label: format(cursor, guard < 8 ? 'EEE' : 'd'), minutes });
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

export type PeriodReport = {
  pay: PayBreakdown;
  billsPaid: number;
  billsUnpaid: number;
  billsByCategory: { category: string; total: number }[];
  netAfterBills: number;
};

export function buildPeriodReport(
  shifts: Shift[],
  occurrences: BillOccurrenceWithBill[],
  range: DateRange
): PeriodReport {
  const inRange = occurrences.filter((o) => {
    const due = parseISO(o.dueDate);
    return due >= range.start && due <= range.end;
  });

  const { gross, net } = sumPayForShifts(shifts);
  const weekly = calculateWeeklyPay(shifts);
  const pay: PayBreakdown = {
    ...weekly,
    grossPay: gross,
    estimatedNetPay: net,
    estimatedTaxes: gross - net,
  };

  const billsPaid = inRange.filter((o) => o.paid).reduce((s, o) => s + o.amountSnapshot, 0);
  const billsUnpaid = inRange.filter((o) => !o.paid).reduce((s, o) => s + o.amountSnapshot, 0);

  const categoryMap = new Map<string, number>();
  for (const occ of inRange) {
    categoryMap.set(
      occ.bill.category,
      (categoryMap.get(occ.bill.category) ?? 0) + occ.amountSnapshot
    );
  }
  const billsByCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    pay,
    billsPaid,
    billsUnpaid,
    billsByCategory,
    netAfterBills: net - billsPaid - billsUnpaid,
  };
}
