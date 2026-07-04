import { router } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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
import { getDefaultJob, updateJob } from '@/db/queries/jobQueries';
import { hapticSuccess } from '@/lib/haptics';
import { BILL_CATEGORIES, BillCategory, PayPeriod, SalaryPeriod } from '@/lib/types';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const PAY_PERIODS: { label: string; value: PayPeriod }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Semi-monthly', value: 'semi-monthly' },
  { label: 'Monthly', value: 'monthly' },
];

const SALARY_PERIODS: { label: string; value: SalaryPeriod }[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const bumpJobs = useAppStore((s) => s.bumpJobs);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [jobName, setJobName] = useState('');
  const [isSalaried, setIsSalaried] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod>('monthly');
  const [hourlyRate, setHourlyRate] = useState('15');
  const [taxPercent, setTaxPercent] = useState('20');
  const [payPeriod, setPayPeriod] = useState<PayPeriod>('weekly');
  const [overtimeEnabled, setOvertimeEnabled] = useState(true);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.5');
  const [overtimeThreshold, setOvertimeThreshold] = useState('40');
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState('5');

  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCategory, setBillCategory] = useState<BillCategory>('Mortgage / Rent');
  const [billDueDay, setBillDueDay] = useState('1');

  const salaryValue = parseFloat(salaryAmount) || 0;
  const hourlyValue = parseFloat(hourlyRate) || 0;
  const jobStepValid =
    jobName.trim().length > 0 && (isSalaried ? salaryValue > 0 : hourlyValue > 0);

  const derivedHourlyRate = useMemo(() => {
    if (!isSalaried) return hourlyValue;
    const annual = salaryPeriod === 'yearly' ? salaryValue : salaryValue * 12;
    const days = Math.min(7, Math.max(1, parseInt(workDaysPerWeek, 10) || 5));
    return annual / (days * 8 * 52);
  }, [isSalaried, salaryValue, salaryPeriod, hourlyValue, workDaysPerWeek]);

  async function finish(withBill: boolean) {
    if (saving || !jobStepValid) return;
    setSaving(true);
    try {
      const job = await getDefaultJob();
      if (!job) {
        throw new Error('No default job found. Please restart the app.');
      }
      const daysPerWeek = Math.min(7, Math.max(1, parseInt(workDaysPerWeek, 10) || 5));
      const updatedJob = {
        ...job,
        name: jobName.trim(),
        isSalaried,
        salaryAmount: isSalaried ? salaryValue : 0,
        salaryPeriod,
        hourlyRate: isSalaried ? derivedHourlyRate : parseFloat(hourlyRate) || 15,
        taxPercent: parseFloat(taxPercent) || 20,
        payPeriod,
        overtimeEnabled: isSalaried ? false : overtimeEnabled,
        overtimeMultiplier: parseFloat(overtimeMultiplier) || 1.5,
        overtimeThresholdHours: parseFloat(overtimeThreshold) || 40,
        workDaysPerWeek: daysPerWeek,
      };
      await updateJob(updatedJob);
      bumpJobs();
      await savePaySettings({
        hourlyRate: updatedJob.hourlyRate,
        taxPercent: updatedJob.taxPercent,
        payPeriod: updatedJob.payPeriod,
        overtimeEnabled: updatedJob.overtimeEnabled,
        overtimeMultiplier: updatedJob.overtimeMultiplier,
        overtimeThresholdHours: updatedJob.overtimeThresholdHours,
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
          <Text style={[typography.heading, { color: colors.text }]}>Add your first job</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            You need at least one job before you can start tracking shifts.
          </Text>
          <Input
            label="Job name"
            value={jobName}
            onChangeText={setJobName}
            placeholder="Barista, Delivery, etc."
          />
          <View style={styles.switchRow}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>Salaried job</Text>
            <Switch value={isSalaried} onValueChange={setIsSalaried} />
          </View>
          {isSalaried ? (
            <>
              <Input
                label="Salary amount"
                prefix="$"
                value={salaryAmount}
                onChangeText={setSalaryAmount}
                keyboardType="decimal-pad"
                placeholder="50000.00"
              />
              <Select
                label="Salary period"
                value={salaryPeriod}
                onChange={(v) => setSalaryPeriod(v as SalaryPeriod)}
                options={SALARY_PERIODS}
              />
            </>
          ) : (
            <Input
              label="Hourly rate"
              prefix="$"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="decimal-pad"
              placeholder="15.00"
            />
          )}
          <Input
            label="Work days per week (1–7)"
            value={workDaysPerWeek}
            onChangeText={setWorkDaysPerWeek}
            keyboardType="number-pad"
            placeholder="5"
          />
          <Input
            label="Estimated tax withholding (%)"
            value={taxPercent}
            onChangeText={setTaxPercent}
            keyboardType="decimal-pad"
            placeholder="20"
          />
          <Select
            label="Pay period"
            value={payPeriod}
            onChange={setPayPeriod}
            options={PAY_PERIODS}
          />
          {!isSalaried ? (
            <View style={styles.switchRow}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>Overtime enabled</Text>
              <Switch value={overtimeEnabled} onValueChange={setOvertimeEnabled} />
            </View>
          ) : null}
          {overtimeEnabled && !isSalaried ? (
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
          <Button
            label="Next"
            size="lg"
            disabled={!jobStepValid}
            onPress={() => setStep(1)}
          />
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
