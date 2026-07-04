import { getDatabase } from '@/db/database';
import { generateId } from '@/lib/ids';
import type { Shift, ShiftBreak } from '@/lib/types';

type ShiftRow = {
  id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  notes: string | null;
  is_holiday_pay: number;
  is_pto: number;
  hourly_rate_snapshot: number;
  overtime_enabled_snapshot: number;
  overtime_multiplier_snapshot: number;
  overtime_threshold_snapshot: number;
  tax_percent_snapshot: number;
  holiday_pay_in_overtime_snapshot: number;
  pto_in_overtime_snapshot: number;
  created_at: string;
  updated_at: string;
};

type BreakRow = {
  id: string;
  shift_id: string;
  start: string;
  end: string | null;
  paid: number;
};

function rowToShift(row: ShiftRow, breaks: ShiftBreak[]): Shift {
  return {
    id: row.id,
    date: row.date,
    clockIn: row.clock_in,
    clockOut: row.clock_out ?? undefined,
    lunchStart: row.lunch_start ?? undefined,
    lunchEnd: row.lunch_end ?? undefined,
    breaks,
    notes: row.notes ?? undefined,
    isHolidayPay: row.is_holiday_pay === 1,
    isPTO: row.is_pto === 1,
    hourlyRateSnapshot: row.hourly_rate_snapshot,
    overtimeEnabledSnapshot: row.overtime_enabled_snapshot === 1,
    overtimeMultiplierSnapshot: row.overtime_multiplier_snapshot,
    overtimeThresholdSnapshot: row.overtime_threshold_snapshot,
    taxPercentSnapshot: row.tax_percent_snapshot,
    holidayPayInOvertimeSnapshot: row.holiday_pay_in_overtime_snapshot === 1,
    ptoInOvertimeSnapshot: row.pto_in_overtime_snapshot === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToBreak(row: BreakRow): ShiftBreak {
  return {
    id: row.id,
    start: row.start,
    end: row.end ?? undefined,
    paid: row.paid === 1,
  };
}

async function getBreaksForShiftIds(shiftIds: string[]): Promise<Map<string, ShiftBreak[]>> {
  const map = new Map<string, ShiftBreak[]>();
  if (shiftIds.length === 0) return map;
  const db = getDatabase();
  const placeholders = shiftIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<BreakRow>(
    `SELECT * FROM shift_breaks WHERE shift_id IN (${placeholders}) ORDER BY start ASC`,
    ...shiftIds
  );
  for (const row of rows) {
    const list = map.get(row.shift_id) ?? [];
    list.push(rowToBreak(row));
    map.set(row.shift_id, list);
  }
  return map;
}

async function attachBreaks(rows: ShiftRow[]): Promise<Shift[]> {
  const breakMap = await getBreaksForShiftIds(rows.map((r) => r.id));
  return rows.map((row) => rowToShift(row, breakMap.get(row.id) ?? []));
}

export async function getShiftById(id: string): Promise<Shift | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ShiftRow>('SELECT * FROM shifts WHERE id = ?', id);
  if (!row) return null;
  const [shift] = await attachBreaks([row]);
  return shift;
}

export async function getActiveShift(): Promise<Shift | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ShiftRow>(
    'SELECT * FROM shifts WHERE clock_out IS NULL ORDER BY clock_in DESC LIMIT 1'
  );
  if (!row) return null;
  const [shift] = await attachBreaks([row]);
  return shift;
}

export async function getShiftsBetween(startIso: string, endIso: string): Promise<Shift[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ShiftRow>(
    'SELECT * FROM shifts WHERE clock_in >= ? AND clock_in <= ? ORDER BY clock_in ASC',
    startIso,
    endIso
  );
  return attachBreaks(rows);
}

export async function getRecentShifts(limit = 20): Promise<Shift[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ShiftRow>(
    'SELECT * FROM shifts ORDER BY clock_in DESC LIMIT ?',
    limit
  );
  return attachBreaks(rows);
}

export async function insertShift(
  shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Shift> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const full: Shift = {
    ...shift,
    id: shift.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO shifts (
      id, date, clock_in, clock_out, lunch_start, lunch_end, notes,
      is_holiday_pay, is_pto, hourly_rate_snapshot, overtime_enabled_snapshot, overtime_multiplier_snapshot,
      overtime_threshold_snapshot, tax_percent_snapshot, holiday_pay_in_overtime_snapshot, pto_in_overtime_snapshot, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    full.id,
    full.date,
    full.clockIn,
    full.clockOut ?? null,
    full.lunchStart ?? null,
    full.lunchEnd ?? null,
    full.notes ?? null,
    full.isHolidayPay ? 1 : 0,
    full.isPTO ? 1 : 0,
    full.hourlyRateSnapshot,
    full.overtimeEnabledSnapshot ? 1 : 0,
    full.overtimeMultiplierSnapshot,
    full.overtimeThresholdSnapshot,
    full.taxPercentSnapshot,
    full.holidayPayInOvertimeSnapshot ? 1 : 0,
    full.ptoInOvertimeSnapshot ? 1 : 0,
    full.createdAt,
    full.updatedAt
  );
  for (const brk of full.breaks) {
    await insertBreak(full.id, brk);
  }
  return full;
}

export async function updateShift(shift: Shift): Promise<Shift> {
  const db = getDatabase();
  const updated: Shift = { ...shift, updatedAt: new Date().toISOString() };
  await db.runAsync(
    `UPDATE shifts SET
      date = ?, clock_in = ?, clock_out = ?, lunch_start = ?, lunch_end = ?, notes = ?,
      is_holiday_pay = ?, is_pto = ?, hourly_rate_snapshot = ?, overtime_enabled_snapshot = ?, overtime_multiplier_snapshot = ?,
      overtime_threshold_snapshot = ?, tax_percent_snapshot = ?, holiday_pay_in_overtime_snapshot = ?, pto_in_overtime_snapshot = ?, updated_at = ?
    WHERE id = ?`,
    updated.date,
    updated.clockIn,
    updated.clockOut ?? null,
    updated.lunchStart ?? null,
    updated.lunchEnd ?? null,
    updated.notes ?? null,
    updated.isHolidayPay ? 1 : 0,
    updated.isPTO ? 1 : 0,
    updated.hourlyRateSnapshot,
    updated.overtimeEnabledSnapshot ? 1 : 0,
    updated.overtimeMultiplierSnapshot,
    updated.overtimeThresholdSnapshot,
    updated.taxPercentSnapshot,
    updated.holidayPayInOvertimeSnapshot ? 1 : 0,
    updated.ptoInOvertimeSnapshot ? 1 : 0,
    updated.updatedAt,
    updated.id
  );
  await db.runAsync('DELETE FROM shift_breaks WHERE shift_id = ?', updated.id);
  for (const brk of updated.breaks) {
    await insertBreak(updated.id, brk);
  }
  return updated;
}

export async function deleteShift(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM shift_breaks WHERE shift_id = ?', id);
  await db.runAsync('DELETE FROM shifts WHERE id = ?', id);
}

async function insertBreak(shiftId: string, brk: ShiftBreak): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'INSERT INTO shift_breaks (id, shift_id, start, end, paid) VALUES (?, ?, ?, ?, ?)',
    brk.id || generateId(),
    shiftId,
    brk.start,
    brk.end ?? null,
    brk.paid ? 1 : 0
  );
}

export async function getAllShifts(): Promise<Shift[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ShiftRow>('SELECT * FROM shifts ORDER BY clock_in ASC');
  return attachBreaks(rows);
}
