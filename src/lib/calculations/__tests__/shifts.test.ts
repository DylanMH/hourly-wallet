/// <reference types="jest" />

import {
    calculateLunchMinutes,
    calculatePaidBreakMinutes,
    calculateShiftDuration,
    calculateUnpaidBreakMinutes,
    calculateWorkedMinutes,
} from "../shifts";

import type { Shift } from "@/lib/types";

type PartialShiftInput = Partial<Shift> & {
  clockIn: string;
  clockOut?: string;
  lunchStart?: string;
  lunchEnd?: string;
};

function makeShift(partial: PartialShiftInput): Shift {
  const lunches =
    partial.lunches ??
    (partial.lunchStart
      ? [
          {
            id: "lunch-1",
            start: partial.lunchStart,
            end: partial.lunchEnd,
          },
        ]
      : []);
  return {
    id: "shift-1",
    jobId: "job-1",
    date: "2026-01-01",
    clockIn: partial.clockIn,
    clockOut: partial.clockOut,
    lunches,
    breaks: partial.breaks ?? [],
    notes: undefined,
    isHolidayPay: false,
    isPTO: false,
    hourlyRateSnapshot: 20,
    overtimeEnabledSnapshot: false,
    overtimeMultiplierSnapshot: 1,
    overtimeThresholdSnapshot: 40,
    taxPercentSnapshot: 15,
    holidayPayInOvertimeSnapshot: false,
    ptoInOvertimeSnapshot: false,
    createdAt: partial.clockIn,
    updatedAt: partial.clockIn,
  };
}

describe("shift calculations", () => {
  test("calculates total duration", () => {
    const shift = makeShift({
      clockIn: "2026-01-01T09:00:00.000Z",
      clockOut: "2026-01-01T17:00:00.000Z",
    });
    expect(calculateShiftDuration(shift)).toBe(480);
  });

  test("subtracts lunch from worked minutes", () => {
    const shift = makeShift({
      clockIn: "2026-01-01T09:00:00.000Z",
      clockOut: "2026-01-01T17:00:00.000Z",
      lunchStart: "2026-01-01T12:00:00.000Z",
      lunchEnd: "2026-01-01T12:30:00.000Z",
    });
    expect(calculateLunchMinutes(shift)).toBe(30);
    expect(calculateWorkedMinutes(shift)).toBe(450);
  });

  test("subtracts unpaid breaks but keeps paid breaks", () => {
    const shift = makeShift({
      clockIn: "2026-01-01T09:00:00.000Z",
      clockOut: "2026-01-01T17:00:00.000Z",
      breaks: [
        {
          id: "b1",
          start: "2026-01-01T14:00:00.000Z",
          end: "2026-01-01T14:15:00.000Z",
          paid: true,
        },
        {
          id: "b2",
          start: "2026-01-01T15:00:00.000Z",
          end: "2026-01-01T15:15:00.000Z",
          paid: false,
        },
      ],
    });
    expect(calculatePaidBreakMinutes(shift)).toBe(15);
    expect(calculateUnpaidBreakMinutes(shift)).toBe(15);
    expect(calculateWorkedMinutes(shift)).toBe(465);
  });

  test("active shift uses asOf time", () => {
    const clockIn = "2026-01-01T09:00:00.000Z";
    const asOf = new Date("2026-01-01T12:00:00.000Z");
    const shift = makeShift({ clockIn });
    expect(calculateWorkedMinutes(shift, asOf)).toBe(180);
  });

  test("does not add worked time while on lunch", () => {
    const clockIn = "2026-01-01T09:00:30.000Z";
    const lunchStart = "2026-01-01T09:05:45.000Z";
    const workedBeforeLunch = calculateWorkedMinutes(
      makeShift({ clockIn, lunchStart }),
      new Date(lunchStart),
    );

    const asOfTimes = [
      "2026-01-01T09:06:00.000Z",
      "2026-01-01T09:06:29.000Z",
      "2026-01-01T09:06:30.000Z",
      "2026-01-01T09:07:15.000Z",
      "2026-01-01T09:10:00.000Z",
    ];

    for (const asOfIso of asOfTimes) {
      expect(
        calculateWorkedMinutes(
          makeShift({ clockIn, lunchStart }),
          new Date(asOfIso),
        ),
      ).toBe(workedBeforeLunch);
    }
  });

  test("does not add worked time during an unpaid break", () => {
    const clockIn = "2026-01-01T09:00:20.000Z";
    const breakStart = "2026-01-01T09:03:50.000Z";
    const shift = makeShift({
      clockIn,
      breaks: [
        {
          id: "b1",
          start: breakStart,
          paid: false,
        },
      ],
    });

    const workedBeforeBreak = calculateWorkedMinutes(
      shift,
      new Date(breakStart),
    );

    const asOfTimes = [
      "2026-01-01T09:04:00.000Z",
      "2026-01-01T09:04:59.000Z",
      "2026-01-01T09:05:01.000Z",
      "2026-01-01T09:08:00.000Z",
    ];

    for (const asOfIso of asOfTimes) {
      expect(calculateWorkedMinutes(shift, new Date(asOfIso))).toBe(
        workedBeforeBreak,
      );
    }
  });
});
