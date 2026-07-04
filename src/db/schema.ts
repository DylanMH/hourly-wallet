export const CREATE_TABLES_V1 = `
CREATE TABLE IF NOT EXISTS pay_settings (
  id TEXT PRIMARY KEY NOT NULL,
  hourly_rate REAL NOT NULL,
  overtime_enabled INTEGER NOT NULL,
  overtime_multiplier REAL NOT NULL,
  overtime_threshold_hours REAL NOT NULL,
  tax_percent REAL NOT NULL,
  default_lunch_minutes INTEGER NOT NULL,
  default_break_minutes INTEGER NOT NULL,
  break_paid_by_default INTEGER NOT NULL,
  holiday_pay_in_overtime INTEGER NOT NULL,
  allow_pto_in_overtime INTEGER NOT NULL,
  pay_period TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_salaried INTEGER NOT NULL DEFAULT 0,
  salary_amount REAL NOT NULL DEFAULT 0,
  salary_period TEXT NOT NULL DEFAULT 'monthly',
  hourly_rate REAL NOT NULL,
  overtime_enabled INTEGER NOT NULL,
  overtime_multiplier REAL NOT NULL,
  overtime_threshold_hours REAL NOT NULL,
  tax_percent REAL NOT NULL,
  default_lunch_minutes INTEGER NOT NULL,
  default_break_minutes INTEGER NOT NULL,
  break_paid_by_default INTEGER NOT NULL,
  holiday_pay_in_overtime INTEGER NOT NULL,
  allow_pto_in_overtime INTEGER NOT NULL,
  pay_period TEXT NOT NULL,
  work_days_per_week INTEGER NOT NULL DEFAULT 5,
  currency TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_prefs (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  date TEXT NOT NULL,
  clock_in TEXT NOT NULL,
  clock_out TEXT,
  lunch_start TEXT,
  lunch_end TEXT,
  notes TEXT,
  is_holiday_pay INTEGER NOT NULL,
  is_pto INTEGER NOT NULL,
  hourly_rate_snapshot REAL NOT NULL,
  overtime_enabled_snapshot INTEGER NOT NULL,
  overtime_multiplier_snapshot REAL NOT NULL,
  overtime_threshold_snapshot REAL NOT NULL,
  tax_percent_snapshot REAL NOT NULL,
  holiday_pay_in_overtime_snapshot INTEGER NOT NULL,
  pto_in_overtime_snapshot INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);

CREATE TABLE IF NOT EXISTS shift_breaks (
  id TEXT PRIMARY KEY NOT NULL,
  shift_id TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  start TEXT NOT NULL,
  end TEXT,
  paid INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_breaks_shift_id ON shift_breaks(shift_id);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  recurrence TEXT NOT NULL,
  due_day INTEGER,
  due_date TEXT,
  autopay INTEGER NOT NULL,
  reminder_enabled INTEGER NOT NULL,
  reminder_days_before INTEGER,
  notes TEXT,
  active INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bill_occurrences (
  id TEXT PRIMARY KEY NOT NULL,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  due_date TEXT NOT NULL,
  amount_snapshot REAL NOT NULL,
  paid INTEGER NOT NULL,
  paid_at TEXT,
  autopaid INTEGER NOT NULL,
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bill_occurrences_bill_id ON bill_occurrences(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_occurrences_due_date ON bill_occurrences(due_date);
`;
