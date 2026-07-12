import type { SQLiteDatabase } from "expo-sqlite";

import { CREATE_TABLES_V1 } from "@/db/schema";
import { generateId } from "@/lib/ids";

export const DATABASE_VERSION = 7;

async function tableExists(db: SQLiteDatabase, name: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    name,
  );
  return row != null;
}

async function columnExists(
  db: SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  return rows.some((r) => r.name === column);
}

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;
      ${CREATE_TABLES_V1}
    `);
    // Fresh DB already has the full schema, so skip incremental migrations.
    currentVersion = DATABASE_VERSION;
  }

  if (currentVersion === 1) {
    if (!(await columnExists(db, "pay_settings", "holiday_pay_in_overtime"))) {
      await db.execAsync(
        `ALTER TABLE pay_settings ADD COLUMN holiday_pay_in_overtime INTEGER NOT NULL DEFAULT 0;`,
      );
    }
    if (!(await columnExists(db, "shifts", "is_holiday_pay"))) {
      await db.execAsync(
        `ALTER TABLE shifts ADD COLUMN is_holiday_pay INTEGER NOT NULL DEFAULT 0;`,
      );
    }
    if (
      !(await columnExists(db, "shifts", "holiday_pay_in_overtime_snapshot"))
    ) {
      await db.execAsync(
        `ALTER TABLE shifts ADD COLUMN holiday_pay_in_overtime_snapshot INTEGER NOT NULL DEFAULT 0;`,
      );
    }
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    if (!(await columnExists(db, "pay_settings", "allow_pto_in_overtime"))) {
      await db.execAsync(
        `ALTER TABLE pay_settings ADD COLUMN allow_pto_in_overtime INTEGER NOT NULL DEFAULT 0;`,
      );
    }
    if (!(await columnExists(db, "shifts", "is_pto"))) {
      await db.execAsync(
        `ALTER TABLE shifts ADD COLUMN is_pto INTEGER NOT NULL DEFAULT 0;`,
      );
    }
    if (!(await columnExists(db, "shifts", "pto_in_overtime_snapshot"))) {
      await db.execAsync(
        `ALTER TABLE shifts ADD COLUMN pto_in_overtime_snapshot INTEGER NOT NULL DEFAULT 0;`,
      );
    }
    currentVersion = 3;
  }

  if (currentVersion === 3) {
    const jobsExists = await tableExists(db, "jobs");
    if (!jobsExists) {
      await db.execAsync(`
        CREATE TABLE jobs (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          is_default INTEGER NOT NULL DEFAULT 0,
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
      `);
    }

    const hasDefaultJob = await db.getFirstAsync(
      "SELECT 1 FROM jobs WHERE id = ?",
      "default",
    );
    if (!hasDefaultJob) {
      await db.execAsync(`
        INSERT INTO jobs (
          id, name, is_default, hourly_rate, overtime_enabled, overtime_multiplier,
          overtime_threshold_hours, tax_percent, default_lunch_minutes, default_break_minutes,
          break_paid_by_default, holiday_pay_in_overtime, allow_pto_in_overtime, pay_period,
          currency, created_at, updated_at
        )
        SELECT
          'default', 'Default job', 1, hourly_rate, overtime_enabled, overtime_multiplier,
          overtime_threshold_hours, tax_percent, default_lunch_minutes, default_break_minutes,
          break_paid_by_default, holiday_pay_in_overtime, allow_pto_in_overtime, pay_period,
          currency, created_at, updated_at
        FROM pay_settings LIMIT 1;
      `);
    }

    if (!(await columnExists(db, "shifts", "job_id"))) {
      await db.execAsync(
        `ALTER TABLE shifts ADD COLUMN job_id TEXT NOT NULL DEFAULT 'default';`,
      );
    }
    await db.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_shifts_job_id ON shifts(job_id);`,
    );
    currentVersion = 4;
  }

  if (currentVersion === 4) {
    if (!(await columnExists(db, "jobs", "is_salaried"))) {
      await db.execAsync(
        `ALTER TABLE jobs ADD COLUMN is_salaried INTEGER NOT NULL DEFAULT 0;`,
      );
    }
    if (!(await columnExists(db, "jobs", "salary_amount"))) {
      await db.execAsync(
        `ALTER TABLE jobs ADD COLUMN salary_amount REAL NOT NULL DEFAULT 0;`,
      );
    }
    if (!(await columnExists(db, "jobs", "salary_period"))) {
      await db.execAsync(
        `ALTER TABLE jobs ADD COLUMN salary_period TEXT NOT NULL DEFAULT 'monthly';`,
      );
    }
    if (!(await columnExists(db, "jobs", "work_days_per_week"))) {
      await db.execAsync(
        `ALTER TABLE jobs ADD COLUMN work_days_per_week INTEGER NOT NULL DEFAULT 5;`,
      );
    }
    currentVersion = 5;
  }

  if (currentVersion === 5) {
    // Remove duplicate occurrences (same bill + due date), keeping paid ones
    // first, then the oldest row.
    await db.execAsync(`
      DELETE FROM bill_occurrences
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY bill_id, due_date
              ORDER BY paid DESC, created_at ASC
            ) AS rn
          FROM bill_occurrences
        ) WHERE rn = 1
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_occurrences_unique
        ON bill_occurrences(bill_id, due_date);
    `);
    currentVersion = 6;
  }

  if (currentVersion === 6) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS shift_lunches (
        id TEXT PRIMARY KEY NOT NULL,
        shift_id TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        start TEXT NOT NULL,
        end TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_shift_lunches_shift_id ON shift_lunches(shift_id);
    `);

    // Migrate legacy lunch columns into the new lunches table.
    const legacyLunches = await db.getAllAsync<{
      id: string;
      lunch_start: string;
      lunch_end: string | null;
    }>(
      "SELECT id, lunch_start, lunch_end FROM shifts WHERE lunch_start IS NOT NULL",
    );
    for (const row of legacyLunches) {
      await db.runAsync(
        "INSERT INTO shift_lunches (id, shift_id, start, end) VALUES (?, ?, ?, ?)",
        generateId(),
        row.id,
        row.lunch_start,
        row.lunch_end,
      );
    }

    currentVersion = 7;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
