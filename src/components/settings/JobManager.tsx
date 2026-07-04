import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  deleteJob,
  ensureDefaultJob,
  getJobs,
  insertJob,
  setDefaultJob,
  updateJob,
} from '@/db/queries/jobQueries';
import { hapticSuccess } from '@/lib/haptics';
import type { Job, PayPeriod, SalaryPeriod } from '@/lib/types';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
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

const emptyJob = (): Omit<Job, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '',
  isDefault: false,
  isSalaried: false,
  salaryAmount: 0,
  salaryPeriod: 'monthly',
  hourlyRate: 15,
  overtimeEnabled: true,
  overtimeMultiplier: 1.5,
  overtimeThresholdHours: 40,
  taxPercent: 20,
  defaultLunchMinutes: 30,
  defaultBreakMinutes: 15,
  breakPaidByDefault: true,
  holidayPayInOvertime: false,
  allowPTOInOvertime: false,
  payPeriod: 'weekly',
  workDaysPerWeek: 5,
  currency: 'USD',
});

export function JobManager() {
  const { colors } = useTheme();
  const bumpSettings = useAppStore((s) => s.bumpSettings);
  const bumpJobs = useAppStore((s) => s.bumpJobs);
  const jobsVersion = useAppStore((s) => s.jobsVersion);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState<Job | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const all = await getJobs();
    setJobs(all);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getJobs();
      if (!cancelled) setJobs(all);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobsVersion]);

  async function handleSave(job: Job) {
    setLoading(true);
    try {
      if (job.id) {
        await updateJob(job);
      } else {
        await insertJob(job);
      }
      if (job.isDefault) {
        await setDefaultJob(job.id);
      }
      await ensureDefaultJob();
      hapticSuccess();
      bumpSettings();
      bumpJobs();
      setEditing(null);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSetDefault(job: Job) {
    await setDefaultJob(job.id);
    bumpJobs();
    await refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteJob(confirmDelete.id);
      await ensureDefaultJob();
      bumpJobs();
      hapticSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete job.';
      Alert.alert('Couldn’t delete job', message);
    } finally {
      setConfirmDelete(null);
      await refresh();
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={[typography.heading, { color: colors.text }]}>Jobs</Text>
      {jobs.map((job) => (
        <View key={job.id} style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.info}>
            <Text style={[typography.bodyMedium, { color: colors.text }]}>{job.name}</Text>
            {job.isDefault ? (
              <Text style={[typography.caption, { color: colors.primary }]}>Default</Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            {!job.isDefault ? (
              <Button
                label="Set default"
                variant="ghost"
                size="sm"
                onPress={() => handleSetDefault(job)}
              />
            ) : null}
            <Button label="Edit" variant="secondary" size="sm" onPress={() => setEditing(job)} />
            <Button
              label="Delete"
              variant="danger"
              size="sm"
              onPress={() => setConfirmDelete(job)}
            />
          </View>
        </View>
      ))}
      <Button
    label="Add job"
    variant="secondary"
    onPress={() => setEditing({ ...emptyJob(), id: '', createdAt: '', updatedAt: '' })}
  />

      <Modal
        visible={editing !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {editing ? (
              <JobEditor
                job={editing}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
                loading={loading}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmDelete !== null}
        title="Delete job?"
        message="This will permanently delete the job. Any existing shifts will be moved to the remaining default job."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </Card>
  );
}

type JobEditorProps = {
  job: Job;
  onSave: (job: Job) => void;
  onCancel: () => void;
  loading: boolean;
};

function JobEditor({ job, onSave, onCancel, loading }: JobEditorProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(job.name || '');
  const [isSalaried, setIsSalaried] = useState(job.isSalaried);
  const [salaryAmount, setSalaryAmount] = useState(String(job.salaryAmount));
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod>(job.salaryPeriod);
  const [hourlyRate, setHourlyRate] = useState(String(job.hourlyRate));
  const [taxPercent, setTaxPercent] = useState(String(job.taxPercent));
  const [overtimeEnabled, setOvertimeEnabled] = useState(job.overtimeEnabled);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(String(job.overtimeMultiplier));
  const [overtimeThreshold, setOvertimeThreshold] = useState(String(job.overtimeThresholdHours));
  const [defaultLunch, setDefaultLunch] = useState(String(job.defaultLunchMinutes));
  const [defaultBreak, setDefaultBreak] = useState(String(job.defaultBreakMinutes));
  const [breakPaid, setBreakPaid] = useState(job.breakPaidByDefault);
  const [holidayPayInOvertime, setHolidayPayInOvertime] = useState(job.holidayPayInOvertime);
  const [allowPTOInOvertime, setAllowPTOInOvertime] = useState(job.allowPTOInOvertime);
  const [payPeriod, setPayPeriod] = useState<PayPeriod>(job.payPeriod);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(String(job.workDaysPerWeek));
  const [isDefault, setIsDefault] = useState(job.isDefault);
  const [error, setError] = useState('');

  function save() {
    if (!name.trim()) {
      setError('Job name is required.');
      return;
    }
    onSave({
      ...job,
      name: name.trim(),
      isDefault,
      isSalaried,
      salaryAmount: parseFloat(salaryAmount) || 0,
      salaryPeriod,
      hourlyRate: parseFloat(hourlyRate) || job.hourlyRate,
      taxPercent: parseFloat(taxPercent) || 0,
      overtimeEnabled: isSalaried ? false : overtimeEnabled,
      overtimeMultiplier: parseFloat(overtimeMultiplier) || 1.5,
      overtimeThresholdHours: parseFloat(overtimeThreshold) || 40,
      defaultLunchMinutes: parseInt(defaultLunch, 10) || 30,
      defaultBreakMinutes: parseInt(defaultBreak, 10) || 15,
      breakPaidByDefault: breakPaid,
      holidayPayInOvertime,
      allowPTOInOvertime,
      payPeriod,
      workDaysPerWeek: Math.min(7, Math.max(1, parseInt(workDaysPerWeek, 10) || 5)),
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
      <Text style={[typography.heading, { color: colors.text }]}>
        {job.id ? 'Edit job' : 'New job'}
      </Text>
      <Input label="Job name" value={name} onChangeText={setName} placeholder="e.g. Barista" />
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
        />
      )}
      <Input
        label="Work days per week (1–7)"
        value={workDaysPerWeek}
        onChangeText={setWorkDaysPerWeek}
        keyboardType="number-pad"
      />
      <Input
        label="Estimated tax withholding (%)"
        value={taxPercent}
        onChangeText={setTaxPercent}
        keyboardType="decimal-pad"
      />
      {!isSalaried ? (
        <View style={styles.switchRow}>
          <Text style={[typography.bodyMedium, { color: colors.text }]}>Overtime enabled</Text>
          <Switch value={overtimeEnabled} onValueChange={setOvertimeEnabled} />
        </View>
      ) : null}
      {overtimeEnabled && !isSalaried ? (
        <>
          <Select
            label="Overtime multiplier"
            value={
              overtimeMultiplier === '1.5' || overtimeMultiplier === '2' ? overtimeMultiplier : 'custom'
            }
            onChange={(v) => {
              if (v !== 'custom') setOvertimeMultiplier(v);
            }}
            options={[
              { label: '1.5x', value: '1.5' },
              { label: '2x', value: '2' },
              { label: `Custom (${overtimeMultiplier}x)`, value: 'custom' },
            ]}
          />
          <Input
            label="Custom multiplier"
            value={overtimeMultiplier}
            onChangeText={setOvertimeMultiplier}
            keyboardType="decimal-pad"
          />
          <Input
            label="Overtime threshold (hours/week)"
            value={overtimeThreshold}
            onChangeText={setOvertimeThreshold}
            keyboardType="decimal-pad"
          />
        </>
      ) : null}
      <Input
        label="Default unpaid lunch (minutes)"
        value={defaultLunch}
        onChangeText={setDefaultLunch}
        keyboardType="number-pad"
      />
      <Input
        label="Default break (minutes)"
        value={defaultBreak}
        onChangeText={setDefaultBreak}
        keyboardType="number-pad"
      />
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>Breaks paid by default</Text>
        <Switch value={breakPaid} onValueChange={setBreakPaid} />
      </View>
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          Holiday pay counts toward overtime
        </Text>
        <Switch value={holidayPayInOvertime} onValueChange={setHolidayPayInOvertime} />
      </View>
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>PTO counts toward overtime</Text>
        <Switch value={allowPTOInOvertime} onValueChange={setAllowPTOInOvertime} />
      </View>
      <Select label="Pay period" value={payPeriod} onChange={setPayPeriod} options={PAY_PERIODS} />
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>Default job</Text>
        <Switch value={isDefault} onValueChange={setIsDefault} />
      </View>
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button label="Save" loading={loading} onPress={save} />
      <Button label="Cancel" variant="ghost" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
  },
  sheetContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
