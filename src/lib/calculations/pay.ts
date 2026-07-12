import {
    calculateWorkedHours,
    calculateWorkedMinutes,
} from "@/lib/calculations/shifts";
import type { Shift } from "@/lib/types";

export type WeeklyHoursBreakdown = {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
};

export type PayBreakdown = {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularEarnings: number;
  overtimeEarnings: number;
  grossPay: number;
  estimatedTaxes: number;
  estimatedNetPay: number;
};

/**
 * Splits a week's shifts into regular and overtime hours.
 * Uses per-shift snapshots: the threshold from the most recent shift in the
 * week applies (they are usually identical within a week).
 *
 * Holiday pay and PTO shifts are excluded from the overtime threshold unless
 * their respective snapshot flags are enabled.
 */
export function calculateWeeklyRegularAndOvertimeHours(
  shifts: Shift[],
  asOf: Date = new Date(),
): WeeklyHoursBreakdown {
  if (shifts.length === 0) {
    return { totalHours: 0, regularHours: 0, overtimeHours: 0 };
  }

  const totalMinutes = shifts.reduce(
    (sum, shift) => sum + calculateWorkedMinutes(shift, asOf),
    0,
  );
  const latest = [...shifts].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime(),
  )[shifts.length - 1];
  const overtimeEnabled = latest.overtimeEnabledSnapshot;
  const thresholdMinutes = Math.max(0, latest.overtimeThresholdSnapshot * 60);
  const totalHours = totalMinutes / 60;

  if (!overtimeEnabled) {
    return { totalHours, regularHours: totalHours, overtimeHours: 0 };
  }

  const excludedMinutes = shifts
    .filter(
      (shift) =>
        (shift.isHolidayPay && !shift.holidayPayInOvertimeSnapshot) ||
        (shift.isPTO && !shift.ptoInOvertimeSnapshot),
    )
    .reduce((sum, shift) => sum + calculateWorkedMinutes(shift, asOf), 0);
  const minutesTowardOvertime = Math.max(0, totalMinutes - excludedMinutes);
  const overtimeMinutes = Math.max(0, minutesTowardOvertime - thresholdMinutes);
  const overtimeHours = overtimeMinutes / 60;
  const regularHours = totalHours - overtimeHours;

  return { totalHours, regularHours, overtimeHours };
}

function getOvertimeMinutesByShift(
  shifts: Shift[],
  asOf: Date,
): Map<string, number> {
  const ordered = [...shifts].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime(),
  );
  const overtimeMinutesByShift = new Map<string, number>();
  const latest = ordered[ordered.length - 1];
  if (!latest?.overtimeEnabledSnapshot) return overtimeMinutesByShift;

  const thresholdMinutes = Math.max(0, latest.overtimeThresholdSnapshot * 60);
  let eligibleMinutes = 0;
  for (const shift of ordered) {
    const workedMinutes = calculateWorkedMinutes(shift, asOf);
    const excludedFromThreshold =
      (shift.isHolidayPay && !shift.holidayPayInOvertimeSnapshot) ||
      (shift.isPTO && !shift.ptoInOvertimeSnapshot);
    if (excludedFromThreshold) {
      overtimeMinutesByShift.set(shift.id, 0);
      continue;
    }

    const regularMinutes = Math.max(
      0,
      Math.min(workedMinutes, thresholdMinutes - eligibleMinutes),
    );
    const overtimeMinutes = Math.max(0, workedMinutes - regularMinutes);
    overtimeMinutesByShift.set(shift.id, overtimeMinutes);
    eligibleMinutes += workedMinutes;
  }
  return overtimeMinutesByShift;
}

export function calculateGrossPay(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number,
  overtimeMultiplier: number,
): number {
  return (
    regularHours * hourlyRate + overtimeHours * hourlyRate * overtimeMultiplier
  );
}

export function calculateEstimatedTaxes(
  grossPay: number,
  taxPercent: number,
): number {
  return grossPay * (taxPercent / 100);
}

export function calculateEstimatedNetPay(
  grossPay: number,
  taxPercent: number,
): number {
  return grossPay - calculateEstimatedTaxes(grossPay, taxPercent);
}

/**
 * Full estimated pay breakdown for one week of shifts, using each shift's
 * snapshots. Overtime hours are attributed at the blended latest rate.
 */
export function calculateWeeklyPay(
  shifts: Shift[],
  asOf: Date = new Date(),
): PayBreakdown {
  if (shifts.length === 0) {
    return {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      regularEarnings: 0,
      overtimeEarnings: 0,
      grossPay: 0,
      estimatedTaxes: 0,
      estimatedNetPay: 0,
    };
  }

  const { totalHours, regularHours, overtimeHours } =
    calculateWeeklyRegularAndOvertimeHours(shifts, asOf);
  const ordered = [...shifts].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime(),
  );
  const overtimeMinutesByShift = getOvertimeMinutesByShift(ordered, asOf);
  const overtimeEarnings = ordered.reduce((sum, shift) => {
    const overtimeHoursForShift =
      (overtimeMinutesByShift.get(shift.id) ?? 0) / 60;
    return (
      sum +
      overtimeHoursForShift *
        shift.hourlyRateSnapshot *
        shift.overtimeMultiplierSnapshot
    );
  }, 0);
  const regularEarnings = ordered.reduce((sum, shift) => {
    const workedHours = calculateWorkedHours(shift, asOf);
    const overtimeHoursForShift =
      (overtimeMinutesByShift.get(shift.id) ?? 0) / 60;
    return (
      sum + (workedHours - overtimeHoursForShift) * shift.hourlyRateSnapshot
    );
  }, 0);
  const grossPay = regularEarnings + overtimeEarnings;
  const latest = ordered[ordered.length - 1];
  const estimatedTaxes = calculateEstimatedTaxes(
    grossPay,
    latest.taxPercentSnapshot,
  );

  return {
    totalHours,
    regularHours,
    overtimeHours,
    regularEarnings,
    overtimeEarnings,
    grossPay,
    estimatedTaxes,
    estimatedNetPay: grossPay - estimatedTaxes,
  };
}
