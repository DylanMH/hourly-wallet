import { Pencil, Trash2 } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { formatShortDate } from "@/lib/dates";
import type { Bill, BillRecurrence } from "@/lib/types";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

const RECURRENCE_LABELS: Record<BillRecurrence, string> = {
  "one-time": "One-time",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

type BillsOverviewListProps = {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
};

export function BillsOverviewList({ bills, onEdit, onDelete }: BillsOverviewListProps) {
  const { colors } = useTheme();
  if (bills.length === 0) {
    return (
      <EmptyState
        title="No bills yet"
        message="Add a bill to see it here. Bills and subscriptions are listed separately from their monthly occurrences."
      />
    );
  }
  return (
    <View style={styles.list}>
      {bills.map((bill) => (
        <Card key={bill.id} style={styles.card}>
          <View style={styles.main}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>
              {bill.name}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {RECURRENCE_LABELS[bill.recurrence]}
              {bill.recurrence === "monthly" && bill.dueDay != null
                ? ` · Due day ${bill.dueDay}`
                : ""}
              {bill.recurrence === "one-time" && bill.dueDate
                ? ` · Due ${formatShortDate(bill.dueDate)}`
                : ""}
            </Text>
            <View style={styles.badges}>
              <Badge label={bill.category} />
              {bill.autopay ? <Badge label="Autopay" tone="primary" /> : null}
              {bill.reminderEnabled ? <Badge label="Reminder" tone="warning" /> : null}
            </View>
          </View>
          <View style={styles.right}>
            <MoneyText amount={bill.amount} size="md" />
            <View style={styles.actions}>
              <Pressable
                onPress={() => onEdit(bill)}
                hitSlop={8}
                accessibilityLabel={`Edit ${bill.name}`}
                accessibilityRole="button"
              >
                <Pencil size={16} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => onDelete(bill)}
                hitSlop={8}
                accessibilityLabel={`Delete ${bill.name}`}
                accessibilityRole="button"
              >
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  badges: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  right: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
});
