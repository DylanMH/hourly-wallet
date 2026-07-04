import { calculateWorkedHours } from '@/lib/calculations/shifts';
import type { Shift } from '@/lib/types';

export type WeeklyHoursBreakdown = {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
};

export type PayBreakdown = {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
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
  asOf: Date = new Date()
): WeeklyHoursBreakdown {
  if (shifts.length === 0) {
    return { totalHours: 0, regularHours: 0, overtimeHours: 0 };
  }

  const totalHours = shifts.reduce((sum, s) => sum + calculateWorkedHours(s, asOf), 0);
  const latest = shifts[shifts.length - 1];
  const overtimeEnabled = latest.overtimeEnabledSnapshot;
  const threshold = latest.overtimeThresholdSnapshot;

  if (!overtimeEnabled) {
    return { totalHours, regularHours: totalHours, overtimeHours: 0 };
  }

  const excludedHours = shifts
    .filter(
      (s) =>
        (s.isHolidayPay && !s.holidayPayInOvertimeSnapshot) ||
        (s.isPTO && !s.ptoInOvertimeSnapshot)
    )
    .reduce((sum, s) => sum + calculateWorkedHours(s, asOf), 0);
  const hoursTowardOvertime = Math.max(0, totalHours - excludedHours);

  const overtimeHours = Math.max(0, hoursTowardOvertime - threshold);
  const regularHours = totalHours - overtimeHours;
  return { totalHours, regularHours, overtimeHours };
}

export function calculateGrossPay(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number,
  overtimeMultiplier: number
): number {
  return regularHours * hourlyRate + overtimeHours * hourlyRate * overtimeMultiplier;
}

export function calculateEstimatedTaxes(grossPay: number, taxPercent: number): number {
  return grossPay * (taxPercent / 100);
}

export function calculateEstimatedNetPay(grossPay: number, taxPercent: number): number {
  return grossPay - calculateEstimatedTaxes(grossPay, taxPercent);
}

/**
 * Full estimated pay breakdown for one week of shifts, using each shift's
 * snapshots. Overtime hours are attributed at the blended latest rate.
 */
export function calculateWeeklyPay(shifts: Shift[], asOf: Date = new Date()): PayBreakdown {
  if (shifts.length === 0) {
    return {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      grossPay: 0,
      estimatedTaxes: 0,
      estimatedNetPay: 0,
    };
  }
  const { totalHours, regularHours, overtimeHours } = calculateWeeklyRegularAndOvertimeHours(
    shifts,
    asOf
  );
  const latest = shifts[shifts.length - 1];
  const rate = latest.hourlyRateSnapshot;
  const multiplier = latest.overtimeMultiplierSnapshot;
  const taxPercent = latest.taxPercentSnapshot;

  // Weight the hourly rate per shift for regular hours so historical rate
  // changes are respected, then apply overtime at the latest snapshot.
  let grossPay: number;
  const ratesDiffer = shifts.some((s) => s.hourlyRateSnapshot !== rate);
  if (!ratesDiffer) {
    grossPay = calculateGrossPay(regularHours, overtimeHours, rate, multiplier);
  } else {
    const perShift = shifts.map((s) => ({
      hours: calculateWorkedHours(s, asOf),
      rate: s.hourlyRateSnapshot,
    }));
    const baseGross = perShift.reduce((sum, p) => sum + p.hours * p.rate, 0);
    const overtimePremium = overtimeHours * rate * Math.max(0, multiplier - 1);
    grossPay = baseGross + overtimePremium;
  }

  const estimatedTaxes = calculateEstimatedTaxes(grossPay, taxPercent);
  return {
    totalHours,
    regularHours,
    overtimeHours,
    grossPay,
    estimatedTaxes,
    estimatedNetPay: grossPay - estimatedTaxes,
  };
}
