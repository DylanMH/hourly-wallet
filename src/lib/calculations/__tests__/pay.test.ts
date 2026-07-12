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

describe("weekly pay calculations", () => {
  test("calculates gross pay for a single shift", () => {
    const shift = makeShift({
      clockIn: "2026-01-01T09:00:00.000Z",
      clockOut: "2026-01-01T17:00:00.000Z",
    });
    const pay = calculateWeeklyPay([shift]);
    expect(pay.totalHours).toBe(8);
    expect(pay.grossPay).toBe(160);
    expect(pay.estimatedNetPay).toBe(144);
  });

  test("applies overtime when enabled", () => {
    const shifts = Array.from({ length: 6 }).map((_, i) =>
      makeShift({
        clockIn: `2026-01-0${i + 1}T09:00:00.000Z`,
        clockOut: `2026-01-0${i + 1}T17:00:00.000Z`,
        overtimeEnabledSnapshot: true,
      }),
    );
    // 6 shifts * 8 hours = 48 hours. Overtime threshold is 40.
    const pay = calculateWeeklyPay(shifts);
    expect(pay.totalHours).toBe(48);
    expect(pay.overtimeHours).toBe(8);
    expect(pay.grossPay).toBeCloseTo(40 * 20 + 8 * 20 * 1.5, 2);
  });
});
