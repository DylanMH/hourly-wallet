import { router } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { createBill } from '@/features/bills/billService';
import {
  markOnboardingComplete,
  savePaySettings,
} from '@/features/settings/settingsService';
import { hapticSuccess } from '@/lib/haptics';
import { BILL_CATEGORIES, BillCategory } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [hourlyRate, setHourlyRate] = useState('15');
  const [taxPercent, setTaxPercent] = useState('20');
  const [overtimeEnabled, setOvertimeEnabled] = useState(true);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.5');
  const [overtimeThreshold, setOvertimeThreshold] = useState('40');

  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCategory, setBillCategory] = useState<BillCategory>('Mortgage / Rent');
  const [billDueDay, setBillDueDay] = useState('1');

  async function finish(withBill: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      await savePaySettings({
        hourlyRate: parseFloat(hourlyRate) || 15,
        taxPercent: parseFloat(taxPercent) || 20,
        overtimeEnabled,
        overtimeMultiplier: parseFloat(overtimeMultiplier) || 1.5,
        overtimeThresholdHours: parseFloat(overtimeThreshold) || 40,
      });
      if (withBill && billName.trim() && parseFloat(billAmount) > 0) {
        await createBill({
          name: billName.trim(),
          amount: parseFloat(billAmount),
          category: billCategory,
          recurrence: 'monthly',
          dueDay: Math.min(28, Math.max(1, parseInt(billDueDay, 10) || 1)),
          autopay: false,
          reminderEnabled: false,
          active: true,
        });
      }
      await markOnboardingComplete();
      hapticSuccess();
      router.replace('/(tabs)/dashboard');
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    await markOnboardingComplete();
    router.replace('/(tabs)/dashboard');
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Wallet size={32} color={colors.primary} />
        </View>
        <Text style={[typography.title, { color: colors.text }]}>Hourly Wallet</Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          Clock your hours, estimate your pay, and stay ahead of your bills. Everything stays
          on your phone.
        </Text>
      </View>

      {step === 0 ? (
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>Your pay</Text>
          <Input
            label="Hourly rate"
            prefix="$"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            keyboardType="decimal-pad"
            placeholder="15.00"
          />
          <Input
            label="Estimated tax withholding (%)"
            value={taxPercent}
            onChangeText={setTaxPercent}
            keyboardType="decimal-pad"
            placeholder="20"
          />
          <View style={styles.switchRow}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>Overtime enabled</Text>
            <Switch value={overtimeEnabled} onValueChange={setOvertimeEnabled} />
          </View>
          {overtimeEnabled ? (
            <>
              <Input
                label="Overtime multiplier (e.g. 1.5)"
                value={overtimeMultiplier}
                onChangeText={setOvertimeMultiplier}
                keyboardType="decimal-pad"
                placeholder="1.5"
              />
              <Input
                label="Overtime threshold (hours per week)"
                value={overtimeThreshold}
                onChangeText={setOvertimeThreshold}
                keyboardType="decimal-pad"
                placeholder="40"
              />
            </>
          ) : null}
          <Button label="Next" size="lg" onPress={() => setStep(1)} />
          <Button label="Skip and use defaults" variant="ghost" onPress={skip} />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={[typography.heading, { color: colors.text }]}>
            Add your first bill (optional)
          </Text>
          <Input
            label="Bill name"
            value={billName}
            onChangeText={setBillName}
            placeholder="Rent"
          />
          <Input
            label="Amount"
            prefix="$"
            value={billAmount}
            onChangeText={setBillAmount}
            keyboardType="decimal-pad"
            placeholder="1200.00"
          />
          <Select
            label="Category"
            value={billCategory}
            onChange={setBillCategory}
            options={BILL_CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
          <Input
            label="Due day of month (1–28)"
            value={billDueDay}
            onChangeText={setBillDueDay}
            keyboardType="number-pad"
            placeholder="1"
          />
          <Button
            label="Finish"
            size="lg"
            loading={saving}
            onPress={() => finish(true)}
          />
          <Button label="Finish without a bill" variant="ghost" onPress={() => finish(false)} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  card: {
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
