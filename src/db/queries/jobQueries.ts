import { getDatabase } from '@/db/database';
import { generateId } from '@/lib/ids';
import type { Job, PayPeriod, SalaryPeriod } from '@/lib/types';

const DEFAULT_JOB_PAY = {
  isSalaried: false,
  salaryAmount: 0,
  salaryPeriod: 'monthly' as SalaryPeriod,
  hourlyRate: 15,
  overtimeEnabled: true,
  overtimeMultiplier: 1.5,
  overtimeThresholdHours: 40,
  taxPercent: 20,
  defaultLunchMinutes: 30,
  defaultBreakMinutes: 15,
  breakPaidByDefault: true,
  holidayPayInOvertime: false,
  allowPTOInOvertime: false,
  payPeriod: 'weekly' as PayPeriod,
  workDaysPerWeek: 5,
  currency: 'USD' as const,
};

type JobRow = {
  id: string;
  name: string;
  is_default: number;
  is_salaried: number;
  salary_amount: number;
  salary_period: string;
  hourly_rate: number;
  overtime_enabled: number;
  overtime_multiplier: number;
  overtime_threshold_hours: number;
  tax_percent: number;
  default_lunch_minutes: number;
  default_break_minutes: number;
  break_paid_by_default: number;
  holiday_pay_in_overtime: number;
  allow_pto_in_overtime: number;
  pay_period: string;
  work_days_per_week: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default === 1,
    isSalaried: row.is_salaried === 1,
    salaryAmount: row.salary_amount,
    salaryPeriod: row.salary_period as SalaryPeriod,
    hourlyRate: row.hourly_rate,
    overtimeEnabled: row.overtime_enabled === 1,
    overtimeMultiplier: row.overtime_multiplier,
    overtimeThresholdHours: row.overtime_threshold_hours,
    taxPercent: row.tax_percent,
    defaultLunchMinutes: row.default_lunch_minutes,
    defaultBreakMinutes: row.default_break_minutes,
    breakPaidByDefault: row.break_paid_by_default === 1,
    holidayPayInOvertime: row.holiday_pay_in_overtime === 1,
    allowPTOInOvertime: row.allow_pto_in_overtime === 1,
    payPeriod: row.pay_period as PayPeriod,
    workDaysPerWeek: row.work_days_per_week,
    currency: 'USD',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getJobs(): Promise<Job[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<JobRow>('SELECT * FROM jobs ORDER BY is_default DESC, name ASC');
  return rows.map(rowToJob);
}

export async function getJobById(id: string): Promise<Job | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<JobRow>('SELECT * FROM jobs WHERE id = ?', id);
  return row ? rowToJob(row) : null;
}

export async function getDefaultJob(): Promise<Job | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<JobRow>('SELECT * FROM jobs WHERE is_default = 1 LIMIT 1');
  return row ? rowToJob(row) : null;
}

export async function insertJob(
  job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Job> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const full: Job = {
    ...job,
    id: job.id || generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO jobs (
      id, name, is_default, is_salaried, salary_amount, salary_period, hourly_rate,
      overtime_enabled, overtime_multiplier, overtime_threshold_hours, tax_percent,
      default_lunch_minutes, default_break_minutes, break_paid_by_default,
      holiday_pay_in_overtime, allow_pto_in_overtime, pay_period, work_days_per_week,
      currency, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    full.id,
    full.name,
    full.isDefault ? 1 : 0,
    full.isSalaried ? 1 : 0,
    full.salaryAmount,
    full.salaryPeriod,
    full.hourlyRate,
    full.overtimeEnabled ? 1 : 0,
    full.overtimeMultiplier,
    full.overtimeThresholdHours,
    full.taxPercent,
    full.defaultLunchMinutes,
    full.defaultBreakMinutes,
    full.breakPaidByDefault ? 1 : 0,
    full.holidayPayInOvertime ? 1 : 0,
    full.allowPTOInOvertime ? 1 : 0,
    full.payPeriod,
    full.workDaysPerWeek,
    full.currency,
    full.createdAt,
    full.updatedAt
  );
  return full;
}

export async function updateJob(job: Job): Promise<Job> {
  const db = getDatabase();
  const updated: Job = { ...job, updatedAt: new Date().toISOString() };
  await db.runAsync(
    `UPDATE jobs SET
      name = ?, is_default = ?, is_salaried = ?, salary_amount = ?, salary_period = ?,
      hourly_rate = ?, overtime_enabled = ?, overtime_multiplier = ?, overtime_threshold_hours = ?,
      tax_percent = ?, default_lunch_minutes = ?, default_break_minutes = ?,
      break_paid_by_default = ?, holiday_pay_in_overtime = ?, allow_pto_in_overtime = ?,
      pay_period = ?, work_days_per_week = ?, currency = ?, updated_at = ?
    WHERE id = ?`,
    updated.name,
    updated.isDefault ? 1 : 0,
    updated.isSalaried ? 1 : 0,
    updated.salaryAmount,
    updated.salaryPeriod,
    updated.hourlyRate,
    updated.overtimeEnabled ? 1 : 0,
    updated.overtimeMultiplier,
    updated.overtimeThresholdHours,
    updated.taxPercent,
    updated.defaultLunchMinutes,
    updated.defaultBreakMinutes,
    updated.breakPaidByDefault ? 1 : 0,
    updated.holidayPayInOvertime ? 1 : 0,
    updated.allowPTOInOvertime ? 1 : 0,
    updated.payPeriod,
    updated.workDaysPerWeek,
    updated.currency,
    updated.updatedAt,
    updated.id
  );
  return updated;
}

export async function deleteJob(id: string): Promise<void> {
  const db = getDatabase();
  const all = await getJobs();
  if (all.length <= 1) {
    throw new Error('Cannot delete the only job. Add another job first.');
  }
  const target = all.find((j) => j.id === id);
  if (!target) return;
  const fallback = all.find((j) => j.id !== id && j.isDefault) ?? all.find((j) => j.id !== id);
  if (!fallback) {
    throw new Error('No fallback job found.');
  }
  if (target.isDefault) {
    await setDefaultJob(fallback.id);
  }
  await db.runAsync('UPDATE shifts SET job_id = ? WHERE job_id = ?', fallback.id, id);
  await db.runAsync('DELETE FROM jobs WHERE id = ?', id);
}

export async function setDefaultJob(id: string): Promise<void> {
  const db = getDatabase();
  await db.execAsync(`
    UPDATE jobs SET is_default = 0;
    UPDATE jobs SET is_default = 1 WHERE id = '${id}';
  `);
}

/** Fixes any legacy jobs that were saved with an empty id and re-links their shifts. */
export async function patchEmptyJobIds(): Promise<void> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ id: string }>("SELECT id FROM jobs WHERE id = ''");
  for (const row of rows) {
    const newId = generateId();
    await db.runAsync('UPDATE shifts SET job_id = ? WHERE job_id = ?', newId, row.id);
    await db.runAsync('UPDATE jobs SET id = ? WHERE id = ?', newId, row.id);
  }
}

export async function ensureDefaultJob(): Promise<Job> {
  const db = getDatabase();
  const row = await db.getFirstAsync<JobRow>('SELECT * FROM jobs WHERE is_default = 1 LIMIT 1');
  if (row) {
    return rowToJob(row);
  }
  const existing = await db.getFirstAsync<JobRow>('SELECT * FROM jobs LIMIT 1');
  if (existing) {
    await setDefaultJob(existing.id);
    return rowToJob(existing);
  }
  return insertJob({ name: 'Default job', isDefault: true, ...DEFAULT_JOB_PAY });
}
