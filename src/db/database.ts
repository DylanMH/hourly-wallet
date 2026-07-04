import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/db/migrations';

export const DATABASE_NAME = 'hourly-wallet.db';

let db: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync(DATABASE_NAME);
  }
  return db;
}

export async function initDatabase(): Promise<SQLiteDatabase> {
  if (!initPromise) {
    initPromise = (async () => {
      const database = getDatabase();
      await database.execAsync('PRAGMA foreign_keys = ON');
      await migrateDbIfNeeded(database);
      return database;
    })();
  }
  return initPromise;
}
