import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { MoneyText } from "@/components/ui/MoneyText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MonthlyAffordability } from "@/lib/calculations/affordability";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

type MonthlyAffordabilityCardProps = {
  affordability: MonthlyAffordability;
  netSoFar: number;
  billsPaid: number;
  billsRemaining: number;
};

export function MonthlyAffordabilityCard({
  affordability,
  netSoFar,
  billsPaid,
  billsRemaining,
}: MonthlyAffordabilityCardProps) {
  const { colors } = useTheme();
  const { status, projectedNet, totalBillsDue, surplus } = affordability;

  const meta = {
    "on-track": {
      icon: <CircleCheck size={22} color={colors.positive} />,
      title: "You\u2019re on track",
      message: "You\u2019re on track this month.",
      tone: "positive" as const,
      color: colors.positive,
    },
    close: {
      icon: <CircleAlert size={22} color={colors.warning} />,
      title: "You\u2019re close",
      message: "You\u2019re close. Keep an eye on upcoming bills.",
      tone: "warning" as const,
      color: colors.warning,
    },
    shortfall: {
      icon: <TriangleAlert size={22} color={colors.danger} />,
      title: "Projected shortfall",
      message:
        "Projected shortfall. You may need more hours or fewer expenses.",
      tone: "danger" as const,
      color: colors.danger,
    },
  }[status];

  const coverage =
    projectedNet > 0 ? Math.min(1, totalBillsDue / projectedNet) : 1;

  return (
    <Card>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        Monthly affordability
      </Text>
      <View style={styles.header}>
        {meta.icon}
        <Text style={[typography.heading, { color: meta.color }]}>
          {meta.title}
        </Text>
      </View>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {meta.message}
      </Text>
      <ProgressBar progress={coverage} tone={meta.tone} />
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
            Projected net
          </Text>
          <MoneyText amount={projectedNet} size="md" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Bills needed
          </Text>
          <MoneyText amount={totalBillsDue} size="md" tone="warning" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Bills paid
          </Text>
          <MoneyText amount={billsPaid} size="md" tone="positive" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Bills remaining
          </Text>
          <MoneyText amount={billsRemaining} size="md" tone="warning" />
        </View>
        <View style={styles.item}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            {surplus >= 0 ? "Surplus" : "Shortfall"}
          </Text>
          <MoneyText
            amount={surplus}
            size="md"
            tone={surplus >= 0 ? "positive" : "danger"}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
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
