import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ActiveShiftCard } from "@/components/dashboard/ActiveShiftCard";
import { BillsDueCard } from "@/components/dashboard/BillsDueCard";
import { MonthlyAffordabilityCard } from "@/components/dashboard/MonthlyAffordabilityCard";
import { MonthlyIncomeCard } from "@/components/dashboard/MonthlyIncomeCard";
import { WeeklyPayCard } from "@/components/dashboard/WeeklyPayCard";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import { useActiveShift } from "@/features/clock/useActiveShift";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

const ALL_JOBS = "all";

export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { shift, status, refresh } = useActiveShift();
  const active = shift != null && !shift.clockOut;

  const [rawSelectedJobId, setSelectedJobId] = useState<string>(ALL_JOBS);

  const {
    jobs,
    selectedJobId,
    selectedJob,
    jobName,
    now,
    todayMinutes,
    weeklyPay,
    monthlyProjection,
    affordability,
    netSoFar,
    billsPaidAmount,
    billsRemainingAmount,
    occurrences,
  } = useDashboardData(rawSelectedJobId);

  const activeJob = useMemo(
    () => (shift ? jobs.find((j) => j.id === shift.jobId) : undefined),
    [jobs, shift],
  );
  const activeJobName = activeJob?.name;
  const statusLabel =
    status === "not-clocked-in"
      ? "Not clocked in"
      : status === "clocked-in"
        ? "Clocked in"
        : status === "on-lunch"
          ? "On lunch"
          : "On break";

  const jobOptions = useMemo(
    () => [
      { label: "All jobs", value: ALL_JOBS },
      ...jobs.map((j) => ({ label: j.name, value: j.id })),
    ],
    [jobs],
  );

  return (
    <Screen
      title="Hourly Wallet"
      showLogo
      right={
        <Pressable
          onPress={() => router.navigate("/(tabs)/clock")}
          style={styles.activeIndicator}
          hitSlop={8}
          accessibilityLabel={`${statusLabel}${activeJobName ? ` for ${activeJobName}` : ""}`}
          accessibilityHint="Opens the clock screen"
          accessibilityRole="button"
        >
          <View
            style={[
              styles.activeDot,
              {
                backgroundColor:
                  status === "clocked-in"
                    ? colors.positive
                    : status === "on-lunch" || status === "on-break"
                      ? colors.warning
                      : colors.textMuted,
              },
            ]}
          />
          <Text
            style={[
              typography.captionMedium,
              {
                color:
                  status === "clocked-in"
                    ? colors.positive
                    : status === "on-lunch" || status === "on-break"
                      ? colors.warning
                      : colors.textMuted,
              },
            ]}
          >
            {statusLabel}
            {activeJobName ? ` · ${activeJobName}` : ""}
          </Text>
        </Pressable>
      }
    >
      <Select
        label="Dashboard view"
        value={selectedJobId}
        options={jobOptions}
        onChange={setSelectedJobId}
      />

      {!active && selectedJobId !== ALL_JOBS && !selectedJob?.isSalaried ? (
        <ActiveShiftCard
          shift={shift}
          status={status}
          todayMinutes={todayMinutes}
          jobName={jobName}
          jobId={selectedJobId}
          onChanged={refresh}
        />
      ) : null}
      <MonthlyIncomeCard projection={monthlyProjection} />
      <WeeklyPayCard pay={weeklyPay} />
      <MonthlyAffordabilityCard
        affordability={affordability}
        netSoFar={netSoFar}
        billsPaid={billsPaidAmount}
        billsRemaining={billsRemainingAmount}
      />
      <BillsDueCard occurrences={occurrences} now={now} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
