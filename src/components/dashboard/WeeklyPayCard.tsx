import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { MoneyText } from "@/components/ui/MoneyText";
import type { PayBreakdown } from "@/lib/calculations/pay";
import { formatHoursMinutes } from "@/lib/money";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

type WeeklyPayCardProps = {
  pay: PayBreakdown;
};

export function WeeklyPayCard({ pay }: WeeklyPayCardProps) {
  const { colors } = useTheme();

  return (
    <Card>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        This week (estimated)
      </Text>
      <MoneyText amount={pay.estimatedNetPay} size="xl" tone="positive" />
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        estimated take-home
      </Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Regular
          </Text>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.text, fontVariant: ["tabular-nums"] },
            ]}
          >
            {formatHoursMinutes(pay.regularHours * 60)}
          </Text>
          <MoneyText amount={pay.regularEarnings} size="md" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Overtime
          </Text>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.text, fontVariant: ["tabular-nums"] },
            ]}
          >
            {formatHoursMinutes(pay.overtimeHours * 60)}
          </Text>
          <MoneyText amount={pay.overtimeEarnings} size="md" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Total hours
          </Text>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.text, fontVariant: ["tabular-nums"] },
            ]}
          >
            {formatHoursMinutes(pay.totalHours * 60)}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Gross
          </Text>
          <MoneyText amount={pay.grossPay} size="md" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Taxes
          </Text>
          <MoneyText amount={-pay.estimatedTaxes} size="md" tone="muted" />
        </View>
        <View style={styles.item} />
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
