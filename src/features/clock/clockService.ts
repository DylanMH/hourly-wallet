import { getDefaultJob, getJobById } from '@/db/queries/jobQueries';
import { getActiveShift, insertShift, updateShift } from '@/db/queries/shiftQueries';
import { toDateKey } from '@/lib/dates';
import { generateId } from '@/lib/ids';
import type { ClockStatus, Shift } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

export function getClockStatus(shift: Shift | null): ClockStatus {
  if (!shift || shift.clockOut) return 'not-clocked-in';
  if (shift.lunchStart && !shift.lunchEnd) return 'on-lunch';
  if (shift.breaks.some((b) => !b.end)) return 'on-break';
  return 'clocked-in';
}

export async function clockIn(jobId?: string): Promise<Shift> {
  const active = await getActiveShift();
  if (active) {
    throw new Error('Already clocked in. Clock out before starting a new shift.');
  }
  const job = jobId ? await getJobById(jobId) : await getDefaultJob();
  if (!job) {
    throw new Error('No job configured. Add a job in settings.');
  }
  const now = new Date();
  const shift = await insertShift({
    jobId: job.id,
    date: toDateKey(now),
    clockIn: now.toISOString(),
    breaks: [],
    isHolidayPay: false,
    isPTO: false,
    hourlyRateSnapshot: job.hourlyRate,
    overtimeEnabledSnapshot: job.overtimeEnabled,
    overtimeMultiplierSnapshot: job.overtimeMultiplier,
    overtimeThresholdSnapshot: job.overtimeThresholdHours,
    taxPercentSnapshot: job.taxPercent,
    holidayPayInOvertimeSnapshot: job.holidayPayInOvertime,
    ptoInOvertimeSnapshot: job.allowPTOInOvertime,
  });
  useAppStore.getState().bumpShifts();
  return shift;
}

export async function clockOut(options?: { autoCloseActive?: boolean }): Promise<Shift> {
  const active = await getActiveShift();
  if (!active) {
    throw new Error('Not clocked in.');
  }
  const status = getClockStatus(active);
  const nowIso = new Date().toISOString();
  let shift = active;

  if (status === 'on-lunch' || status === 'on-break') {
    if (!options?.autoCloseActive) {
      throw new Error('END_ACTIVE_FIRST');
    }
    shift = {
      ...shift,
      lunchEnd: status === 'on-lunch' ? nowIso : shift.lunchEnd,
      breaks: shift.breaks.map((b) => (b.end ? b : { ...b, end: nowIso })),
    };
  }

  const updated = await updateShift({ ...shift, clockOut: nowIso });
  useAppStore.getState().bumpShifts();
  return updated;
}

export async function startLunch(): Promise<Shift> {
  const active = await getActiveShift();
  if (!active) throw new Error('Clock in before starting lunch.');
  const status = getClockStatus(active);
  if (status === 'on-lunch') throw new Error('Lunch is already active.');
  if (status === 'on-break') throw new Error('End your break before starting lunch.');
  if (active.lunchStart) throw new Error('Lunch was already taken this shift.');
  const updated = await updateShift({ ...active, lunchStart: new Date().toISOString() });
  useAppStore.getState().bumpShifts();
  return updated;
}

export async function endLunch(): Promise<Shift> {
  const active = await getActiveShift();
  if (!active || getClockStatus(active) !== 'on-lunch') {
    throw new Error('No active lunch.');
  }
  const updated = await updateShift({ ...active, lunchEnd: new Date().toISOString() });
  useAppStore.getState().bumpShifts();
  return updated;
}

export async function startBreak(): Promise<Shift> {
  const active = await getActiveShift();
  if (!active) throw new Error('Clock in before starting a break.');
  const status = getClockStatus(active);
  if (status === 'on-break') throw new Error('A break is already active.');
  if (status === 'on-lunch') throw new Error('End lunch before starting a break.');
  const job = await getJobById(active.jobId);
  const updated = await updateShift({
    ...active,
    breaks: [
      ...active.breaks,
      {
        id: generateId(),
        start: new Date().toISOString(),
        paid: job?.breakPaidByDefault ?? false,
      },
    ],
  });
  useAppStore.getState().bumpShifts();
  return updated;
}

export async function endBreak(): Promise<Shift> {
  const active = await getActiveShift();
  if (!active || getClockStatus(active) !== 'on-break') {
    throw new Error('No active break.');
  }
  const nowIso = new Date().toISOString();
  const updated = await updateShift({
    ...active,
    breaks: active.breaks.map((b) => (b.end ? b : { ...b, end: nowIso })),
  });
  useAppStore.getState().bumpShifts();
  return updated;
}
