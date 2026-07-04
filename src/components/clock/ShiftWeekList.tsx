import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ShiftHistoryList } from '@/components/clock/ShiftHistoryList';
import { getJobs } from '@/db/queries/jobQueries';
import { calculateWeeklyPay } from '@/lib/calculations/pay';
import { calculateWorkedHours, calculateWorkedMinutes } from '@/lib/calculations/shifts';
import { formatFullDate, WEEK_STARTS_ON } from '@/lib/dates';
import { formatCurrency, formatHoursMinutes } from '@/lib/money';
import type { Job, Shift } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ShiftWeekListProps = {
  shifts: Shift[];
  onEdit: (shift: Shift) => void;
};

function weekKey(iso: string): string {
  const date = parseISO(iso);
  return format(startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }), 'yyyy-MM-dd');
}

function weekLabel(start: Date, end: Date): string {
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
}

export function ShiftWeekList({ shifts, onEdit }: ShiftWeekListProps) {
  const { colors } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const currentWeekKey = weekKey(new Date().toISOString());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([currentWeekKey]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getJobs();
      if (!cancelled) setJobs(all);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const jobNameById = useMemo(
    () => Object.fromEntries(jobs.map((j) => [j.id, j.name])),
    [jobs]
  );

  const weeks = useMemo(() => {
    const map = new Map<string, Shift[]>();
    const sorted = [...shifts].sort(
      (a, b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime()
    );
    for (const shift of sorted) {
      const key = weekKey(shift.clockIn);
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1));
  }, [shifts]);

  if (weeks.length === 0) {
    return <ShiftHistoryList shifts={shifts} onEdit={onEdit} jobNameById={jobNameById} />;
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <View style={styles.container}>
      {weeks.map(([key, weekShifts]) => {
        const start = startOfWeek(parseISO(weekShifts[0].clockIn), { weekStartsOn: WEEK_STARTS_ON });
        const end = endOfWeek(parseISO(weekShifts[0].clockIn), { weekStartsOn: WEEK_STARTS_ON });
        const pay = calculateWeeklyPay(weekShifts);
        const totalMinutes = weekShifts.reduce((sum, s) => sum + calculateWorkedMinutes(s), 0);
        const isExpanded = expanded.has(key);

        return (
          <View key={key} style={styles.week}>
            <Pressable
              style={[styles.header, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              onPress={() => toggle(key)}>
              <View style={styles.headerLeft}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>
                  {weekLabel(start, end)}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {formatHoursMinutes(totalMinutes)} · {formatCurrency(pay.grossPay)} gross
                </Text>
              </View>
              {isExpanded ? (
                <ChevronDown size={20} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={20} color={colors.textSecondary} />
              )}
            </Pressable>

            {isExpanded ? (
              <View style={styles.days}>
                <ShiftDayList shifts={weekShifts} onEdit={onEdit} jobNameById={jobNameById} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function ShiftDayList({
  shifts,
  onEdit,
  jobNameById,
}: {
  shifts: Shift[];
  onEdit: (shift: Shift) => void;
  jobNameById: Record<string, string>;
}) {
  const { colors } = useTheme();

  const days = useMemo(() => {
    const map = new Map<string, Shift[]>();
    const sorted = [...shifts].sort(
      (a, b) => parseISO(b.clockIn).getTime() - parseISO(a.clockIn).getTime()
    );
    for (const shift of sorted) {
      const key = format(parseISO(shift.clockIn), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1));
  }, [shifts]);

  return (
    <View style={styles.dayList}>
      {days.map(([key, dayShifts]) => {
        const totalMinutes = dayShifts.reduce((sum, s) => sum + calculateWorkedMinutes(s), 0);
        const gross = dayShifts.reduce((sum, s) => sum + calculateWorkedHours(s) * s.hourlyRateSnapshot, 0);
        return (
          <View key={key} style={styles.day}>
            <View style={styles.dayHeader}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>
                {formatFullDate(dayShifts[0].clockIn)}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {formatHoursMinutes(totalMinutes)} · {formatCurrency(gross)} gross
              </Text>
            </View>
            <ShiftHistoryList shifts={dayShifts} onEdit={onEdit} jobNameById={jobNameById} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  week: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
  },
  headerLeft: {
    gap: 2,
  },
  days: {
    gap: spacing.md,
  },
  dayList: {
    gap: spacing.md,
  },
  day: {
    gap: spacing.sm,
  },
  dayHeader: {
    gap: 2,
  },
});
