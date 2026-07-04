import { getDatabase } from '@/db/database';
import { generateId } from '@/lib/ids';
import type { PaySettings, PayPeriod } from '@/lib/types';

type PaySettingsRow = {
  id: string;
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
  currency: string;
  created_at: string;
  updated_at: string;
};

function rowToSettings(row: PaySettingsRow): PaySettings {
  return {
    id: row.id,
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
    currency: 'USD',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const DEFAULT_PAY_SETTINGS: Omit<PaySettings, 'id' | 'createdAt' | 'updatedAt'> = {
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
  payPeriod: 'weekly',
  currency: 'USD',
};

export async function getPaySettings(): Promise<PaySettings> {
  const db = getDatabase();
  const row = await db.getFirstAsync<PaySettingsRow>(
    'SELECT * FROM pay_settings LIMIT 1'
  );
  if (row) {
    return rowToSettings(row);
  }
  return seedDefaultSettings();
}

export async function seedDefaultSettings(): Promise<PaySettings> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const settings: PaySettings = {
    ...DEFAULT_PAY_SETTINGS,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO pay_settings (
      id, hourly_rate, overtime_enabled, overtime_multiplier, overtime_threshold_hours,
      tax_percent, default_lunch_minutes, default_break_minutes, break_paid_by_default,
      holiday_pay_in_overtime, allow_pto_in_overtime, pay_period, currency, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    settings.id,
    settings.hourlyRate,
    settings.overtimeEnabled ? 1 : 0,
    settings.overtimeMultiplier,
    settings.overtimeThresholdHours,
    settings.taxPercent,
    settings.defaultLunchMinutes,
    settings.defaultBreakMinutes,
    settings.breakPaidByDefault ? 1 : 0,
    settings.holidayPayInOvertime ? 1 : 0,
    settings.allowPTOInOvertime ? 1 : 0,
    settings.payPeriod,
    settings.currency,
    settings.createdAt,
    settings.updatedAt
  );
  return settings;
}

export async function updatePaySettings(
  updates: Partial<Omit<PaySettings, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PaySettings> {
  const db = getDatabase();
  const current = await getPaySettings();
  const merged: PaySettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.runAsync(
    `UPDATE pay_settings SET
      hourly_rate = ?, overtime_enabled = ?, overtime_multiplier = ?,
      overtime_threshold_hours = ?, tax_percent = ?, default_lunch_minutes = ?,
      default_break_minutes = ?, break_paid_by_default = ?, holiday_pay_in_overtime = ?,
      allow_pto_in_overtime = ?, pay_period = ?, currency = ?, updated_at = ?
    WHERE id = ?`,
    merged.hourlyRate,
    merged.overtimeEnabled ? 1 : 0,
    merged.overtimeMultiplier,
    merged.overtimeThresholdHours,
    merged.taxPercent,
    merged.defaultLunchMinutes,
    merged.defaultBreakMinutes,
    merged.breakPaidByDefault ? 1 : 0,
    merged.holidayPayInOvertime ? 1 : 0,
    merged.allowPTOInOvertime ? 1 : 0,
    merged.payPeriod,
    merged.currency,
    merged.updatedAt,
    merged.id
  );
  return merged;
}

export async function getAppPref(key: string): Promise<string | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_prefs WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setAppPref(key: string, value: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}
