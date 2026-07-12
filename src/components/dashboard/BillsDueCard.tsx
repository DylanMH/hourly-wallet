import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { MoneyText } from "@/components/ui/MoneyText";
import {
    getBillsDueThisMonth,
    getBillsDueThisWeek,
    getBillsDueToday,
    getOverdueBills,
    getPaidBillsThisMonth,
    getPaidBillsThisWeek,
    getUnpaidBillsThisMonth,
    getUnpaidBillsThisWeek,
    sumOccurrences,
} from "@/lib/calculations/bills";
import { formatShortDate } from "@/lib/dates";
import type { BillOccurrenceWithBill } from "@/lib/types";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

type BillsDueCardProps = {
  occurrences: BillOccurrenceWithBill[];
  now?: Date;
};

export function BillsDueCard({ occurrences, now }: BillsDueCardProps) {
  const { colors } = useTheme();

  const overdue = getOverdueBills(occurrences, now);
  const dueToday = getBillsDueToday(occurrences, now).filter((o) => !o.paid);
  const dueThisWeek = getBillsDueThisWeek(occurrences, now).filter(
    (o) => !o.paid,
  );
  const dueThisMonth = getBillsDueThisMonth(occurrences, now);
  const paidThisMonth = getPaidBillsThisMonth(occurrences, now);
  const unpaidThisMonth = getUnpaidBillsThisMonth(occurrences, now);
  const paidThisWeek = getPaidBillsThisWeek(occurrences, now);
  const unpaidThisWeek = getUnpaidBillsThisWeek(occurrences, now);
  const paidCount = paidThisMonth.length;
  const totalCount = dueThisMonth.length;
  const paidAmount = sumOccurrences(paidThisMonth);
  const remainingAmount = sumOccurrences(unpaidThisMonth);
  const paidThisWeekAmount = sumOccurrences(paidThisWeek);
  const remainingThisWeekAmount = sumOccurrences(unpaidThisWeek);

  const preview = [...overdue, ...dueToday, ...dueThisWeek]
    .filter((o, index, arr) => arr.findIndex((x) => x.id === o.id) === index)
    .slice(0, 4);

  return (
    <Card>
      <Pressable
        style={styles.header}
        onPress={() => router.push("/(tabs)/bills")}
      >
        <Text style={[typography.heading, { color: colors.text }]}>
          Bills due
        </Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[typography.captionMedium, { color: colors.danger }]}>
            Overdue
          </Text>
          <MoneyText
            amount={sumOccurrences(overdue)}
            size="md"
            tone={overdue.length ? "danger" : "muted"}
          />
        </View>
        <View style={styles.stat}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            Today
          </Text>
          <MoneyText amount={sumOccurrences(dueToday)} size="md" />
        </View>
        <View style={styles.stat}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            This week
          </Text>
          <MoneyText amount={sumOccurrences(dueThisWeek)} size="md" />
        </View>
      </View>

      <View style={[styles.monthRow, { borderTopColor: colors.border }]}>
        <View style={styles.monthStat}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            This month
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.text }]}>
            {paidCount} of {totalCount} paid
          </Text>
        </View>
        <View style={styles.monthAmounts}>
          <View style={styles.monthAmount}>
            <Text
              style={[
                typography.captionMedium,
                { color: colors.textSecondary },
              ]}
            >
              Paid
            </Text>
            <MoneyText amount={paidAmount} size="md" tone="muted" />
          </View>
          <View style={styles.monthAmount}>
            <Text
              style={[
                typography.captionMedium,
                { color: colors.textSecondary },
              ]}
            >
              Remaining
            </Text>
            <MoneyText amount={remainingAmount} size="md" />
          </View>
        </View>
      </View>

      <View style={[styles.monthRow, { borderTopColor: colors.border }]}>
        <View style={styles.monthStat}>
          <Text
            style={[typography.captionMedium, { color: colors.textSecondary }]}
          >
            This week
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.text }]}>
            {paidThisWeek.length} of{" "}
            {paidThisWeek.length + unpaidThisWeek.length} paid
          </Text>
        </View>
        <View style={styles.monthAmounts}>
          <View style={styles.monthAmount}>
            <Text
              style={[
                typography.captionMedium,
                { color: colors.textSecondary },
              ]}
            >
              Paid
            </Text>
            <MoneyText amount={paidThisWeekAmount} size="md" tone="muted" />
          </View>
          <View style={styles.monthAmount}>
            <Text
              style={[
                typography.captionMedium,
                { color: colors.textSecondary },
              ]}
            >
              Remaining
            </Text>
            <MoneyText amount={remainingThisWeekAmount} size="md" />
          </View>
        </View>
      </View>

      {preview.length === 0 ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Nothing due this week. Nice.
        </Text>
      ) : (
        preview.map((occ) => (
          <View
            key={occ.id}
            style={[styles.billRow, { borderTopColor: colors.border }]}
          >
            <View style={styles.billMain}>
              <Text
                style={[typography.bodyMedium, { color: colors.text }]}
                numberOfLines={1}
              >
                {occ.bill.name}
              </Text>
              <Text
                style={[typography.caption, { color: colors.textSecondary }]}
              >
                Due {formatShortDate(occ.dueDate)}
              </Text>
            </View>
            <MoneyText amount={occ.amountSnapshot} size="md" />
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  billMain: {
    flex: 1,
    gap: 1,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  monthStat: {
    gap: 2,
  },
  monthAmounts: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  monthAmount: {
    alignItems: "flex-end",
    gap: 2,
  },
});
