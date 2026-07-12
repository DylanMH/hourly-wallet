/// <reference types="jest" />

import { calculateWeeklyPay } from "../pay";

import type { Shift } from "@/lib/types";

function makeShift(
  partial: Partial<Shift> & { clockIn: string; clockOut?: string },
): Shift {
  return {
    id: "shift-1",
    jobId: "job-1",
    date: "2026-01-01",
    clockIn: partial.clockIn,
    clockOut: partial.clockOut,
    lunchStart: partial.lunchStart,
    lunchEnd: partial.lunchEnd,
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
});
