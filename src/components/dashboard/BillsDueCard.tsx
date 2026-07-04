import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import {
  getBillsDueThisWeek,
  getBillsDueToday,
  getOverdueBills,
  sumOccurrences,
} from '@/lib/calculations/bills';
import { formatShortDate } from '@/lib/dates';
import type { BillOccurrenceWithBill } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BillsDueCardProps = {
  occurrences: BillOccurrenceWithBill[];
};

export function BillsDueCard({ occurrences }: BillsDueCardProps) {
  const { colors } = useTheme();

  const overdue = getOverdueBills(occurrences);
  const dueToday = getBillsDueToday(occurrences).filter((o) => !o.paid);
  const dueThisWeek = getBillsDueThisWeek(occurrences).filter((o) => !o.paid);

  const preview = [...overdue, ...dueToday, ...dueThisWeek]
    .filter((o, index, arr) => arr.findIndex((x) => x.id === o.id) === index)
    .slice(0, 4);

  return (
    <Card>
      <Pressable style={styles.header} onPress={() => router.push('/(tabs)/bills')}>
        <Text style={[typography.heading, { color: colors.text }]}>Bills due</Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[typography.captionMedium, { color: colors.danger }]}>Overdue</Text>
          <MoneyText amount={sumOccurrences(overdue)} size="md" tone={overdue.length ? 'danger' : 'muted'} />
        </View>
        <View style={styles.stat}>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Today</Text>
          <MoneyText amount={sumOccurrences(dueToday)} size="md" />
        </View>
        <View style={styles.stat}>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>This week</Text>
          <MoneyText amount={sumOccurrences(dueThisWeek)} size="md" />
        </View>
      </View>

      {preview.length === 0 ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Nothing due this week. Nice.
        </Text>
      ) : (
        preview.map((occ) => (
          <View key={occ.id} style={[styles.billRow, { borderTopColor: colors.border }]}>
            <View style={styles.billMain}>
              <Text style={[typography.bodyMedium, { color: colors.text }]} numberOfLines={1}>
                {occ.bill.name}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  billMain: {
    flex: 1,
    gap: 1,
  },
});
