import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { hapticSelection } from '@/lib/haptics';
import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type BillFilter =
  | 'all'
  | 'due-this-week'
  | 'due-this-month'
  | 'overdue'
  | 'paid'
  | 'unpaid'
  | 'subscriptions';

const FILTERS: { value: BillFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due-this-week', label: 'Due this week' },
  { value: 'due-this-month', label: 'Due this month' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'subscriptions', label: 'Subscriptions' },
];

type BillsFilterChipsProps = {
  value: BillFilter;
  onChange: (filter: BillFilter) => void;
};

export function BillsFilterChips({ value, onChange }: BillsFilterChipsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {FILTERS.map((filter) => {
        const active = filter.value === value;
        return (
          <Pressable
            key={filter.value}
            onPress={() => {
              hapticSelection();
              onChange(filter.value);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}>
            <Text
              style={[
                typography.captionMedium,
                { color: active ? colors.onPrimary : colors.textSecondary },
              ]}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
