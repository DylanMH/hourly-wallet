import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { MoneyText } from '@/components/ui/MoneyText';
import { formatFullDate } from '@/lib/dates';
import type { BillOccurrenceWithBill } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type PaidBillsModalProps = {
  visible: boolean;
  category: string;
  occurrences: BillOccurrenceWithBill[];
  onClose: () => void;
};

export function PaidBillsModal({ visible, category, occurrences, onClose }: PaidBillsModalProps) {
  const { colors } = useTheme();
  const inCategory = occurrences.filter((o) => o.bill.category === category);
  const total = inCategory.reduce((sum, o) => sum + o.amountSnapshot, 0);

  const grouped = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; total: number; payments: BillOccurrenceWithBill[] }>();
    for (const occ of inCategory) {
      const existing = map.get(occ.bill.id);
      if (existing) {
        existing.count += 1;
        existing.total += occ.amountSnapshot;
        existing.payments.push(occ);
      } else {
        map.set(occ.bill.id, {
          id: occ.bill.id,
          name: occ.bill.name,
          count: 1,
          total: occ.amountSnapshot,
          payments: [occ],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [inCategory]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.dialog, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[typography.heading, { color: colors.text }]}>{category}</Text>
          <View style={styles.totalRow}>
            <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Total paid</Text>
            <MoneyText amount={total} size="md" tone="positive" />
          </View>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>
            {inCategory.length} payment{inCategory.length !== 1 ? 's' : ''}
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {grouped.map((item) => (
              <View
                key={item.id}
                style={[styles.section, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionLeft}>
                    <Text style={[typography.bodyMedium, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {item.count} payment{item.count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <MoneyText amount={item.total} size="md" tone="positive" />
                </View>
                {item.payments.map((occ) => (
                  <View
                    key={occ.id}
                    style={[styles.paymentRow, { borderTopColor: colors.border }]}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {formatFullDate(occ.dueDate)}
                    </Text>
                    <MoneyText amount={occ.amountSnapshot} size="sm" tone="positive" />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <Button label="Close" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dialog: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    maxHeight: '85%',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  list: {
    marginVertical: spacing.md,
  },
  section: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
