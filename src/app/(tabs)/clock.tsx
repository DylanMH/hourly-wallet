import { Plus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ClockActionButtons } from '@/components/clock/ClockActionButtons';
import { ClockStatusCard } from '@/components/clock/ClockStatusCard';
import { ShiftFormModal } from '@/components/clock/ShiftFormModal';
import { ShiftWeekList } from '@/components/clock/ShiftWeekList';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Select } from '@/components/ui/Select';
import { useActiveShift } from '@/features/clock/useActiveShift';
import { useRecentShifts } from '@/features/clock/useShifts';
import { getDefaultJob, getJobs } from '@/db/queries/jobQueries';
import type { Job, Shift } from '@/lib/types';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function ClockScreen() {
  const { colors } = useTheme();
  const { shift, status, refresh } = useActiveShift();
  const { shifts } = useRecentShifts(20);
  const [formVisible, setFormVisible] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const jobsVersion = useAppStore((s) => s.jobsVersion);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>();

  const active = shift != null && !shift.clockOut;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [all, fallback] = await Promise.all([getJobs(), getDefaultJob()]);
      if (!cancelled) {
        setJobs(all);
        setSelectedJobId((prev) => {
          if (prev && all.some((j) => j.id === prev)) return prev;
          return fallback?.id ?? all[0]?.id;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobsVersion]);

  const jobNameById = useMemo(
    () => Object.fromEntries(jobs.map((j) => [j.id, j.name])),
    [jobs]
  );
  const activeJobName = shift ? jobNameById[shift.jobId] : undefined;
  const targetJobName = active ? activeJobName : jobNameById[selectedJobId ?? ''];
  const displayJobId = active ? shift?.jobId : selectedJobId;

  const jobOptions = jobs.map((j) => ({ label: j.name, value: j.id }));

  const filteredShifts = useMemo(
    () => (displayJobId ? shifts.filter((s) => s.jobId === displayJobId) : shifts),
    [shifts, displayJobId]
  );

  return (
    <Screen showLogo>
      <ClockStatusCard shift={shift} status={status} jobName={targetJobName} />
      {active ? null : (
        <Select
          label="Clock into"
          value={selectedJobId ?? ''}
          options={jobOptions}
          onChange={setSelectedJobId}
        />
      )}
      <ClockActionButtons status={status} jobId={selectedJobId} onChanged={refresh} />

      <SectionHeader
        title="Shift History"
        action={
          <Pressable
            onPress={() => {
              setEditingShift(null);
              setFormVisible(true);
            }}
            style={styles.addButton}
            hitSlop={8}>
            <Plus size={18} color={colors.primary} />
            <Text style={[typography.captionMedium, { color: colors.primary }]}>Add shift</Text>
          </Pressable>
        }
      />
      <ShiftWeekList
        shifts={filteredShifts}
        onEdit={(s) => {
          setEditingShift(s);
          setFormVisible(true);
        }}
      />

      <ShiftFormModal
        visible={formVisible}
        shift={editingShift}
        onClose={() => {
          setFormVisible(false);
          setEditingShift(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
