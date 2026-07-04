import { calculateEstimatedNetPay, calculateWeeklyPay } from '@/lib/calculations/pay';
import { getWeekRangeFor } from '@/lib/dates';
import type { Job, Shift } from '@/lib/types';

const HOURS_PER_WORKDAY = 8;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

export function getAnnualSalary(job: Job): number {
  return job.salaryPeriod === 'yearly' ? job.salaryAmount : job.salaryAmount * MONTHS_PER_YEAR;
}

export function getHourlyRateForSalary(job: Job): number {
  if (!job.isSalaried) return job.hourlyRate;
  const annual = getAnnualSalary(job);
  return annual / (job.workDaysPerWeek * HOURS_PER_WORKDAY * WEEKS_PER_YEAR);
}

export function getExpectedWorkHoursPerWeek(job: Job): number {
  return job.workDaysPerWeek * HOURS_PER_WORKDAY;
}

export function getWeeklyGrossForSalary(job: Job): number {
  return getAnnualSalary(job) / WEEKS_PER_YEAR;
}

export function getMonthlyGrossForSalary(job: Job): number {
  return getAnnualSalary(job) / MONTHS_PER_YEAR;
}

export function getSalaryNet(gross: number, taxPercent: number): number {
  return calculateEstimatedNetPay(gross, taxPercent);
}

export function getSalaryPayBreakdown(job: Job): {
  weeklyGross: number;
  weeklyNet: number;
  monthlyGross: number;
  monthlyNet: number;
  hourlyRate: number;
} {
  const weeklyGross = getWeeklyGrossForSalary(job);
  const monthlyGross = getMonthlyGrossForSalary(job);
  const weeklyNet = getSalaryNet(weeklyGross, job.taxPercent);
  const monthlyNet = getSalaryNet(monthlyGross, job.taxPercent);
  return {
    weeklyGross,
    weeklyNet,
    monthlyGross,
    monthlyNet,
    hourlyRate: getHourlyRateForSalary(job),
  };
}

export function getSalaryShiftsForJob(job: Job, now: Date = new Date()): Shift[] {
  const { start } = getWeekRangeFor(now);
  const hoursPerDay = HOURS_PER_WORKDAY;
  const days = Math.min(job.workDaysPerWeek, 7);
  const shifts: Shift[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    const clockIn = new Date(date);
    clockIn.setHours(9, 0, 0, 0);
    const clockOut = new Date(date);
    clockOut.setHours(9 + hoursPerDay, 0, 0, 0);
    shifts.push({
      id: `${job.id}-salary-${dateKey}`,
      jobId: job.id,
      date: dateKey,
      clockIn: clockIn.toISOString(),
      clockOut: clockOut.toISOString(),
      breaks: [],
      isHolidayPay: false,
      isPTO: false,
      hourlyRateSnapshot: getHourlyRateForSalary(job),
      overtimeEnabledSnapshot: false,
      overtimeMultiplierSnapshot: 1,
      overtimeThresholdSnapshot: 0,
      taxPercentSnapshot: job.taxPercent,
      holidayPayInOvertimeSnapshot: false,
      ptoInOvertimeSnapshot: false,
      createdAt: clockIn.toISOString(),
      updatedAt: clockIn.toISOString(),
    });
  }
  return shifts;
}

export function calculateWeeklyPayForSalary(job: Job): ReturnType<typeof calculateWeeklyPay> {
  const shifts = getSalaryShiftsForJob(job);
  return calculateWeeklyPay(shifts);
}

export function isSalaryJob(job?: Job): boolean {
  return job?.isSalaried ?? false;
}
