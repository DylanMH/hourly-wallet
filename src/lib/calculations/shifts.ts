import { differenceInMinutes, parseISO } from 'date-fns';

import type { Shift, ShiftBreak } from '@/lib/types';

function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(0, differenceInMinutes(parseISO(endIso), parseISO(startIso)));
}

/** Total minutes from clock in to clock out (or `asOf` for active shifts). */
export function calculateShiftDuration(shift: Shift, asOf: Date = new Date()): number {
  const end = shift.clockOut ?? asOf.toISOString();
  return minutesBetween(shift.clockIn, end);
}

export function calculateLunchMinutes(shift: Shift, asOf: Date = new Date()): number {
  if (!shift.lunchStart) return 0;
  const end = shift.lunchEnd ?? asOf.toISOString();
  return minutesBetween(shift.lunchStart, end);
}

function breakMinutes(brk: ShiftBreak, asOf: Date): number {
  const end = brk.end ?? asOf.toISOString();
  return minutesBetween(brk.start, end);
}

export function calculatePaidBreakMinutes(shift: Shift, asOf: Date = new Date()): number {
  return shift.breaks
    .filter((b) => b.paid)
    .reduce((sum, b) => sum + breakMinutes(b, asOf), 0);
}

export function calculateUnpaidBreakMinutes(shift: Shift, asOf: Date = new Date()): number {
  return shift.breaks
    .filter((b) => !b.paid)
    .reduce((sum, b) => sum + breakMinutes(b, asOf), 0);
}

/**
 * Worked (payable) minutes: total duration minus lunch and unpaid breaks.
 * Paid breaks remain counted as worked time.
 */
export function calculateWorkedMinutes(shift: Shift, asOf: Date = new Date()): number {
  const total = calculateShiftDuration(shift, asOf);
  const lunch = calculateLunchMinutes(shift, asOf);
  const unpaidBreaks = calculateUnpaidBreakMinutes(shift, asOf);
  return Math.max(0, total - lunch - unpaidBreaks);
}

export function calculateWorkedHours(shift: Shift, asOf: Date = new Date()): number {
  return calculateWorkedMinutes(shift, asOf) / 60;
}
