import { format, isValid, parse } from 'date-fns';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createBill, editBill } from '@/features/bills/billService';
import { saveNotificationsEnabled } from '@/features/settings/settingsService';
import { hapticSuccess } from '@/lib/haptics';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  BILL_CATEGORIES,
  BILL_RECURRENCES,
  Bill,
  BillCategory,
  BillRecurrence,
} from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BillFormModalProps = {
  visible: boolean;
  bill: Bill | null;
  onClose: () => void;
};

export function BillFormModal({ visible, bill, onClose }: BillFormModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible ? <BillForm key={bill?.id ?? 'new'} bill={bill} onClose={onClose} /> : null}
    </Modal>
  );
}

function BillForm({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  const { colors } = useTheme();

  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '');
  const [category, setCategory] = useState<BillCategory>(bill?.category ?? 'Other');
  const [recurrence, setRecurrence] = useState<BillRecurrence>(bill?.recurrence ?? 'monthly');
  const [dueDay, setDueDay] = useState(String(bill?.dueDay ?? 1));
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [autopay, setAutopay] = useState(bill?.autopay ?? false);
  const [reminderEnabled, setReminderEnabled] = useState(bill?.reminderEnabled ?? false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(
    String(bill?.reminderDaysBefore ?? 1)
  );
  const [notes, setNotes] = useState(bill?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const usesDueDay = recurrence === 'monthly';

  async function handleReminderToggle(enabled: boolean) {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setError('Notification permission was denied. Reminders stay off.');
        return;
      }
      await saveNotificationsEnabled(true);
      setError('');
    }
    setReminderEnabled(enabled);
  }

  async function save() {
    setError('');
    const parsedAmount = parseFloat(amount);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!(parsedAmount > 0)) {
      setError('Amount must be greater than zero.');
      return;
    }
    let dueDayValue: number | undefined;
    let dueDateValue: string | undefined;
    if (usesDueDay) {
      const day = parseInt(dueDay, 10);
      if (!(day >= 1 && day <= 31)) {
        setError('Due day must be between 1 and 31.');
        return;
      }
      dueDayValue = day;
    } else {
      const parsed = parse(dueDate, 'yyyy-MM-dd', new Date());
      if (!isValid(parsed)) {
        setError('Due date must be in YYYY-MM-DD format.');
        return;
      }
      dueDateValue = dueDate;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        amount: parsedAmount,
        category,
        recurrence,
        dueDay: dueDayValue,
        dueDate: dueDateValue,
        autopay,
        reminderEnabled,
        reminderDaysBefore: reminderEnabled
          ? Math.max(0, parseInt(reminderDaysBefore, 10) || 0)
          : undefined,
        notes: notes.trim() || undefined,
        active: true,
      };
      if (bill) {
        await editBill({ ...bill, ...payload });
      } else {
        await createBill(payload);
      }
      hapticSuccess();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.backdrop}>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[typography.heading, { color: colors.text }]}>
              {bill ? 'Edit Bill' : 'Add Bill'}
            </Text>
            <Input label="Name" value={name} onChangeText={setName} placeholder="Rent" />
            <Input
              label="Amount"
              prefix="$"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="1200.00"
            />
            <Select
              label="Category"
              value={category}
              onChange={setCategory}
              options={BILL_CATEGORIES.map((c) => ({ label: c, value: c }))}
            />
            <Select
              label="Recurrence"
              value={recurrence}
              onChange={setRecurrence}
              options={BILL_RECURRENCES.map((r) => ({
                label: r.charAt(0).toUpperCase() + r.slice(1),
                value: r,
              }))}
            />
            {usesDueDay ? (
              <Input
                label="Due day of month (1–31)"
                value={dueDay}
                onChangeText={setDueDay}
                keyboardType="number-pad"
                placeholder="1"
              />
            ) : (
              <Input
                label={recurrence === 'one-time' ? 'Due date (YYYY-MM-DD)' : 'First due date (YYYY-MM-DD)'}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="2026-07-15"
              />
            )}
            <View style={styles.switchRow}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>Autopay</Text>
              <Switch value={autopay} onValueChange={setAutopay} />
            </View>
            <View style={styles.switchRow}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>Reminder</Text>
              <Switch value={reminderEnabled} onValueChange={handleReminderToggle} />
            </View>
            {reminderEnabled ? (
              <Input
                label="Remind days before due date"
                value={reminderDaysBefore}
                onChangeText={setReminderDaysBefore}
                keyboardType="number-pad"
                placeholder="1"
              />
            ) : null}
            <Input label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Optional notes" />
            {error ? (
              <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
            ) : null}
            <Button label={bill ? 'Save Changes' : 'Add Bill'} size="lg" loading={saving} onPress={save} />
            <Button label="Cancel" variant="ghost" onPress={onClose} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '92%',
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
