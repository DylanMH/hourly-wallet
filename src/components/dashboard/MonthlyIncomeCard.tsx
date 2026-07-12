import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { MoneyText } from "@/components/ui/MoneyText";
import type { MonthlyProjection } from "@/lib/calculations/affordability";
import { formatHoursMinutes } from "@/lib/money";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

type MonthlyIncomeCardProps = {
  projection: MonthlyProjection;
};

export function MonthlyIncomeCard({ projection }: MonthlyIncomeCardProps) {
  const { colors } = useTheme();
  const {
    actualHours,
    regularEarningsSoFar,
    overtimeEarningsSoFar,
    netSoFar,
    grossSoFar,
    remainingPlannedWorkdays,
    expectedFutureRegularHours,
    expectedFutureOvertimeHours,
    projectedFutureGross,
    projectedFutureNet,
    projectedNet,
    projectedGross,
  } = projection;

  const hasOvertime =
    overtimeEarningsSoFar > 0 || expectedFutureOvertimeHours > 0;

  return (
    <Card>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        Projected monthly net
      </Text>
      <MoneyText amount={projectedNet} size="xl" tone="positive" />
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        conservative estimate · based on expected schedule
      </Text>

      <View style={styles.sectionHeader}>
        <Text
          style={[typography.captionMedium, { color: colors.textSecondary }]}
        >
          Earned so far
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Regular
          </Text>
          <MoneyText amount={regularEarningsSoFar} size="md" />
        </View>
        {hasOvertime && (
          <View style={styles.item}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Overtime
            </Text>
            <MoneyText amount={overtimeEarningsSoFar} size="md" />
          </View>
        )}
        <View style={styles.item}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Net
          </Text>
          <MoneyText amount={netSoFar} size="md" />
        </View>
        <View style={styles.item}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Hours
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.text }]}>
            {formatHoursMinutes(actualHours * 60)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text
          style={[typography.captionMedium, { color: colors.textSecondary }]}
        >
          Projected remaining
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Workdays left
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.text }]}>
            {remainingPlannedWorkdays}
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Future hours
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.text }]}>
            {formatHoursMinutes(expectedFutureRegularHours * 60)}
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Future gross
          </Text>
          <MoneyText amount={projectedFutureGross} size="md" />
        </View>
        <View style={styles.item}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Future net
          </Text>
          <MoneyText amount={projectedFutureNet} size="md" />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Projected gross
          </Text>
          <MoneyText amount={projectedGross} size="md" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Gross so far
          </Text>
          <MoneyText amount={grossSoFar} size="md" />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  item: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: spacing.md,
  },
});
