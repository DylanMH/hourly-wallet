import type { SQLiteDatabase } from 'expo-sqlite';

import { CREATE_TABLES_V1 } from '@/db/schema';

export const DATABASE_VERSION = 3;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
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
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    await db.execAsync(`
      ALTER TABLE pay_settings ADD COLUMN holiday_pay_in_overtime INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE shifts ADD COLUMN is_holiday_pay INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE shifts ADD COLUMN holiday_pay_in_overtime_snapshot INTEGER NOT NULL DEFAULT 0;
    `);
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    await db.execAsync(`
      ALTER TABLE pay_settings ADD COLUMN allow_pto_in_overtime INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE shifts ADD COLUMN is_pto INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE shifts ADD COLUMN pto_in_overtime_snapshot INTEGER NOT NULL DEFAULT 0;
    `);
    currentVersion = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
