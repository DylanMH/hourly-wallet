import { Plus, ReceiptText } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BillCard } from '@/components/bills/BillCard';
import { BillFormModal } from '@/components/bills/BillFormModal';
import { BillsFilterChips, BillFilter } from '@/components/bills/BillsFilterChips';
import { BillsSummaryCard } from '@/components/bills/BillsSummaryCard';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { removeBill, setOccurrencePaid } from '@/features/bills/billService';
import { useBillOccurrences } from '@/features/bills/useBillOccurrences';
import {
  getBillsDueThisMonth,
  getBillsDueThisWeek,
  getOverdueBills,
} from '@/lib/calculations/bills';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import type { Bill, BillOccurrenceWithBill } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function BillsScreen() {
  const { colors } = useTheme();
  const { occurrences } = useBillOccurrences();
  const [filter, setFilter] = useState<BillFilter>('due-this-month');
  const [formVisible, setFormVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<BillOccurrenceWithBill | null>(null);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'due-this-week':
        return getBillsDueThisWeek(occurrences);
      case 'due-this-month':
        return getBillsDueThisMonth(occurrences);
      case 'overdue':
        return getOverdueBills(occurrences);
      case 'paid':
        return occurrences.filter((o) => o.paid);
      case 'unpaid':
        return occurrences.filter((o) => !o.paid);
      case 'subscriptions':
        return occurrences.filter((o) => o.bill.category === 'Subscription');
      default:
        return occurrences;
    }
  }, [occurrences, filter]);

  async function togglePaid(occurrence: BillOccurrenceWithBill) {
    await setOccurrencePaid(occurrence, !occurrence.paid);
    if (occurrence.paid) {
      hapticWarning();
    } else {
      hapticSuccess();
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.text }]}>Bills</Text>
        <Pressable
          onPress={() => {
            setEditingBill(null);
            setFormVisible(true);
          }}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          hitSlop={8}>
          <Plus size={20} color={colors.onPrimary} />
        </Pressable>
      </View>

      <BillsSummaryCard occurrences={occurrences} />
      <BillsFilterChips value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={32} color={colors.textMuted} />}
          title="No bills here"
          message="Add a bill to start tracking what's due."
          action={
            <Button
              label="Add Bill"
              onPress={() => {
                setEditingBill(null);
                setFormVisible(true);
              }}
            />
          }
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((occurrence) => (
            <BillCard
              key={occurrence.id}
              occurrence={occurrence}
              onTogglePaid={togglePaid}
              onEdit={(o) => {
                setEditingBill(o.bill);
                setFormVisible(true);
              }}
              onDelete={setDeleting}
            />
          ))}
        </View>
      )}

      <BillFormModal
        visible={formVisible}
        bill={editingBill}
        onClose={() => {
          setFormVisible(false);
          setEditingBill(null);
        }}
      />

      <ConfirmModal
        visible={deleting != null}
        title="Delete bill?"
        message={
          deleting
            ? `This deletes "${deleting.bill.name}" and all of its occurrences.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleting) {
            await removeBill(deleting.billId);
            hapticWarning();
          }
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: spacing.sm,
  },
});
