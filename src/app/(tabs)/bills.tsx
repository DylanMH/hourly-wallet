import { Plus, ReceiptText } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BillFormModal } from '@/components/bills/BillFormModal';
import { BillMonthList } from '@/components/bills/BillMonthList';
import { BillsSummaryCard } from '@/components/bills/BillsSummaryCard';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { removeBill, setOccurrencePaid } from '@/features/bills/billService';
import { useBillOccurrences } from '@/features/bills/useBillOccurrences';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import type { Bill, BillOccurrenceWithBill } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BillsTab = 'unpaid' | 'paid';

const TABS: { value: BillsTab; label: string }[] = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
];

export default function BillsScreen() {
  const { colors } = useTheme();
  const { occurrences } = useBillOccurrences();
  const [activeTab, setActiveTab] = useState<BillsTab>('unpaid');
  const [formVisible, setFormVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<BillOccurrenceWithBill | null>(null);

  const filtered = useMemo(
    () => occurrences.filter((o) => (activeTab === 'paid' ? o.paid : !o.paid)),
    [occurrences, activeTab]
  );

  async function togglePaid(occurrence: BillOccurrenceWithBill) {
    await setOccurrencePaid(occurrence, !occurrence.paid);
    if (occurrence.paid) {
      hapticWarning();
    } else {
      hapticSuccess();
    }
  }

  const addButton = (
    <Pressable
      onPress={() => {
        setEditingBill(null);
        setFormVisible(true);
      }}
      style={[styles.addButton, { backgroundColor: colors.primary }]}
      hitSlop={8}>
      <Plus size={20} color={colors.onPrimary} />
    </Pressable>
  );

  return (
    <Screen showLogo right={addButton}>
      <BillsSummaryCard occurrences={occurrences} />

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = tab.value === activeTab;
          return (
            <Pressable
              key={tab.value}
              onPress={() => setActiveTab(tab.value)}
              style={[
                styles.tab,
                {
                  borderBottomColor: active ? colors.primary : colors.border,
                  borderBottomWidth: active ? 2 : StyleSheet.hairlineWidth,
                },
              ]}>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={32} color={colors.textMuted} />}
          title="No bills here"
          message={`No ${activeTab} bills. Add a bill to start tracking.`}
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
        <BillMonthList
          occurrences={filtered}
          onTogglePaid={togglePaid}
          onEdit={(o) => {
            setEditingBill(o.bill);
            setFormVisible(true);
          }}
          onDelete={setDeleting}
        />
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
