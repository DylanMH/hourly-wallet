import { addDays, endOfMonth, isSameDay, startOfDay } from "date-fns";

import { countWorkdaysInRange } from "@/lib/calculations/dateUtils";
import { calculateWeeklyPay, type PayBreakdown } from "@/lib/calculations/pay";
import {
    getMonthlyGrossForSalary,
    getSalaryNet,
} from "@/lib/calculations/salary";
import { getWeekRangeFor } from "@/lib/dates";
import type { Job, Shift } from "@/lib/types";

export type MonthlyProjection = {
  actualHours: number;
  regularEarningsSoFar: number;
  overtimeEarningsSoFar: number;
  netSoFar: number;
  grossSoFar: number;
  remainingPlannedWorkdays: number;
  expectedFutureRegularHours: number;
  expectedFutureOvertimeHours: number;
  projectedFutureGross: number;
  projectedFutureNet: number;
  projectedNet: number;
  projectedGross: number;
};

export type AffordabilityStatus = "on-track" | "close" | "shortfall";

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
    const weekStart = getWeekRangeFor(
      new Date(shift.clockIn),
    ).start.toISOString();
    const list = map.get(weekStart) ?? [];
    list.push(shift);
    map.set(weekStart, list);
  }
  return map;
}

/** Sums estimated net/gross pay for a set of shifts, respecting weekly overtime. */
function emptyPayBreakdown(): PayBreakdown {
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

function sumPayBreakdownForShifts(shifts: Shift[], asOf: Date): PayBreakdown {
  const weeks = groupShiftsByWeek(shifts);
  return Array.from(weeks.values()).reduce<PayBreakdown>(
    (total, weekShifts) => {
      const pay = calculateWeeklyPay(weekShifts, asOf);
      total.totalHours += pay.totalHours;
      total.regularHours += pay.regularHours;
      total.overtimeHours += pay.overtimeHours;
      total.regularEarnings += pay.regularEarnings;
      total.overtimeEarnings += pay.overtimeEarnings;
      total.grossPay += pay.grossPay;
      total.estimatedTaxes += pay.estimatedTaxes;
      total.estimatedNetPay += pay.estimatedNetPay;
      return total;
    },
    emptyPayBreakdown(),
  );
}

export function sumPayForShifts(
  shifts: Shift[],
  asOf: Date = new Date(),
): { gross: number; net: number } {
  const pay = sumPayBreakdownForShifts(shifts, asOf);
  return { gross: pay.grossPay, net: pay.estimatedNetPay };
}

function projectIncomeForJob(
  job: Job,
  shifts: Shift[],
  now: Date,
): MonthlyProjection {
  if (job.isSalaried) {
    const gross = getMonthlyGrossForSalary(job);
    const net = getSalaryNet(gross, job.taxPercent);
    return {
      actualHours: 0,
      regularEarningsSoFar: gross,
      overtimeEarningsSoFar: 0,
      netSoFar: net,
      grossSoFar: gross,
      remainingPlannedWorkdays: 0,
      expectedFutureRegularHours: 0,
      expectedFutureOvertimeHours: 0,
      projectedFutureGross: 0,
      projectedFutureNet: 0,
      projectedNet: net,
      projectedGross: gross,
    };
  }

  const pay = sumPayBreakdownForShifts(shifts, now);
  const todayHasShift = shifts.some((shift) =>
    isSameDay(new Date(shift.clockIn), now),
  );
  const futureStart = todayHasShift
    ? addDays(startOfDay(now), 1)
    : startOfDay(now);
  const monthEnd = endOfMonth(now);
  const remainingPlannedWorkdays =
    futureStart <= monthEnd
      ? countWorkdaysInRange(futureStart, monthEnd, job.workDaysPerWeek)
      : 0;
  const expectedFutureRegularHours = remainingPlannedWorkdays * 8;
  const projectedFutureGross = expectedFutureRegularHours * job.hourlyRate;
  const projectedFutureNet = getSalaryNet(projectedFutureGross, job.taxPercent);

  return {
    actualHours: pay.totalHours,
    regularEarningsSoFar: pay.regularEarnings,
    overtimeEarningsSoFar: pay.overtimeEarnings,
    netSoFar: pay.estimatedNetPay,
    grossSoFar: pay.grossPay,
    remainingPlannedWorkdays,
    expectedFutureRegularHours,
    expectedFutureOvertimeHours: 0,
    projectedFutureGross,
    projectedFutureNet,
    projectedNet: pay.estimatedNetPay + projectedFutureNet,
    projectedGross: pay.grossPay + projectedFutureGross,
  };
}

/**
 * Projects income for the current month using a conservative model:
 * actual earnings so far plus expected future scheduled regular hours.
 * No future overtime is projected by default.
 */
export function projectMonthlyIncome(
  monthShifts: Shift[],
  jobs: Job[],
  selectedJobId: string | undefined,
  now: Date = new Date(),
): MonthlyProjection {
  if (selectedJobId && selectedJobId !== "all") {
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) {
      return {
        actualHours: 0,
        regularEarningsSoFar: 0,
        overtimeEarningsSoFar: 0,
        netSoFar: 0,
        grossSoFar: 0,
        remainingPlannedWorkdays: 0,
        expectedFutureRegularHours: 0,
        expectedFutureOvertimeHours: 0,
        projectedFutureGross: 0,
        projectedFutureNet: 0,
        projectedNet: 0,
        projectedGross: 0,
      };
    }
    const shifts = monthShifts.filter((s) => s.jobId === job.id);
    return projectIncomeForJob(job, shifts, now);
  }

  const result: MonthlyProjection = {
    actualHours: 0,
    regularEarningsSoFar: 0,
    overtimeEarningsSoFar: 0,
    netSoFar: 0,
    grossSoFar: 0,
    remainingPlannedWorkdays: 0,
    expectedFutureRegularHours: 0,
    expectedFutureOvertimeHours: 0,
    projectedFutureGross: 0,
    projectedFutureNet: 0,
    projectedNet: 0,
    projectedGross: 0,
  };
  for (const job of jobs) {
    const shifts = monthShifts.filter((s) => s.jobId === job.id);
    const projection = projectIncomeForJob(job, shifts, now);
    result.actualHours += projection.actualHours;
    result.regularEarningsSoFar += projection.regularEarningsSoFar;
    result.overtimeEarningsSoFar += projection.overtimeEarningsSoFar;
    result.netSoFar += projection.netSoFar;
    result.grossSoFar += projection.grossSoFar;
    result.remainingPlannedWorkdays += projection.remainingPlannedWorkdays;
    result.expectedFutureRegularHours += projection.expectedFutureRegularHours;
    result.expectedFutureOvertimeHours +=
      projection.expectedFutureOvertimeHours;
    result.projectedFutureGross += projection.projectedFutureGross;
    result.projectedFutureNet += projection.projectedFutureNet;
    result.projectedNet += projection.projectedNet;
    result.projectedGross += projection.projectedGross;
  }
  return result;
}

/**
 * Compares projected monthly net income against total bills due this month.
 * "Close" means the surplus is within 10% of the monthly bills total.
 */
export function calculateMonthlyAffordability(
  projectedNet: number,
  totalBillsDue: number,
): MonthlyAffordability {
  const surplus = projectedNet - totalBillsDue;
  const closeThreshold = Math.max(totalBillsDue * 0.1, 50);
  let status: AffordabilityStatus;
  if (surplus >= closeThreshold) {
    status = "on-track";
  } else if (surplus >= 0) {
    status = "close";
  } else {
    status = "shortfall";
  }
  return { status, projectedNet, totalBillsDue, surplus };
}
