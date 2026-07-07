/// <reference types="jest" />

import {
  calculateMonthlyAffordability,
  projectMonthlyIncome,
} from "@/lib/calculations/affordability";
import type { Job, Shift } from "@/lib/types";

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    name: "Test Job",
    isDefault: true,
    isSalaried: false,
    salaryAmount: 0,
    salaryPeriod: "monthly",
    hourlyRate: 20,
    overtimeEnabled: false,
    overtimeMultiplier: 1.5,
    overtimeThresholdHours: 40,
    taxPercent: 20,
    defaultLunchMinutes: 30,
    defaultBreakMinutes: 15,
    breakPaidByDefault: false,
    holidayPayInOvertime: false,
    allowPTOInOvertime: false,
    payPeriod: "weekly",
    workDaysPerWeek: 5,
    currency: "USD",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildShift(overrides: Partial<Shift> = {}): Shift {
  const date = overrides.date ?? "2026-07-06";
  const clockIn = overrides.clockIn ?? `${date}T09:00:00.000Z`;
  const clockOut = overrides.clockOut ?? `${date}T21:00:00.000Z`;
  return {
    id: "shift-1",
    jobId: "job-1",
    date,
    clockIn,
    clockOut,
    breaks: [],
    notes: undefined,
    isHolidayPay: false,
    isPTO: false,
    hourlyRateSnapshot: 20,
    overtimeEnabledSnapshot: false,
    overtimeMultiplierSnapshot: 1.5,
    overtimeThresholdSnapshot: 40,
    taxPercentSnapshot: 20,
    holidayPayInOvertimeSnapshot: false,
    ptoInOvertimeSnapshot: false,
    createdAt: clockIn,
    updatedAt: clockIn,
    ...overrides,
  };
}

describe("projectMonthlyIncome", () => {
  it("projects hourly income across the month from a single shift", () => {
    // 2026-07-06 is a Monday. July 2026 starts on Wednesday and has 23 workdays.
    // Elapsed workdays from July 1 to July 6: Wed, Thu, Fri, Mon = 4.
    const now = new Date("2026-07-06T12:00:00.000Z");
    const job = buildJob({ hourlyRate: 20, taxPercent: 20, workDaysPerWeek: 5 });
    // 12-hour shift at $20/hr, 20% tax => net = 240 * 0.8 = 192
    const shift = buildShift({ clockIn: "2026-07-06T09:00:00.000Z", clockOut: "2026-07-06T21:00:00.000Z" });
    const result = projectMonthlyIncome([shift], [job], job.id, now);
    expect(result.netSoFar).toBeCloseTo(192, 0);
    // 192 / 4 * 23
    expect(result.projectedNet).toBeCloseTo(1104, 0);
    expect(result.grossSoFar).toBeCloseTo(240, 0);
    expect(result.projectedGross).toBeCloseTo(1380, 0);
  });

  it("returns the fixed monthly salary for salaried jobs", () => {
    const now = new Date("2026-07-06T12:00:00.000Z");
    const job = buildJob({
      isSalaried: true,
      salaryAmount: 5000,
      salaryPeriod: "monthly",
      taxPercent: 20,
    });
    const result = projectMonthlyIncome([], [job], job.id, now);
    expect(result.projectedGross).toBeCloseTo(5000, 0);
    expect(result.projectedNet).toBeCloseTo(4000, 0);
  });

  it("aggregates projections across all jobs", () => {
    const now = new Date("2026-07-06T12:00:00.000Z");
    const hourly = buildJob({ id: "job-1", hourlyRate: 20, taxPercent: 20, workDaysPerWeek: 5 });
    const salaried = buildJob({
      id: "job-2",
      isSalaried: true,
      salaryAmount: 3000,
      salaryPeriod: "monthly",
      taxPercent: 10,
    });
    const shift = buildShift({ jobId: "job-1", hourlyRateSnapshot: 20, taxPercentSnapshot: 20 });
    const result = projectMonthlyIncome([shift], [hourly, salaried], "all", now);
    const hourlyProjection = projectMonthlyIncome([shift], [hourly], hourly.id, now);
    const salaryProjection = projectMonthlyIncome([], [salaried], salaried.id, now);
    expect(result.projectedNet).toBeCloseTo(
      hourlyProjection.projectedNet + salaryProjection.projectedNet,
      0,
    );
  });
});

describe("calculateMonthlyAffordability", () => {
  it("flags on-track when surplus exceeds the threshold", () => {
    const result = calculateMonthlyAffordability(5000, 1000);
    expect(result.status).toBe("on-track");
    expect(result.surplus).toBe(4000);
  });

  it("flags shortfall when projected net is below bills", () => {
    const result = calculateMonthlyAffordability(500, 1000);
    expect(result.status).toBe("shortfall");
    expect(result.surplus).toBe(-500);
  });

  it("flags close when surplus is within 10% of bills", () => {
    const result = calculateMonthlyAffordability(1050, 1000);
    expect(result.status).toBe("close");
  });
});
