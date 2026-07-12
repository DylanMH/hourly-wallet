/// <reference types="jest" />

import { calculateWeeklyPay } from "../pay";

import type { Shift } from "@/lib/types";

function makeShift(
  partial: Partial<Shift> & { clockIn: string; clockOut?: string },
): Shift {
  return {
    id: partial.id ?? partial.clockIn,
    jobId: "job-1",
    date: "2026-01-01",
    clockIn: partial.clockIn,
    clockOut: partial.clockOut,
    lunches: [],
    breaks: partial.breaks ?? [],
    notes: undefined,
    isHolidayPay: false,
    isPTO: false,
    hourlyRateSnapshot: 20,
    overtimeEnabledSnapshot: partial.overtimeEnabledSnapshot ?? false,
    overtimeMultiplierSnapshot: 1.5,
    overtimeThresholdSnapshot: 40,
    taxPercentSnapshot: 10,
    holidayPayInOvertimeSnapshot: false,
    ptoInOvertimeSnapshot: false,
    createdAt: partial.clockIn,
    updatedAt: partial.clockIn,
  };
}

describe("overtime rounding regressions", () => {
  test("does not produce overtime for exactly 40 hours", () => {
    const shifts = Array.from({ length: 5 }).map((_, i) =>
      makeShift({
        clockIn: `2026-01-0${i + 1}T09:00:00.000Z`,
        clockOut: `2026-01-0${i + 1}T17:00:00.000Z`,
        overtimeEnabledSnapshot: true,
      }),
    );
    const pay = calculateWeeklyPay(shifts);
    expect(pay.totalHours).toBe(40);
    expect(pay.overtimeHours).toBe(0);
    expect(pay.regularHours).toBe(40);
  });

  test("overtime is computed in whole minutes", () => {
    const shifts = Array.from({ length: 5 }).map((_, i) =>
      makeShift({
        clockIn: `2026-01-0${i + 1}T09:00:00.000Z`,
        clockOut: `2026-01-0${i + 1}T17:00:00.000Z`,
        overtimeEnabledSnapshot: true,
      }),
    );
    shifts.push(
      makeShift({
        clockIn: "2026-01-06T09:00:00.000Z",
        clockOut: "2026-01-06T09:01:00.000Z",
        overtimeEnabledSnapshot: true,
      }),
    );
    const pay = calculateWeeklyPay(shifts);
    expect(pay.totalHours).toBeCloseTo(40 + 1 / 60, 4);
    expect(pay.overtimeHours).toBeCloseTo(1 / 60, 4);
    expect(pay.regularHours).toBe(40);
  });

  test("separates regular and overtime earnings", () => {
    const shifts = Array.from({ length: 6 }).map((_, i) =>
      makeShift({
        clockIn: `2026-01-0${i + 1}T09:00:00.000Z`,
        clockOut: `2026-01-0${i + 1}T17:00:00.000Z`,
        overtimeEnabledSnapshot: true,
      }),
    );
    const pay = calculateWeeklyPay(shifts);
    expect(pay.regularEarnings).toBe(800);
    expect(pay.overtimeEarnings).toBe(240);
    expect(pay.grossPay).toBe(pay.regularEarnings + pay.overtimeEarnings);
  });

  test("allocates overtime chronologically even when shifts are unordered", () => {
    const early = makeShift({
      id: "early",
      clockIn: "2026-01-01T09:00:00.000Z",
      clockOut: "2026-01-01T17:00:00.000Z",
      overtimeEnabledSnapshot: true,
    });
    const late = makeShift({
      id: "late",
      clockIn: "2026-01-02T09:00:00.000Z",
      clockOut: "2026-01-02T17:00:00.000Z",
      overtimeEnabledSnapshot: true,
    });
    const pay = calculateWeeklyPay([late, early]);
    expect(pay.regularHours).toBe(16);
    expect(pay.overtimeHours).toBe(0);
    expect(pay.regularEarnings).toBe(320);
    expect(pay.overtimeEarnings).toBe(0);
  });
});
