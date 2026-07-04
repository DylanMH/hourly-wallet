import {
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  getDaysInMonth,
  isAfter,
  isBefore,
  parseISO,
  setDate,
  startOfDay,
  startOfMonth,
} from 'date-fns';

import {
  deleteBill as deleteBillRow,
  deleteUnpaidOccurrencesForBill,
  getBills,
  getOccurrencesForBill,
  insertBill,
  insertOccurrence,
  occurrenceExists,
  updateBill as updateBillRow,
  updateOccurrence,
} from '@/db/queries/billQueries';
import { toDateKey } from '@/lib/dates';
import { cancelBillReminder, scheduleBillReminder } from '@/lib/notifications';
import type { Bill, BillOccurrence } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

/** How far ahead occurrences are generated. */
const HORIZON_MONTHS = 2;

function clampDueDay(base: Date, dueDay: number): Date {
  const day = Math.min(Math.max(1, dueDay), getDaysInMonth(base));
  return setDate(base, day);
}

/**
 * Computes all due dates for a bill from its anchor date through the horizon.
 */
export function computeDueDates(bill: Bill, now: Date = new Date()): string[] {
  const horizon = endOfMonth(addMonths(now, HORIZON_MONTHS));
  const dates: Date[] = [];

  if (bill.recurrence === 'one-time') {
    if (bill.dueDate) dates.push(startOfDay(parseISO(bill.dueDate)));
  } else if (bill.recurrence === 'monthly' && bill.dueDay != null) {
    let cursor = startOfMonth(parseISO(bill.createdAt));
    while (!isAfter(cursor, horizon)) {
      dates.push(startOfDay(clampDueDay(cursor, bill.dueDay)));
      cursor = addMonths(cursor, 1);
    }
  } else if (bill.dueDate) {
    let cursor = startOfDay(parseISO(bill.dueDate));
    while (!isAfter(cursor, horizon)) {
      dates.push(cursor);
      if (bill.recurrence === 'weekly') cursor = addWeeks(cursor, 1);
      else if (bill.recurrence === 'biweekly') cursor = addWeeks(cursor, 2);
      else if (bill.recurrence === 'monthly') cursor = addMonths(cursor, 1);
      else if (bill.recurrence === 'yearly') cursor = addYears(cursor, 1);
      else break;
    }
  }

  // Skip occurrences from before the bill was created (except one-time bills,
  // which may intentionally be backdated).
  const anchor = startOfDay(startOfMonth(parseISO(bill.createdAt)));
  return dates
    .filter((d) => bill.recurrence === 'one-time' || !isBefore(d, anchor))
    .map((d) => toDateKey(d));
}

/** Creates any missing occurrences for a bill through the horizon. */
export async function generateOccurrencesForBill(bill: Bill, now: Date = new Date()): Promise<void> {
  if (!bill.active) return;
  const dueDates = computeDueDates(bill, now);
  for (const dueDate of dueDates) {
    const exists = await occurrenceExists(bill.id, dueDate);
    if (exists) continue;
    const occurrence = await insertOccurrence({
      billId: bill.id,
      dueDate,
      amountSnapshot: bill.amount,
      paid: false,
      autopaid: false,
    });
    if (bill.reminderEnabled) {
      const notificationId = await scheduleBillReminder(bill, occurrence);
      if (notificationId) {
        await updateOccurrence({ ...occurrence, notificationId });
      }
    }
  }
}

export async function generateAllOccurrences(now: Date = new Date()): Promise<void> {
  const bills = await getBills();
  for (const bill of bills) {
    await generateOccurrencesForBill(bill, now);
  }
}

/**
 * Marks unpaid autopay-bill occurrences as paid once their due date arrives.
 * Runs on app open, foreground, and date change.
 */
export async function processAutopayBills(now: Date = new Date()): Promise<number> {
  const bills = await getBills();
  const today = startOfDay(now);
  let processed = 0;
  for (const bill of bills) {
    if (!bill.autopay) continue;
    const occurrences = await getOccurrencesForBill(bill.id);
    for (const occ of occurrences) {
      if (occ.paid) continue;
      const due = startOfDay(parseISO(occ.dueDate));
      if (!isAfter(due, today)) {
        await updateOccurrence({
          ...occ,
          paid: true,
          paidAt: now.toISOString(),
          autopaid: true,
        });
        if (occ.notificationId) {
          await cancelBillReminder(occ.notificationId);
        }
        processed += 1;
      }
    }
  }
  if (processed > 0) {
    useAppStore.getState().bumpBills();
  }
  return processed;
}

export async function createBill(
  data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Bill> {
  const bill = await insertBill(data);
  await generateOccurrencesForBill(bill);
  await processAutopayBills();
  useAppStore.getState().bumpBills();
  return bill;
}

export async function editBill(bill: Bill): Promise<Bill> {
  const updated = await updateBillRow(bill);
  // Regenerate future unpaid occurrences to reflect new amount/schedule.
  const occurrences = await getOccurrencesForBill(bill.id);
  for (const occ of occurrences) {
    if (!occ.paid && occ.notificationId) {
      await cancelBillReminder(occ.notificationId);
    }
  }
  await deleteUnpaidOccurrencesForBill(bill.id);
  await generateOccurrencesForBill(updated);
  await processAutopayBills();
  useAppStore.getState().bumpBills();
  return updated;
}

export async function removeBill(billId: string): Promise<void> {
  const occurrences = await getOccurrencesForBill(billId);
  for (const occ of occurrences) {
    if (occ.notificationId) {
      await cancelBillReminder(occ.notificationId);
    }
  }
  await deleteBillRow(billId);
  useAppStore.getState().bumpBills();
}

export async function setOccurrencePaid(
  occurrence: BillOccurrence,
  paid: boolean
): Promise<BillOccurrence> {
  const updated = await updateOccurrence({
    ...occurrence,
    paid,
    paidAt: paid ? new Date().toISOString() : undefined,
    autopaid: paid ? occurrence.autopaid : false,
  });
  if (paid && occurrence.notificationId) {
    await cancelBillReminder(occurrence.notificationId);
  }
  useAppStore.getState().bumpBills();
  return updated;
}
