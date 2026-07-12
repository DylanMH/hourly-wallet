import {
    differenceInMilliseconds,
    differenceInMinutes,
    differenceInSeconds,
    parseISO,
} from "date-fns";

import type { Shift, ShiftBreak, ShiftLunch } from "@/lib/types";

function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(0, differenceInMinutes(parseISO(endIso), parseISO(startIso)));
}

function secondsBetween(startIso: string, endIso: string): number {
  return Math.max(0, differenceInSeconds(parseISO(endIso), parseISO(startIso)));
}

function msBetween(startIso: string, endIso: string): number {
  return Math.max(
    0,
    differenceInMilliseconds(parseISO(endIso), parseISO(startIso)),
  );
}

/** Total minutes from clock in to clock out (or `asOf` for active shifts). */
export function calculateShiftDuration(
  shift: Shift,
  asOf: Date = new Date(),
): number {
  const end = shift.clockOut ?? asOf.toISOString();
  return minutesBetween(shift.clockIn, end);
}

function lunchMinutes(lunch: ShiftLunch, asOf: Date): number {
  const end = lunch.end ?? asOf.toISOString();
  return minutesBetween(lunch.start, end);
}

export function calculateLunchMinutes(
  shift: Shift,
  asOf: Date = new Date(),
): number {
  return shift.lunches.reduce(
    (sum, lunch) => sum + lunchMinutes(lunch, asOf),
    0,
  );
}

function breakMinutes(brk: ShiftBreak, asOf: Date): number {
  const end = brk.end ?? asOf.toISOString();
  return minutesBetween(brk.start, end);
}

export function calculatePaidBreakMinutes(
  shift: Shift,
  asOf: Date = new Date(),
): number {
  return shift.breaks
    .filter((b) => b.paid)
    .reduce((sum, b) => sum + breakMinutes(b, asOf), 0);
}

export function calculateUnpaidBreakMinutes(
  shift: Shift,
  asOf: Date = new Date(),
): number {
  return shift.breaks
    .filter((b) => !b.paid)
    .reduce((sum, b) => sum + breakMinutes(b, asOf), 0);
}

/**
 * Worked (payable) minutes: total duration minus lunch and unpaid breaks.
 * Paid breaks remain counted as worked time.
 *
 * The calculation is done in milliseconds before flooring to minutes so that
 * worked time does not flicker or increase while an active lunch or unpaid
 * break is running. Flooring total and non-worked durations independently
 * can make the difference jump by a minute while the break is ongoing.
 */
export function calculateWorkedMinutes(
  shift: Shift,
  asOf: Date = new Date(),
): number {
  const shiftEndIso = shift.clockOut ?? asOf.toISOString();
  const totalMs = msBetween(shift.clockIn, shiftEndIso);

  let nonWorkedMs = 0;

  for (const lunch of shift.lunches) {
    nonWorkedMs += msBetween(lunch.start, lunch.end ?? shiftEndIso);
  }

  for (const brk of shift.breaks) {
    if (brk.paid) continue;
    nonWorkedMs += msBetween(brk.start, brk.end ?? shiftEndIso);
  }

  return Math.max(0, Math.floor(Math.max(0, totalMs - nonWorkedMs) / 60000));
}

export function calculateWorkedHours(
  shift: Shift,
  asOf: Date = new Date(),
): number {
  return calculateWorkedMinutes(shift, asOf) / 60;
}

/**
 * Non-worked time (completed lunch + unpaid breaks) in milliseconds,
 * with second-level precision. Used for the notification chronometer base
 * offset so it shows worked time, not wall-clock time.
 */
export function calculateNonWorkedMs(
  shift: Shift,
  asOf: Date = new Date(),
): number {
  let seconds = 0;
  for (const lunch of shift.lunches) {
    const end = lunch.end ?? asOf.toISOString();
    seconds += secondsBetween(lunch.start, end);
  }
  for (const brk of shift.breaks) {
    if (brk.paid) continue;
    const end = brk.end ?? asOf.toISOString();
    seconds += secondsBetween(brk.start, end);
  }
  return seconds * 1000;
}
