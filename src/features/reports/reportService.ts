import {
    addDays,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    parseISO,
    startOfMonth,
    startOfMonth as startOfMonthFn,
    startOfWeek,
    startOfWeek as startOfWeekFn,
    startOfYear,
    subMonths,
    subWeeks,
} from "date-fns";

import { groupShiftsByWeek } from "@/lib/calculations/affordability";
import { countWorkdaysInRange, isWorkday } from "@/lib/calculations/dateUtils";
import { calculateWeeklyPay, PayBreakdown } from "@/lib/calculations/pay";
import { getAnnualSalary } from "@/lib/calculations/salary";
import { calculateWorkedMinutes } from "@/lib/calculations/shifts";
import { DateRange, WEEK_STARTS_ON } from "@/lib/dates";
import type { BillOccurrenceWithBill, Job, Shift } from "@/lib/types";

export type ReportPeriod =
  "this-week" | "last-week" | "this-month" | "last-month" | "this-year";

export function getReportRange(
  period: ReportPeriod,
  now: Date = new Date(),
): DateRange {
  switch (period) {
    case "this-week":
      return {
        start: startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
        end: endOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
      };
    case "last-week": {
      const lastWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: WEEK_STARTS_ON }),
        end: endOfWeek(lastWeek, { weekStartsOn: WEEK_STARTS_ON }),
      };
    }
    case "this-month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last-month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "this-year":
      return { start: startOfYear(now), end: now };
  }
}

export type DailyHours = { label: string; minutes: number };
export type ChartBar = { label: string; minutes: number };

function getSalaryPayForRange(job: Job, range: DateRange): PayBreakdown {
  const days = countWorkdaysInRange(
    range.start,
    range.end,
    job.workDaysPerWeek,
  );
  const annual = getAnnualSalary(job);
  const dailyGross = annual / (job.workDaysPerWeek * 52);
  const gross = dailyGross * days;
  const net = gross * (1 - job.taxPercent / 100);
  return {
    totalHours: days * 8,
    regularHours: days * 8,
    overtimeHours: 0,
    grossPay: gross,
    estimatedTaxes: gross - net,
    estimatedNetPay: net,
  };
}

/** Aggregates pay for a set of shifts by grouping them into actual weeks first. */
function aggregatePayForShifts(shifts: Shift[], asOf: Date): PayBreakdown {
  const empty: PayBreakdown = {
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    grossPay: 0,
    estimatedTaxes: 0,
    estimatedNetPay: 0,
  };
  if (shifts.length === 0) return empty;
  const weeks = groupShiftsByWeek(shifts);
  return Array.from(weeks.values()).reduce<PayBreakdown>((acc, weekShifts) => {
    const pay = calculateWeeklyPay(weekShifts, asOf);
    acc.totalHours += pay.totalHours;
    acc.regularHours += pay.regularHours;
    acc.overtimeHours += pay.overtimeHours;
    acc.grossPay += pay.grossPay;
    acc.estimatedTaxes += pay.estimatedTaxes;
    acc.estimatedNetPay += pay.estimatedNetPay;
    return acc;
  }, empty);
}

function getMinutesForDay(
  date: Date,
  shifts: Shift[],
  jobs: Job[] = [],
  selectedJobId?: string,
): number {
  let minutes = 0;
  const dayShifts = shifts.filter((s) => isSameDay(parseISO(s.clockIn), date));
  minutes += dayShifts.reduce((sum, s) => sum + calculateWorkedMinutes(s), 0);

  for (const job of jobs) {
    if (!job.isSalaried) continue;
    if (selectedJobId && selectedJobId !== "all" && job.id !== selectedJobId)
      continue;
    if (isWorkday(date, job.workDaysPerWeek)) {
      minutes += 8 * 60;
    }
  }
  return minutes;
}

