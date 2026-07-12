import { getDay } from 'date-fns';

export function isWorkday(date: Date, workDaysPerWeek: number): boolean {
  const day = getDay(date);
  if (day === 0) return workDaysPerWeek >= 7;
  return day <= workDaysPerWeek;
}

export function countWorkdaysInRange(
  start: Date,
  end: Date,
  workDaysPerWeek: number,
): number {
  let count = 0;
  const current = new Date(start);
  const last = new Date(end);
  current.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  while (current <= last) {
    if (isWorkday(current, workDaysPerWeek)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}
