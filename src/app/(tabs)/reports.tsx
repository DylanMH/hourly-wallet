import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BillsByCategoryChart } from '@/components/reports/BillsByCategoryChart';
import { WeeklyHoursChart } from '@/components/reports/WeeklyHoursChart';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { useBillOccurrences } from '@/features/bills/useBillOccurrences';
import { useShiftsInRange } from '@/features/clock/useShifts';
import {
  buildPeriodReport,
  getDailyHours,
  getReportRange,
  ReportPeriod,
} from '@/features/reports/reportService';
import { getDefaultJob, getJobs } from '@/db/queries/jobQueries';
import { useAppStore } from '@/state/appStore';
import { hapticSelection } from '@/lib/haptics';
import { formatHoursMinutes } from '@/lib/money';
import type { Job } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const ALL_JOBS = 'all';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'this-week', label: 'This week' },
  { value: 'last-week', label: 'Last week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
];

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>('this-week');
  const range = useMemo(() => getReportRange(period), [period]);
  const { shifts: allShifts } = useShiftsInRange(range);
  const { occurrences } = useBillOccurrences();

  const jobsVersion = useAppStore((s) => s.jobsVersion);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(ALL_JOBS);

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

  const shifts =
    selectedJobId === ALL_JOBS
      ? allShifts
      : allShifts.filter((s) => s.jobId === selectedJobId);

  const report = useMemo(
    () => buildPeriodReport(shifts, occurrences, range),
    [shifts, occurrences, range]
  );
  const dailyHours = useMemo(() => getDailyHours(shifts, range), [shifts, range]);

  const jobOptions = [
    { label: 'All jobs', value: ALL_JOBS },
    ...jobs.map((j) => ({ label: j.name, value: j.id })),
  ];

  return (
    <Screen showLogo>
      <Select
        label="Report view"
        value={selectedJobId}
        options={jobOptions}
        onChange={setSelectedJobId}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {PERIODS.map((p) => {
          const active = p.value === period;
          return (
            <Pressable
              key={p.value}
              onPress={() => {
                hapticSelection();
                setPeriod(p.value);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}>
              <Text
                style={[
                  typography.captionMedium,
                  { color: active ? colors.onPrimary : colors.textSecondary },
                ]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <WeeklyHoursChart data={dailyHours} />

      <View style={styles.statRow}>
        <StatCard
          label="Hours"
          value={formatHoursMinutes(report.pay.totalHours * 60)}
          sublabel={
            report.pay.overtimeHours > 0
              ? `${report.pay.overtimeHours.toFixed(1)}h overtime`
              : 'no overtime'
          }
        />
        <StatCard
          label="Est. taxes"
          value={`$${report.pay.estimatedTaxes.toFixed(2)}`}
        />
      </View>
      <View style={styles.statRow}>
        <StatCard label="Est. gross pay" value={`$${report.pay.grossPay.toFixed(2)}`} />
        <StatCard
          label="Est. net pay"
          value={`$${report.pay.estimatedNetPay.toFixed(2)}`}
          tone="positive"
        />
      </View>

      <Card>
        <Text style={[typography.heading, { color: colors.text }]}>Bills</Text>
        <View style={styles.billsRow}>
          <View style={styles.billsItem}>
            <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Paid</Text>
            <MoneyText amount={report.billsPaid} size="md" tone="positive" />
          </View>
          <View style={styles.billsItem}>
            <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Unpaid</Text>
            <MoneyText amount={report.billsUnpaid} size="md" tone="warning" />
          </View>
          <View style={styles.billsItem}>
            <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>
              Net after bills
            </Text>
            <MoneyText
              amount={report.netAfterBills}
              size="md"
              tone={report.netAfterBills >= 0 ? 'positive' : 'danger'}
            />
          </View>
        </View>
      </Card>

      <BillsByCategoryChart data={report.billsByCategory} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  billsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  billsItem: {
    flex: 1,
    gap: 2,
  },
});
