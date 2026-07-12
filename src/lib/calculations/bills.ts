import { isWithinInterval, parseISO, startOfDay } from "date-fns";

import { getCurrentMonthRange, getCurrentWeekRange } from "@/lib/dates";
import type { BillOccurrenceWithBill } from "@/lib/types";

export function getBillsDueThisWeek(
  occurrences: BillOccurrenceWithBill[],
  now: Date = new Date(),
): BillOccurrenceWithBill[] {
  const { start, end } = getCurrentWeekRange(now);
  return occurrences.filter((o) =>
    isWithinInterval(parseISO(o.dueDate), { start, end }),
  );
}

export function getBillsDueThisMonth(
  occurrences: BillOccurrenceWithBill[],
  now: Date = new Date(),
): BillOccurrenceWithBill[] {
  const { start, end } = getCurrentMonthRange(now);
  return occurrences.filter((o) =>
    isWithinInterval(parseISO(o.dueDate), { start, end }),
  );
}

export function getBillsDueToday(
  occurrences: BillOccurrenceWithBill[],
  now: Date = new Date(),
): BillOccurrenceWithBill[] {
  const today = startOfDay(now).getTime();
  return occurrences.filter(
    (o) => startOfDay(parseISO(o.dueDate)).getTime() === today,
  );
}

export function getOverdueBills(
  occurrences: BillOccurrenceWithBill[],
  now: Date = new Date(),
): BillOccurrenceWithBill[] {
  const today = startOfDay(now).getTime();
  return occurrences.filter(
    (o) => !o.paid && startOfDay(parseISO(o.dueDate)).getTime() < today,
  );
}

export function getPaidBillsThisMonth(
  occurrences: BillOccurrenceWithBill[],
  now: Date = new Date(),
): BillOccurrenceWithBill[] {
  return getBillsDueThisMonth(occurrences, now).filter((o) => o.paid);
}

export function getUnpaidBillsThisMonth(
  occurrences: BillOccurrenceWithBill[],
  now: Date = new Date(),
): BillOccurrenceWithBill[] {
  return getBillsDueThisMonth(occurrences, now).filter((o) => !o.paid);
}

export function getPaidBillsThisWeek(
  occurrences: BillOccurrenceWithBill[],
  now: Date = new Date(),
): BillOccurrenceWithBill[] {
  return getBillsDueThisWeek(occurrences, now).filter((o) => o.paid);
}

export function getUnpaidBillsThisWeek(
  occurrences: BillOccurrenceWithBill[],
  now: Date = new Date(),
): BillOccurrenceWithBill[] {
  return getBillsDueThisWeek(occurrences, now).filter((o) => !o.paid);
}

export function sumOccurrences(occurrences: BillOccurrenceWithBill[]): number {
  return occurrences.reduce((sum, o) => sum + o.amountSnapshot, 0);
}
