import { getDatabase } from '@/db/database';
import { generateId } from '@/lib/ids';
import type {
  Bill,
  BillCategory,
  BillOccurrence,
  BillOccurrenceWithBill,
  BillRecurrence,
} from '@/lib/types';

type BillRow = {
  id: string;
  name: string;
  amount: number;
  category: string;
  recurrence: string;
  due_day: number | null;
  due_date: string | null;
  autopay: number;
  reminder_enabled: number;
  reminder_days_before: number | null;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

type OccurrenceRow = {
  id: string;
  bill_id: string;
  due_date: string;
  amount_snapshot: number;
  paid: number;
  paid_at: string | null;
  autopaid: number;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToBill(row: BillRow): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    category: row.category as BillCategory,
    recurrence: row.recurrence as BillRecurrence,
    dueDay: row.due_day ?? undefined,
    dueDate: row.due_date ?? undefined,
    autopay: row.autopay === 1,
    reminderEnabled: row.reminder_enabled === 1,
    reminderDaysBefore: row.reminder_days_before ?? undefined,
    notes: row.notes ?? undefined,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToOccurrence(row: OccurrenceRow): BillOccurrence {
  return {
    id: row.id,
    billId: row.bill_id,
    dueDate: row.due_date,
    amountSnapshot: row.amount_snapshot,
    paid: row.paid === 1,
    paidAt: row.paid_at ?? undefined,
    autopaid: row.autopaid === 1,
    notificationId: row.notification_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------- Bills ----------

export async function getBills(includeInactive = false): Promise<Bill[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<BillRow>(
    includeInactive
      ? 'SELECT * FROM bills ORDER BY name ASC'
      : 'SELECT * FROM bills WHERE active = 1 ORDER BY name ASC'
  );
  return rows.map(rowToBill);
}

export async function getBillById(id: string): Promise<Bill | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<BillRow>('SELECT * FROM bills WHERE id = ?', id);
  return row ? rowToBill(row) : null;
}

export async function insertBill(
  bill: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Bill> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const full: Bill = { ...bill, id: bill.id ?? generateId(), createdAt: now, updatedAt: now };
  await db.runAsync(
    `INSERT INTO bills (
      id, name, amount, category, recurrence, due_day, due_date, autopay,
      reminder_enabled, reminder_days_before, notes, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    full.id,
    full.name,
    full.amount,
    full.category,
    full.recurrence,
    full.dueDay ?? null,
    full.dueDate ?? null,
    full.autopay ? 1 : 0,
    full.reminderEnabled ? 1 : 0,
    full.reminderDaysBefore ?? null,
    full.notes ?? null,
    full.active ? 1 : 0,
    full.createdAt,
    full.updatedAt
  );
  return full;
}

export async function updateBill(bill: Bill): Promise<Bill> {
  const db = getDatabase();
  const updated: Bill = { ...bill, updatedAt: new Date().toISOString() };
  await db.runAsync(
    `UPDATE bills SET
      name = ?, amount = ?, category = ?, recurrence = ?, due_day = ?, due_date = ?,
      autopay = ?, reminder_enabled = ?, reminder_days_before = ?, notes = ?, active = ?,
      updated_at = ?
    WHERE id = ?`,
    updated.name,
    updated.amount,
    updated.category,
    updated.recurrence,
    updated.dueDay ?? null,
    updated.dueDate ?? null,
    updated.autopay ? 1 : 0,
    updated.reminderEnabled ? 1 : 0,
    updated.reminderDaysBefore ?? null,
    updated.notes ?? null,
    updated.active ? 1 : 0,
    updated.updatedAt,
    updated.id
  );
  return updated;
}

export async function deleteBill(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM bill_occurrences WHERE bill_id = ?', id);
  await db.runAsync('DELETE FROM bills WHERE id = ?', id);
}

// ---------- Occurrences ----------

export async function getOccurrencesBetween(
  startIso: string,
  endIso: string
): Promise<BillOccurrenceWithBill[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<OccurrenceRow>(
    'SELECT * FROM bill_occurrences WHERE due_date >= ? AND due_date <= ? ORDER BY due_date ASC',
    startIso,
    endIso
  );
  return attachBills(rows);
}

export async function getAllOccurrences(): Promise<BillOccurrence[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<OccurrenceRow>(
    'SELECT * FROM bill_occurrences ORDER BY due_date ASC'
  );
  return rows.map(rowToOccurrence);
}

export async function getUnpaidOccurrencesBefore(dateIso: string): Promise<BillOccurrenceWithBill[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<OccurrenceRow>(
    'SELECT * FROM bill_occurrences WHERE paid = 0 AND due_date < ? ORDER BY due_date ASC',
    dateIso
  );
  return attachBills(rows);
}

export async function getOccurrencesForBill(billId: string): Promise<BillOccurrence[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<OccurrenceRow>(
    'SELECT * FROM bill_occurrences WHERE bill_id = ? ORDER BY due_date ASC',
    billId
  );
  return rows.map(rowToOccurrence);
}

async function attachBills(rows: OccurrenceRow[]): Promise<BillOccurrenceWithBill[]> {
  if (rows.length === 0) return [];
  const billIds = Array.from(new Set(rows.map((r) => r.bill_id)));
  const db = getDatabase();
  const placeholders = billIds.map(() => '?').join(',');
  const billRows = await db.getAllAsync<BillRow>(
    `SELECT * FROM bills WHERE id IN (${placeholders})`,
    ...billIds
  );
  const billMap = new Map(billRows.map((b) => [b.id, rowToBill(b)]));
  return rows
    .filter((r) => billMap.has(r.bill_id))
    .map((r) => ({ ...rowToOccurrence(r), bill: billMap.get(r.bill_id)! }));
}

export async function insertOccurrence(
  occ: Omit<BillOccurrence, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<BillOccurrence> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const full: BillOccurrence = {
    ...occ,
    id: occ.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO bill_occurrences (
      id, bill_id, due_date, amount_snapshot, paid, paid_at, autopaid,
      notification_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    full.id,
    full.billId,
    full.dueDate,
    full.amountSnapshot,
    full.paid ? 1 : 0,
    full.paidAt ?? null,
    full.autopaid ? 1 : 0,
    full.notificationId ?? null,
    full.createdAt,
    full.updatedAt
  );
  return full;
}

export async function updateOccurrence(occ: BillOccurrence): Promise<BillOccurrence> {
  const db = getDatabase();
  const updated: BillOccurrence = { ...occ, updatedAt: new Date().toISOString() };
  await db.runAsync(
    `UPDATE bill_occurrences SET
      due_date = ?, amount_snapshot = ?, paid = ?, paid_at = ?, autopaid = ?,
      notification_id = ?, updated_at = ?
    WHERE id = ?`,
    updated.dueDate,
    updated.amountSnapshot,
    updated.paid ? 1 : 0,
    updated.paidAt ?? null,
    updated.autopaid ? 1 : 0,
    updated.notificationId ?? null,
    updated.updatedAt,
    updated.id
  );
  return updated;
}

export async function deleteUnpaidOccurrencesForBill(billId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM bill_occurrences WHERE bill_id = ? AND paid = 0', billId);
}

export async function occurrenceExists(billId: string, dueDate: string): Promise<boolean> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM bill_occurrences WHERE bill_id = ? AND due_date = ? LIMIT 1',
    billId,
    dueDate
  );
  return row != null;
}
