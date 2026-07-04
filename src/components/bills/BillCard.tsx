import { isBefore, parseISO, startOfDay } from 'date-fns';
import { CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { formatShortDate } from '@/lib/dates';
import type { BillOccurrenceWithBill } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BillCardProps = {
  occurrence: BillOccurrenceWithBill;
  onTogglePaid: (occurrence: BillOccurrenceWithBill) => void;
  onEdit: (occurrence: BillOccurrenceWithBill) => void;
  onDelete: (occurrence: BillOccurrenceWithBill) => void;
};

export function BillCard({ occurrence, onTogglePaid, onEdit, onDelete }: BillCardProps) {
  const { colors } = useTheme();
  const { bill } = occurrence;
  const overdue =
    !occurrence.paid && isBefore(startOfDay(parseISO(occurrence.dueDate)), startOfDay(new Date()));

  return (
    <Card
      style={StyleSheet.flatten([
        styles.card,
        overdue && { borderColor: colors.danger, borderWidth: 1 },
        occurrence.paid && { opacity: 0.75 },
      ])}>
      <Pressable onPress={() => onTogglePaid(occurrence)} hitSlop={8}>
        {occurrence.paid ? (
          <CheckCircle2 size={26} color={colors.positive} />
        ) : (
          <Circle size={26} color={overdue ? colors.danger : colors.textMuted} />
        )}
      </Pressable>

      <View style={styles.main}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>{bill.name}</Text>
        <Text
          style={[
            typography.caption,
            { color: overdue ? colors.danger : colors.textSecondary },
          ]}>
          {overdue ? 'Overdue · ' : ''}Due {formatShortDate(occurrence.dueDate)}
          {occurrence.paid ? (occurrence.autopaid ? ' · Autopaid' : ' · Paid') : ''}
        </Text>
        <View style={styles.badges}>
          <Badge label={bill.category} />
          {bill.autopay ? <Badge label="Autopay" tone="primary" /> : null}
          {bill.reminderEnabled ? <Badge label="Reminder" tone="warning" /> : null}
        </View>
      </View>

      <View style={styles.right}>
        <MoneyText amount={occurrence.amountSnapshot} tone={occurrence.paid ? 'muted' : 'default'} />
        <View style={styles.actions}>
          <Pressable onPress={() => onEdit(occurrence)} hitSlop={8}>
            <Pencil size={16} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => onDelete(occurrence)} hitSlop={8}>
            <Trash2 size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
