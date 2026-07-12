import { countWorkdaysInRange } from "@/lib/calculations/dateUtils";
import { calculateWeeklyPay } from "@/lib/calculations/pay";
import {
    getMonthlyGrossForSalary,
    getSalaryNet,
} from "@/lib/calculations/salary";
import { getCurrentMonthRange, getWeekRangeFor } from "@/lib/dates";
import type { Job, Shift } from "@/lib/types";

export type MonthlyProjection = {
  netSoFar: number;
  grossSoFar: number;
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
export function sumPayForShifts(
  shifts: Shift[],
  asOf: Date = new Date(),
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

function projectIncomeForJob(
  job: Job,
  shifts: Shift[],
  now: Date,
): MonthlyProjection {
  if (job.isSalaried) {
    const gross = getMonthlyGrossForSalary(job);
    const net = getSalaryNet(gross, job.taxPercent);
    return {
      netSoFar: net,
      grossSoFar: gross,
      projectedNet: net,
      projectedGross: gross,
    };
  }

  const { start } = getCurrentMonthRange(now);
  const { gross, net } = sumPayForShifts(shifts, now);
  const elapsedWorkdays = countWorkdaysInRange(start, now, job.workDaysPerWeek);
  const workdaysInMonth = countWorkdaysInRange(
    start,
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
    job.workDaysPerWeek,
  );
  const effectiveElapsed = Math.max(1, elapsedWorkdays);
  const projectedNet = (net / effectiveElapsed) * workdaysInMonth;
  const projectedGross = (gross / effectiveElapsed) * workdaysInMonth;
  return { netSoFar: net, grossSoFar: gross, projectedNet, projectedGross };
}

/**
 * Projects income for the current month. For hourly jobs it extrapolates the
 * month-to-date average using the job's configured workdays per week. For
 * salaried jobs it returns the fixed monthly salary net/gross.
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
      return { netSoFar: 0, grossSoFar: 0, projectedNet: 0, projectedGross: 0 };
    }
    const shifts = monthShifts.filter((s) => s.jobId === job.id);
    return projectIncomeForJob(job, shifts, now);
  }

  const result = {
    netSoFar: 0,
    grossSoFar: 0,
    projectedNet: 0,
    projectedGross: 0,
  };
  for (const job of jobs) {
    const shifts = monthShifts.filter((s) => s.jobId === job.id);
    const projection = projectIncomeForJob(job, shifts, now);
    result.netSoFar += projection.netSoFar;
    result.grossSoFar += projection.grossSoFar;
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
