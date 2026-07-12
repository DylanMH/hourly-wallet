import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BillsByCategoryPieChart } from "@/components/reports/BillsByCategoryPieChart";
import { HoursChart } from "@/components/reports/HoursChart";
import { PaidBillsModal } from "@/components/reports/PaidBillsModal";
import { Card } from "@/components/ui/Card";
import { MoneyText } from "@/components/ui/MoneyText";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { getDefaultJob, getJobs } from "@/db/queries/jobQueries";
import { useBillOccurrences } from "@/features/bills/useBillOccurrences";
import { usePaidBillsInRange } from "@/features/bills/usePaidBillsInRange";
import { useShiftsInRange } from "@/features/clock/useShifts";
import {
    buildPeriodReport,
    getChartBars,
    getReportRange,
    ReportPeriod,
} from "@/features/reports/reportService";
import { useNowTicker } from "@/hooks/useNowTicker";
import { hapticSelection } from "@/lib/haptics";
import { formatHoursMinutes } from "@/lib/money";
import type { Job } from "@/lib/types";
import { useAppStore } from "@/state/appStore";
import { radius, spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";
import { parseISO } from "date-fns";

const ALL_JOBS = "all";

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "this-week", label: "This week" },
  { value: "last-week", label: "Last week" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
];

function defaultPeriodForJob(jobs: Job[], selectedJobId: string): ReportPeriod {
  if (selectedJobId === ALL_JOBS) return "this-week";
  const job = jobs.find((j) => j.id === selectedJobId);
  return job?.isSalaried ? "this-month" : "this-week";
}

function chartTitleForPeriod(period: ReportPeriod): string {
  switch (period) {
    case "this-week":
    case "last-week":
      return "Hours by day";
    case "this-month":
    case "last-month":
      return "Hours by week";
    case "this-year":
      return "Hours by month";
  }
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>("this-week");
  const now = useNowTicker(true, 60000);
  const range = useMemo(() => getReportRange(period, now), [period, now]);
  const { shifts: allShifts } = useShiftsInRange(range);
  const { occurrences } = useBillOccurrences();
  const { occurrences: paidBillsInRange } = usePaidBillsInRange(range);

  const jobsVersion = useAppStore((s) => s.jobsVersion);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(ALL_JOBS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selectedJobIdRef = React.useRef(selectedJobId);
  React.useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [allJobs, fallback] = await Promise.all([
        getJobs(),
        getDefaultJob(),
      ]);
      if (cancelled) return;
      setJobs(allJobs);
      const current = selectedJobIdRef.current;
      const nextSelectedJobId =
        current === ALL_JOBS
          ? ALL_JOBS
          : allJobs.some((j) => j.id === current)
            ? current
            : (fallback?.id ?? allJobs[0]?.id ?? ALL_JOBS);
      setSelectedJobId(nextSelectedJobId);
      setPeriod(defaultPeriodForJob(allJobs, nextSelectedJobId));
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
    () =>
      buildPeriodReport(shifts, occurrences, range, jobs, selectedJobId, now),
    [shifts, occurrences, range, jobs, selectedJobId, now],
  );

  const paidByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const occ of paidBillsInRange) {
      map.set(
        occ.bill.category,
        (map.get(occ.bill.category) ?? 0) + occ.amountSnapshot,
      );
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [paidBillsInRange]);

  const paidTotal = useMemo(
    () => paidByCategory.reduce((sum, item) => sum + item.total, 0),
    [paidByCategory],
  );

  const unpaidTotal = useMemo(() => {
    return occurrences
      .filter((o) => {
        const due = parseISO(o.dueDate);
        return due >= range.start && due <= range.end && !o.paid;
      })
      .reduce((sum, o) => sum + o.amountSnapshot, 0);
  }, [occurrences, range]);

  const netAfterBills = report.pay.estimatedNetPay - paidTotal - unpaidTotal;
  const chartData = useMemo(
    () => getChartBars(period, shifts, range, jobs, selectedJobId),
    [period, shifts, range, jobs, selectedJobId],
  );
  const pieEmptyLabel = useMemo(() => {
    switch (period) {
      case "this-week":
        return "No bills paid this week.";
      case "last-week":
        return "No bills paid last week.";
      case "this-month":
        return "No bills paid this month.";
      case "last-month":
        return "No bills paid last month.";
      case "this-year":
        return "No bills paid this year.";
    }
  }, [period]);

  const jobOptions = [
    { label: "All jobs", value: ALL_JOBS },
    ...jobs.map((j) => ({ label: j.name, value: j.id })),
  ];

  return (
    <Screen showLogo>
      <Select
        label="Report view"
        value={selectedJobId}
        options={jobOptions}
        onChange={(value) => {
          setSelectedJobId(value);
          setPeriod(defaultPeriodForJob(jobs, value));
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
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
              ]}
            >
              <Text
                style={[
                  typography.captionMedium,
                  { color: active ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <HoursChart data={chartData} title={chartTitleForPeriod(period)} />

      <BillsByCategoryPieChart
        data={paidByCategory}
        onSelect={(category) => setSelectedCategory(category)}
        emptyLabel={pieEmptyLabel}
      />

      <View style={styles.statRow}>
        <StatCard
          label="Hours"
          value={formatHoursMinutes(report.pay.totalHours * 60)}
          sublabel={
            report.pay.overtimeHours > 0
              ? `${report.pay.overtimeHours.toFixed(1)}h overtime`
              : "no overtime"
          }
        />
        <StatCard
          label="Est. taxes"
          value={`$${report.pay.estimatedTaxes.toFixed(2)}`}
        />
      </View>
      <View style={styles.statRow}>
        <StatCard
          label="Est. gross pay"
          value={`$${report.pay.grossPay.toFixed(2)}`}
        />
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
            <Text
              style={[
                typography.captionMedium,
                { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              Paid
            </Text>
            <MoneyText
              amount={paidTotal}
              size="sm"
              tone="positive"
              numberOfLines={1}
            />
          </View>
          <View style={styles.billsItem}>
            <Text
              style={[
                typography.captionMedium,
                { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              Unpaid
            </Text>
            <MoneyText
              amount={unpaidTotal}
              size="sm"
              tone="warning"
              numberOfLines={1}
            />
          </View>
          <View style={styles.billsItem}>
            <Text
              style={[
                typography.captionMedium,
                { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              Net
            </Text>
            <MoneyText
              amount={netAfterBills}
              size="sm"
              tone={netAfterBills >= 0 ? "positive" : "danger"}
              numberOfLines={1}
            />
          </View>
        </View>
        {paidByCategory.length > 0 && (
          <Select
            label="View category"
            value={selectedCategory ?? "all"}
            options={[
              { label: "All categories", value: "all" },
              ...paidByCategory.map((c) => ({
                label: c.category,
                value: c.category,
              })),
            ]}
            onChange={(value) => {
              setSelectedCategory(value === "all" ? null : value);
            }}
            style={{ marginTop: spacing.md }}
          />
        )}
      </Card>

      <PaidBillsModal
        visible={!!selectedCategory}
        category={selectedCategory ?? ""}
        occurrences={paidBillsInRange}
        onClose={() => setSelectedCategory(null)}
      />
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
    flexDirection: "row",
    gap: spacing.md,
  },
  billsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  billsItem: {
    flex: 1,
    gap: 2,
  },
});
