import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { MoneyText } from "@/components/ui/MoneyText";
import type { MonthlyProjection } from "@/lib/calculations/affordability";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

type MonthlyIncomeCardProps = {
  projection: MonthlyProjection;
};

export function MonthlyIncomeCard({ projection }: MonthlyIncomeCardProps) {
  const { colors } = useTheme();
  const { grossSoFar, netSoFar, projectedGross, projectedNet } = projection;

  return (
    <Card>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        Monthly projection
      </Text>
      <MoneyText amount={projectedNet} size="xl" tone="positive" />
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        based on month-to-date average hours
      </Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Net so far
          </Text>
          <MoneyText amount={netSoFar} size="md" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Gross so far
          </Text>
          <MoneyText amount={grossSoFar} size="md" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Projected gross
          </Text>
          <MoneyText amount={projectedGross} size="md" />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  item: {
    flex: 1,
    gap: 2,
  },
});