/** Minutes worked per day across the range (max 31 bars). */
export function getDailyHours(
  shifts: Shift[],
  range: DateRange,
  jobs: Job[] = [],
  selectedJobId?: string,
): DailyHours[] {
  const days: DailyHours[] = [];
  let cursor = range.start;
  let guard = 0;
  while (cursor <= range.end && guard < 32) {
    days.push({
      label: format(cursor, guard < 8 ? "EEE" : "d"),
      minutes: getMinutesForDay(cursor, shifts, jobs, selectedJobId),
    });
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

function aggregateByWeek(
  shifts: Shift[],
  range: DateRange,
  jobs: Job[] = [],
  selectedJobId?: string,
): ChartBar[] {
  const bars = new Map<string, { date: Date; minutes: number }>();
  let cursor = range.start;
  while (cursor <= range.end) {
    const weekStart = startOfWeekFn(cursor, { weekStartsOn: WEEK_STARTS_ON });
    const key = format(weekStart, "yyyy-MM-dd");
    if (!bars.has(key)) {
      bars.set(key, { date: weekStart, minutes: 0 });
    }
    const entry = bars.get(key)!;
    entry.minutes += getMinutesForDay(cursor, shifts, jobs, selectedJobId);
    cursor = addDays(cursor, 1);
  }
  return Array.from(bars.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({ label: format(b.date, "MMM d"), minutes: b.minutes }));
}

function aggregateByMonth(
  shifts: Shift[],
  range: DateRange,
  jobs: Job[] = [],
  selectedJobId?: string,
): ChartBar[] {
  const bars = new Map<string, { date: Date; minutes: number }>();
  let cursor = range.start;
  while (cursor <= range.end) {
    const monthStart = startOfMonthFn(cursor);
    const key = format(monthStart, "yyyy-MM");
    if (!bars.has(key)) {
      bars.set(key, { date: monthStart, minutes: 0 });
    }
    const entry = bars.get(key)!;
    entry.minutes += getMinutesForDay(cursor, shifts, jobs, selectedJobId);
    cursor = addDays(cursor, 1);
  }
  return Array.from(bars.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({ label: format(b.date, "MMM"), minutes: b.minutes }));
}

export function getChartBars(
  period: ReportPeriod,
  shifts: Shift[],
  range: DateRange,
  jobs: Job[] = [],
  selectedJobId?: string,
): ChartBar[] {
  if (period === "this-week" || period === "last-week") {
    return getDailyHours(shifts, range, jobs, selectedJobId);
  }
  if (period === "this-month" || period === "last-month") {
    return aggregateByWeek(shifts, range, jobs, selectedJobId);
  }
  return aggregateByMonth(shifts, range, jobs, selectedJobId);
}

export type PeriodReport = {
  pay: PayBreakdown;
  billsPaid: number;
  billsUnpaid: number;
  billsByCategory: { category: string; total: number }[];
  paidBillsByCategory: { category: string; total: number }[];
  netAfterBills: number;
};

export function buildPeriodReport(
  shifts: Shift[],
  occurrences: BillOccurrenceWithBill[],
  range: DateRange,
  jobs: Job[] = [],
  selectedJobId?: string,
  asOf: Date = new Date(),
): PeriodReport {
  const inRange = occurrences.filter((o) => {
    const due = parseISO(o.dueDate);
    return due >= range.start && due <= range.end;
  });

  const emptyPay: PayBreakdown = {
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    grossPay: 0,
    estimatedTaxes: 0,
    estimatedNetPay: 0,
  };

  let pay: PayBreakdown;
  if (selectedJobId && selectedJobId !== "all") {
    const job = jobs.find((j) => j.id === selectedJobId);
    if (job?.isSalaried) {
      pay = getSalaryPayForRange(job, range);
    } else {
      pay = aggregatePayForShifts(
        shifts.filter((s) => s.jobId === selectedJobId),
        asOf,
      );
    }
  } else {
    pay = { ...emptyPay };
    for (const job of jobs) {
      const jobShifts = shifts.filter((s) => s.jobId === job.id);
      const jobPay = job.isSalaried
        ? getSalaryPayForRange(job, range)
        : aggregatePayForShifts(jobShifts, asOf);
      pay.totalHours += jobPay.totalHours;
      pay.regularHours += jobPay.regularHours;
      pay.overtimeHours += jobPay.overtimeHours;
      pay.grossPay += jobPay.grossPay;
      pay.estimatedTaxes += jobPay.estimatedTaxes;
      pay.estimatedNetPay += jobPay.estimatedNetPay;
    }
  }

  const billsPaid = inRange
    .filter((o) => o.paid)
    .reduce((s, o) => s + o.amountSnapshot, 0);
  const billsUnpaid = inRange
    .filter((o) => !o.paid)
    .reduce((s, o) => s + o.amountSnapshot, 0);

  const categoryMap = new Map<string, number>();
  for (const occ of inRange) {
    categoryMap.set(
      occ.bill.category,
      (categoryMap.get(occ.bill.category) ?? 0) + occ.amountSnapshot,
    );
  }
  const billsByCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const paidCategoryMap = new Map<string, number>();
  for (const occ of inRange) {
    if (!occ.paid) continue;
    paidCategoryMap.set(
      occ.bill.category,
      (paidCategoryMap.get(occ.bill.category) ?? 0) + occ.amountSnapshot,
    );
  }
  const paidBillsByCategory = Array.from(paidCategoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    pay,
    billsPaid,
    billsUnpaid,
    billsByCategory,
    paidBillsByCategory,
    netAfterBills: pay.estimatedNetPay - billsPaid - billsUnpaid,
  };
}
