import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
    calculateWorkedHours,
    calculateWorkedMinutes
} from "@/lib/calculations/shifts";
import { formatCurrency, formatHoursMinutes } from "@/lib/money";
import type { ClockStatus, Shift } from "@/lib/types";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

const STATUS_META: Record<
  ClockStatus,
  { label: string; tone: "default" | "positive" | "warning" }
> = {
  "not-clocked-in": { label: "Not clocked in", tone: "default" },
  "clocked-in": { label: "Clocked in", tone: "positive" },
  "on-lunch": { label: "On lunch", tone: "warning" },
  "on-break": { label: "On break", tone: "warning" },
};

type ClockStatusCardProps = {
  shift: Shift | null;
  status: ClockStatus;
  jobName?: string;
};

export function ClockStatusCard({
  shift,
  status,
  jobName,
}: ClockStatusCardProps) {
  const { colors } = useTheme();
  const [now, setNow] = useState(new Date());

  const active = shift != null && !shift.clockOut;

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [active]);

  const meta = STATUS_META[status];
  const workedMinutes =
    active && shift ? calculateWorkedMinutes(shift, now) : 0;
  const earned =
    active && shift
      ? calculateWorkedHours(shift, now) * shift.hourlyRateSnapshot
      : 0;

  // Determine the primary display time and a secondary info line
  let primaryTime = workedMinutes;
  let secondaryInfo: string | null = null;

  if (active && shift) {
    if (status === "on-lunch") {
      const activeLunch = shift.lunches.find((l) => !l.end);
      if (activeLunch) {
        const lunchMins = Math.floor(
          (now.getTime() - new Date(activeLunch.start).getTime()) / 60000,
        );
        primaryTime = lunchMins;
        secondaryInfo = `${formatHoursMinutes(workedMinutes)} worked`;
      }
    } else if (status === "on-break") {
      const activeBreak = shift.breaks.find((b) => !b.end);
      if (activeBreak) {
        const breakMins = Math.floor(
          (now.getTime() - new Date(activeBreak.start).getTime()) / 60000,
        );
        primaryTime = breakMins;
        const paidLabel = activeBreak.paid ? "paid" : "unpaid";
        secondaryInfo = `${formatHoursMinutes(workedMinutes)} worked · ${paidLabel} break`;
      }
    }
  }

  return (
    <Card style={styles.card}>
      <Badge label={meta.label} tone={meta.tone} />
      {jobName ? (
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          {jobName}
        </Text>
      ) : null}
      <Text
        style={[
          typography.displayLarge,
          { color: colors.text, fontVariant: ["tabular-nums"] },
        ]}
      >
        {formatHoursMinutes(primaryTime)}
      </Text>
      {secondaryInfo ? (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {secondaryInfo}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {active
            ? `~${formatCurrency(earned)} earned this shift (est. gross)`
            : "Clock in to start tracking your shift."}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
