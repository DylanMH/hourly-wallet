import { getDay } from 'date-fns';

import { calculateWeeklyPay } from '@/lib/calculations/pay';
import { getCurrentMonthRange, getWeekRangeFor } from '@/lib/dates';
import type { Shift } from '@/lib/types';

export type MonthlyProjection = {
  netSoFar: number;
  grossSoFar: number;
  projectedNet: number;
  projectedGross: number;
};

export type AffordabilityStatus = 'on-track' | 'close' | 'shortfall';

export type MonthlyAffordability = {
  status: AffordabilityStatus;
  projectedNet: number;
  totalBillsDue: number;
  surplus: number;
};

/** Groups shifts by their (Monday-based) week start date key. */
export function groupShiftsByWeek(shifts: Shift[]): Map<string, Shift[]> {
  const map = new Map<string, Shift[]>();
  for (const shift of shifts) {
    const weekStart = getWeekRangeFor(new Date(shift.clockIn)).start.toISOString();
    const list = map.get(weekStart) ?? [];
    list.push(shift);
    map.set(weekStart, list);
  }
  return map;
}

/** Sums estimated net/gross pay for a set of shifts, respecting weekly overtime. */
export function sumPayForShifts(
  shifts: Shift[],
  asOf: Date = new Date()
): { gross: number; net: number } {
  const weeks = groupShiftsByWeek(shifts);
  let gross = 0;
  let net = 0;
  for (const weekShifts of weeks.values()) {
    const pay = calculateWeeklyPay(weekShifts, asOf);
    gross += pay.grossPay;
    net += pay.estimatedNetPay;
  }
  return { gross, net };
}

/** Returns true for Mon-Fri (0 = Sunday, 6 = Saturday). */
function isWeekday(date: Date): boolean {
  const day = getDay(date);
  return day >= 1 && day <= 5;
}

/** Counts weekdays (Mon-Fri) between two dates, inclusive of both endpoints. */
function countWeekdaysInRange(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  const last = new Date(end);
  current.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  while (current <= last) {
    if (isWeekday(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Projects income for the current month by extrapolating the month-to-date
 * average per working day (Mon-Fri) across the remaining working days of the
 * month. This assumes a 5-day workweek rather than counting weekends.
 */
export function projectMonthlyIncome(
  monthShifts: Shift[],
  now: Date = new Date()
): MonthlyProjection {
  const { start } = getCurrentMonthRange(now);
  const { gross, net } = sumPayForShifts(monthShifts, now);
  const elapsedWorkdays = countWeekdaysInRange(start, now);
  const workdaysInMonth = countWeekdaysInRange(
    start,
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );
  const effectiveElapsed = Math.max(1, elapsedWorkdays);
  const projectedNet = (net / effectiveElapsed) * workdaysInMonth;
  const projectedGross = (gross / effectiveElapsed) * workdaysInMonth;
  return {
    netSoFar: net,
    grossSoFar: gross,
    projectedNet,
    projectedGross,
  };
}

/**
 * Compares projected monthly net income against total bills due this month.
 * "Close" means the surplus is within 10% of the monthly bills total.
 */
export function calculateMonthlyAffordability(
  projectedNet: number,
  totalBillsDue: number
): MonthlyAffordability {
  const surplus = projectedNet - totalBillsDue;
  const closeThreshold = Math.max(totalBillsDue * 0.1, 50);
  let status: AffordabilityStatus;
  if (surplus >= closeThreshold) {
    status = 'on-track';
  } else if (surplus >= 0) {
    status = 'close';
  } else {
    status = 'shortfall';
  }
  return { status, projectedNet, totalBillsDue, surplus };
}
