import { isSameDay, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActiveShiftCard } from '@/components/dashboard/ActiveShiftCard';
import { BillsDueCard } from '@/components/dashboard/BillsDueCard';
import { MonthlyAffordabilityCard } from '@/components/dashboard/MonthlyAffordabilityCard';
import { WeeklyPayCard } from '@/components/dashboard/WeeklyPayCard';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { useBillOccurrences } from '@/features/bills/useBillOccurrences';
import { useActiveShift } from '@/features/clock/useActiveShift';
import { useShiftsInRange } from '@/features/clock/useShifts';
import { getDefaultJob, getJobs } from '@/db/queries/jobQueries';
import { useAppStore } from '@/state/appStore';
import {
  calculateMonthlyAffordability,
  projectMonthlyIncome,
} from '@/lib/calculations/affordability';
import { getBillsDueThisMonth, sumOccurrences } from '@/lib/calculations/bills';
import { calculateWeeklyPay } from '@/lib/calculations/pay';
import { calculateWorkedMinutes } from '@/lib/calculations/shifts';
import type { Job } from '@/lib/types';
import { getCurrentMonthRange, getCurrentWeekRange } from '@/lib/dates';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const ALL_JOBS = 'all';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { shift, status, refresh } = useActiveShift();
  const active = shift != null && !shift.clockOut;
  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  const monthRange = useMemo(() => getCurrentMonthRange(), []);
  const { shifts: allWeekShifts } = useShiftsInRange(weekRange);
  const { shifts: allMonthShifts } = useShiftsInRange(monthRange);
  const { occurrences } = useBillOccurrences();

  const jobsVersion = useAppStore((s) => s.jobsVersion);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(ALL_JOBS);
  const activeJobName = useMemo(
    () => (shift ? jobs.find((j) => j.id === shift.jobId)?.name : undefined),
    [jobs, shift]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [all, fallback] = await Promise.all([getJobs(), getDefaultJob()]);
      if (!cancelled) {
        setJobs(all);
        setSelectedJobId((prev) => {
          if (prev === ALL_JOBS) return ALL_JOBS;
          if (all.some((j) => j.id === prev)) return prev;
          return fallback?.id ?? all[0]?.id ?? ALL_JOBS;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobsVersion]);

  const jobLabel =
    selectedJobId === ALL_JOBS ? 'All jobs' : jobs.find((j) => j.id === selectedJobId)?.name;

  const weekShifts =
    selectedJobId === ALL_JOBS
      ? allWeekShifts
      : allWeekShifts.filter((s) => s.jobId === selectedJobId);
  const monthShifts =
    selectedJobId === ALL_JOBS
      ? allMonthShifts
      : allMonthShifts.filter((s) => s.jobId === selectedJobId);

  const now = new Date();
  const todayMinutes = monthShifts
    .filter((s) => isSameDay(parseISO(s.clockIn), now))
    .reduce((sum, s) => sum + calculateWorkedMinutes(s), 0);

  const weeklyPay = calculateWeeklyPay(weekShifts);
  const projection = projectMonthlyIncome(monthShifts);

  const totalBillsDue = sumOccurrences(getBillsDueThisMonth(occurrences));
  const affordability = calculateMonthlyAffordability(projection.projectedNet, totalBillsDue);

  const jobOptions = [
    { label: 'All jobs', value: ALL_JOBS },
    ...jobs.map((j) => ({ label: j.name, value: j.id })),
  ];

  return (
    <Screen
      title="Hourly Wallet"
      showLogo
      right={
        active ? (
          <Pressable
            onPress={() => router.navigate('/(tabs)/clock')}
            style={styles.activeIndicator}
            hitSlop={8}>
            <View style={[styles.activeDot, { backgroundColor: colors.positive }]} />
            <Text style={[typography.captionMedium, { color: colors.positive }]}>
              Clocked in{activeJobName ? ` · ${activeJobName}` : ''}
            </Text>
          </Pressable>
        ) : null
      }>
      <Select
        label="Dashboard view"
        value={selectedJobId}
        options={jobOptions}
        onChange={setSelectedJobId}
      />

      {!active && selectedJobId !== ALL_JOBS ? (
        <ActiveShiftCard
          shift={shift}
          status={status}
          todayMinutes={todayMinutes}
          jobName={jobLabel}
          jobId={selectedJobId}
          onChanged={refresh}
        />
      ) : null}
      <WeeklyPayCard pay={weeklyPay} />
      <MonthlyAffordabilityCard affordability={affordability} netSoFar={projection.netSoFar} />
      <BillsDueCard occurrences={occurrences} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
