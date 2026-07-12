import { isSameDay, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { getJobs } from "@/db/queries/jobQueries";
import { useBillOccurrences } from "@/features/bills/useBillOccurrences";
import { useActiveShift } from "@/features/clock/useActiveShift";
import { useShiftsInRange } from "@/features/clock/useShifts";
import { useNowTicker } from "@/hooks/useNowTicker";
import {
    calculateMonthlyAffordability,
    projectMonthlyIncome,
} from "@/lib/calculations/affordability";
import {
    getBillsDueThisMonth,
    getPaidBillsThisMonth,
    getUnpaidBillsThisMonth,
    sumOccurrences,
} from "@/lib/calculations/bills";
import { calculateWeeklyPay, PayBreakdown } from "@/lib/calculations/pay";
import { calculateWeeklyPayForSalary } from "@/lib/calculations/salary";
import { calculateWorkedMinutes } from "@/lib/calculations/shifts";
import { getCurrentMonthRange, getCurrentWeekRange } from "@/lib/dates";
import type { Job, Shift } from "@/lib/types";
import { useAppStore } from "@/state/appStore";

const ALL_JOBS = "all";

export type DashboardData = {
  loading: boolean;
  shift: Shift | null;
  active: boolean;
  jobs: Job[];
  selectedJobId: string;
  selectedJob: Job | undefined;
  jobName: string | undefined;
  now: Date;
  todayMinutes: number;
  currentShiftMinutes: number;
  weeklyPay: ReturnType<typeof calculateWeeklyPay>;
  monthlyProjection: ReturnType<typeof projectMonthlyIncome>;
  affordability: ReturnType<typeof calculateMonthlyAffordability>;
  totalBillsDue: number;
  billsPaidAmount: number;
  billsRemainingAmount: number;
  occurrences: import("@/lib/types").BillOccurrenceWithBill[];
};

export function useDashboardData(selectedJobId: string): DashboardData {
  const { shift } = useActiveShift();
  const active = shift != null && !shift.clockOut;
  // Tick every 30s while there is an active shift so the dashboard estimates
  // update as the user works. Non-active dashboards still refresh on foreground.
  const now = useNowTicker(active, 30000);

  const weekRange = useMemo(() => getCurrentWeekRange(now), [now]);
  const monthRange = useMemo(() => getCurrentMonthRange(now), [now]);
  const { shifts: allWeekShifts, loading: weekLoading } =
    useShiftsInRange(weekRange);
  const { shifts: allMonthShifts, loading: monthLoading } =
    useShiftsInRange(monthRange);
  const { occurrences, loading: billsLoading } = useBillOccurrences();

  const jobsVersion = useAppStore((s) => s.jobsVersion);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getJobs();
      if (!cancelled) {
        setJobs(all);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobsVersion]);

  // If the selected job was deleted, fall back to All jobs so the dashboard
  // never points at a missing job.
  const effectiveSelectedJobId =
    selectedJobId === ALL_JOBS || jobs.some((j) => j.id === selectedJobId)
      ? selectedJobId
      : ALL_JOBS;

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === effectiveSelectedJobId),
    [jobs, effectiveSelectedJobId],
  );
  const jobName =
    selectedJob?.name ??
    (effectiveSelectedJobId === ALL_JOBS ? "All jobs" : undefined);

  const weekShifts = useMemo(
    () =>
      effectiveSelectedJobId === ALL_JOBS
        ? allWeekShifts
        : allWeekShifts.filter((s) => s.jobId === effectiveSelectedJobId),
    [allWeekShifts, effectiveSelectedJobId],
  );
  const monthShifts = useMemo(
    () =>
      effectiveSelectedJobId === ALL_JOBS
        ? allMonthShifts
        : allMonthShifts.filter((s) => s.jobId === effectiveSelectedJobId),
    [allMonthShifts, effectiveSelectedJobId],
  );

  const todayMinutes = useMemo(
    () =>
      monthShifts
        .filter((s) => isSameDay(parseISO(s.clockIn), now))
        .reduce((sum, s) => sum + calculateWorkedMinutes(s, now), 0),
    [monthShifts, now],
  );

  const currentShiftMinutes = useMemo(
    () => (active && shift ? calculateWorkedMinutes(shift, now) : 0),
    [active, shift, now],
  );

  const weeklyPay = useMemo(() => {
    if (selectedJob?.isSalaried) {
      return calculateWeeklyPayForSalary(selectedJob);
    }
    if (effectiveSelectedJobId === ALL_JOBS) {
      const empty: PayBreakdown = {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        regularEarnings: 0,
        overtimeEarnings: 0,
        grossPay: 0,
        estimatedTaxes: 0,
        estimatedNetPay: 0,
      };
      return jobs.reduce((acc, job) => {
        if (job.isSalaried) {
          const salary = calculateWeeklyPayForSalary(job);
          acc.totalHours += salary.totalHours;
          acc.regularHours += salary.regularHours;
          acc.regularEarnings += salary.regularEarnings;
          acc.overtimeEarnings += salary.overtimeEarnings;
          acc.grossPay += salary.grossPay;
          acc.estimatedTaxes += salary.estimatedTaxes;
          acc.estimatedNetPay += salary.estimatedNetPay;
        } else {
          const jobShifts = weekShifts.filter((s) => s.jobId === job.id);
          const pay = calculateWeeklyPay(jobShifts, now);
          acc.totalHours += pay.totalHours;
          acc.regularHours += pay.regularHours;
          acc.overtimeHours += pay.overtimeHours;
          acc.regularEarnings += pay.regularEarnings;
          acc.overtimeEarnings += pay.overtimeEarnings;
          acc.grossPay += pay.grossPay;
          acc.estimatedTaxes += pay.estimatedTaxes;
          acc.estimatedNetPay += pay.estimatedNetPay;
        }
        return acc;
      }, empty);
    }
    return calculateWeeklyPay(weekShifts, now);
  }, [weekShifts, jobs, selectedJob, effectiveSelectedJobId, now]);

  const monthlyProjection = useMemo(
    () => projectMonthlyIncome(monthShifts, jobs, effectiveSelectedJobId, now),
    [monthShifts, jobs, effectiveSelectedJobId, now],
  );

  const totalBillsDue = useMemo(
    () => sumOccurrences(getBillsDueThisMonth(occurrences, now)),
    [occurrences, now],
  );
  const billsPaidAmount = useMemo(
    () => sumOccurrences(getPaidBillsThisMonth(occurrences, now)),
    [occurrences, now],
  );
  const billsRemainingAmount = useMemo(
    () => sumOccurrences(getUnpaidBillsThisMonth(occurrences, now)),
    [occurrences, now],
  );
  const affordability = useMemo(
    () =>
      calculateMonthlyAffordability(
        monthlyProjection.projectedNet,
        totalBillsDue,
      ),
    [monthlyProjection, totalBillsDue],
  );

  const loading =
    weekLoading || monthLoading || billsLoading || jobs.length === 0;

  return {
    loading,
    shift,
    active,
    jobs,
    selectedJobId: effectiveSelectedJobId,
    selectedJob,
    jobName,
    now,
    todayMinutes,
    currentShiftMinutes,
    weeklyPay,
    monthlyProjection,
    affordability,
    totalBillsDue,
    billsPaidAmount,
    billsRemainingAmount,
    occurrences,
  };
}
