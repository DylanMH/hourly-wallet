import { Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { ClockActionButtons } from "@/components/clock/ClockActionButtons";
import { ClockStatusCard } from "@/components/clock/ClockStatusCard";
import { ShiftFormModal } from "@/components/clock/ShiftFormModal";
import { ShiftWeekList } from "@/components/clock/ShiftWeekList";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Select } from "@/components/ui/Select";
import { getJobs } from "@/db/queries/jobQueries";
import { useActiveShift } from "@/features/clock/useActiveShift";
import { useClockedInNotification } from "@/features/clock/useClockedInNotification";
import { useRecentShifts } from "@/features/clock/useShifts";
import { useNowTicker } from "@/hooks/useNowTicker";
import type { Job, Shift } from "@/lib/types";
import { useAppStore } from "@/state/appStore";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

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
  const now = useNowTicker(active, 30000);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getJobs();
      if (!cancelled) {
        setJobs(all);
        setSelectedJobId((prev) => {
          const hourly = all.filter((j) => !j.isSalaried);
          if (prev && hourly.some((j) => j.id === prev)) return prev;
          return hourly[0]?.id;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobsVersion]);

  const hourlyJobs = useMemo(() => jobs.filter((j) => !j.isSalaried), [jobs]);
  const jobNameById = useMemo(
    () => Object.fromEntries(hourlyJobs.map((j) => [j.id, j.name])),
    [hourlyJobs],
  );
  const activeJobName = shift ? jobNameById[shift.jobId] : undefined;
  const targetJobName = active
    ? activeJobName
    : jobNameById[selectedJobId ?? ""];
  const displayJobId = active ? shift?.jobId : selectedJobId;

  useClockedInNotification(shift, status, targetJobName);

  const jobOptions = hourlyJobs.map((j) => ({ label: j.name, value: j.id }));

  const filteredShifts = useMemo(
    () =>
      shifts.filter((s) => {
        if (jobNameById[s.jobId] === undefined) return false;
        return displayJobId ? s.jobId === displayJobId : true;
      }),
    [shifts, displayJobId, jobNameById],
  );

  return (
    <Screen showLogo>
      <ClockStatusCard shift={shift} status={status} jobName={targetJobName} />
      {hourlyJobs.length === 0 ? (
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, textAlign: "center" },
          ]}
        >
          Clock-in is only available for hourly jobs.
        </Text>
      ) : active ? null : (
        <Select
          label="Clock into"
          value={selectedJobId ?? ""}
          options={jobOptions}
          onChange={setSelectedJobId}
        />
      )}
      {hourlyJobs.length > 0 ? (
        <ClockActionButtons
          status={status}
          jobId={selectedJobId}
          onChanged={refresh}
        />
      ) : null}

      <SectionHeader
        title="Shift History"
        action={
          hourlyJobs.length > 0 ? (
            <Pressable
              onPress={() => {
                setEditingShift(null);
                setFormVisible(true);
              }}
              style={styles.addButton}
              hitSlop={8}
            >
              <Plus size={18} color={colors.primary} />
              <Text
                style={[typography.captionMedium, { color: colors.primary }]}
              >
                Add shift
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      <ShiftWeekList
        shifts={filteredShifts}
        now={now}
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
