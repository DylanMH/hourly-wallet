import { z } from 'zod';

import { getDatabase } from '@/db/database';
import {
  getAllOccurrences,
  getBills,
  insertBill,
  insertOccurrence,
} from '@/db/queries/billQueries';
import { getPaySettings, updatePaySettings } from '@/db/queries/settingsQueries';
import { getAllShifts, insertShift } from '@/db/queries/shiftQueries';
import { getJobs, insertJob, ensureDefaultJob } from '@/db/queries/jobQueries';
import type { Bill, BillCategory, BillOccurrence, BillRecurrence, Job, Shift } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

const shiftBreakSchema = z.object({
  id: z.string(),
  start: z.string(),
  end: z.string().optional(),
  paid: z.boolean(),
});

const shiftSchema = z.object({
  id: z.string(),
  jobId: z.string().default('default'),
  date: z.string(),
  clockIn: z.string(),
  clockOut: z.string().optional(),
  lunchStart: z.string().optional(),
  lunchEnd: z.string().optional(),
  breaks: z.array(shiftBreakSchema),
  notes: z.string().optional(),
  isHolidayPay: z.boolean().default(false),
  isPTO: z.boolean().default(false),
  hourlyRateSnapshot: z.number(),
  overtimeEnabledSnapshot: z.boolean(),
  overtimeMultiplierSnapshot: z.number(),
  overtimeThresholdSnapshot: z.number(),
  taxPercentSnapshot: z.number(),
  holidayPayInOvertimeSnapshot: z.boolean().default(false),
  ptoInOvertimeSnapshot: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const billSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  category: z.string(),
  recurrence: z.enum(['one-time', 'weekly', 'biweekly', 'monthly', 'yearly']),
  dueDay: z.number().optional(),
  dueDate: z.string().optional(),
  autopay: z.boolean(),
  reminderEnabled: z.boolean(),
  reminderDaysBefore: z.number().optional(),
  notes: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const occurrenceSchema = z.object({
  id: z.string(),
  billId: z.string(),
  dueDate: z.string(),
  amountSnapshot: z.number(),
  paid: z.boolean(),
  paidAt: z.string().optional(),
  autopaid: z.boolean(),
  notificationId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const settingsSchema = z.object({
  hourlyRate: z.number(),
  overtimeEnabled: z.boolean(),
  overtimeMultiplier: z.number(),
  overtimeThresholdHours: z.number(),
  taxPercent: z.number(),
  defaultLunchMinutes: z.number(),
  defaultBreakMinutes: z.number(),
  breakPaidByDefault: z.boolean(),
  holidayPayInOvertime: z.boolean().default(false),
  allowPTOInOvertime: z.boolean().default(false),
  payPeriod: z.enum(['weekly', 'biweekly', 'semi-monthly', 'monthly']),
});

const jobSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  hourlyRate: z.number(),
  overtimeEnabled: z.boolean(),
  overtimeMultiplier: z.number(),
  overtimeThresholdHours: z.number(),
  taxPercent: z.number(),
  defaultLunchMinutes: z.number(),
  defaultBreakMinutes: z.number(),
  breakPaidByDefault: z.boolean(),
  holidayPayInOvertime: z.boolean().default(false),
  allowPTOInOvertime: z.boolean().default(false),
  payPeriod: z.enum(['weekly', 'biweekly', 'semi-monthly', 'monthly']),
  currency: z.literal('USD').default('USD'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const backupSchema = z.object({
  app: z.literal('hourly-wallet'),
  version: z.number(),
  exportedAt: z.string(),
  settings: settingsSchema,
  jobs: z.array(jobSchema).default([]),
  shifts: z.array(shiftSchema),
  bills: z.array(billSchema),
  billOccurrences: z.array(occurrenceSchema),
});

export type Backup = z.infer<typeof backupSchema>;

export async function exportData(): Promise<string> {
  const settings = await getPaySettings();
  const jobs = await getJobs();
  const shifts = await getAllShifts();
  const bills = await getBills(true);
  const billOccurrences = await getAllOccurrences();

  const backup: Backup = {
    app: 'hourly-wallet',
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: {
      hourlyRate: settings.hourlyRate,
      overtimeEnabled: settings.overtimeEnabled,
      overtimeMultiplier: settings.overtimeMultiplier,
      overtimeThresholdHours: settings.overtimeThresholdHours,
      taxPercent: settings.taxPercent,
      defaultLunchMinutes: settings.defaultLunchMinutes,
      defaultBreakMinutes: settings.defaultBreakMinutes,
      breakPaidByDefault: settings.breakPaidByDefault,
      holidayPayInOvertime: settings.holidayPayInOvertime,
      allowPTOInOvertime: settings.allowPTOInOvertime,
      payPeriod: settings.payPeriod,
    },
    jobs,
    shifts,
    bills,
    billOccurrences,
  };
  return JSON.stringify(backup, null, 2);
}

/** Validates a backup JSON string. Throws with a readable message if invalid. */
export function validateBackup(json: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Not valid JSON.');
  }
  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('This does not look like a Hourly Wallet backup.');
  }
  return result.data;
}

/** Replaces ALL current data with the contents of the backup. */
export async function importData(backup: Backup): Promise<void> {
  const db = getDatabase();
  await db.execAsync(
    'DELETE FROM shift_breaks; DELETE FROM shifts; DELETE FROM jobs; DELETE FROM bill_occurrences; DELETE FROM bills;'
  );
  await updatePaySettings(backup.settings);

  for (const job of backup.jobs) {
    await insertJob(job as Job);
  }
  const defaultJob = await ensureDefaultJob();

  for (const shift of backup.shifts) {
    await insertShift({
      ...(shift as Shift),
      jobId: shift.jobId || defaultJob.id,
    });
  }
  for (const bill of backup.bills) {
    await insertBill({
      ...bill,
      category: bill.category as BillCategory,
      recurrence: bill.recurrence as BillRecurrence,
    } as Bill);
  }
  for (const occ of backup.billOccurrences) {
    await insertOccurrence(occ as BillOccurrence);
  }

  const store = useAppStore.getState();
  store.bumpSettings();
  store.bumpJobs();
  store.bumpShifts();
  store.bumpBills();
}

/** Deletes all shifts, bills, and occurrences. Settings and jobs are kept. */
export async function resetAllData(): Promise<void> {
  const db = getDatabase();
  await db.execAsync(
    'DELETE FROM shift_breaks; DELETE FROM shifts; DELETE FROM bill_occurrences; DELETE FROM bills;'
  );
  const store = useAppStore.getState();
  store.bumpSettings();
  store.bumpShifts();
  store.bumpBills();
}
