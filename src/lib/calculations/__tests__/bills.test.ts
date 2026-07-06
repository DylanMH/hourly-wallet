/// <reference types="jest" />

import {
    getBillsDueThisMonth,
    getBillsDueThisWeek,
    getBillsDueToday,
    getOverdueBills,
    sumOccurrences,
} from "../bills";

import type { BillOccurrenceWithBill } from "@/lib/types";

function makeOccurrence(
  dueDate: string,
  paid: boolean,
): BillOccurrenceWithBill {
  return {
    id: `occ-${dueDate}`,
    billId: "bill-1",
    bill: {
      id: "bill-1",
      name: "Test Bill",
      amount: 100,
      dueDay: 15,
      recurrence: "monthly",
      category: "Utilities",
      active: true,
      reminderEnabled: false,
      reminderDaysBefore: 0,
      autopay: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    dueDate,
    amountSnapshot: 100,
    paid,
    paidAt: paid ? "2026-01-01T00:00:00.000Z" : undefined,
    autopaid: false,
    notificationId: undefined,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("bill calculations", () => {
  const occurrences = [
    makeOccurrence("2026-01-06", false), // today
    makeOccurrence("2026-01-07", false), // this week
    makeOccurrence("2026-01-15", true), // this month
    makeOccurrence("2025-12-31", false), // overdue
  ];

  const now = new Date(2026, 0, 6, 12, 0, 0); // Jan 6, 2026 local

  test("finds bills due today", () => {
    expect(getBillsDueToday(occurrences, now)).toHaveLength(1);
  });

  test("finds bills due this week", () => {
    expect(getBillsDueThisWeek(occurrences, now)).toHaveLength(2);
  });

  test("finds bills due this month", () => {
    expect(getBillsDueThisMonth(occurrences, now)).toHaveLength(3);
  });

  test("finds overdue bills", () => {
    expect(getOverdueBills(occurrences, now)).toHaveLength(1);
  });

  test("sums occurrence amounts", () => {
    expect(sumOccurrences(occurrences)).toBe(400);
  });
});
