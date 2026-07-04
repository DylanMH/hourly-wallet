import { isSameDay, parseISO } from 'date-fns';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActiveShiftCard } from '@/components/dashboard/ActiveShiftCard';
import { BillsDueCard } from '@/components/dashboard/BillsDueCard';
import { MonthlyAffordabilityCard } from '@/components/dashboard/MonthlyAffordabilityCard';
import { WeeklyPayCard } from '@/components/dashboard/WeeklyPayCard';
import { Screen } from '@/components/ui/Screen';
import { useBillOccurrences } from '@/features/bills/useBillOccurrences';
import { useActiveShift } from '@/features/clock/useActiveShift';
import { useShiftsInRange } from '@/features/clock/useShifts';
import {
  calculateMonthlyAffordability,
  projectMonthlyIncome,
} from '@/lib/calculations/affordability';
import {
  getBillsDueThisMonth,
  getPaidBillsThisMonth,
  getUnpaidBillsThisMonth,
  sumOccurrences,
} from '@/lib/calculations/bills';
import { calculateWeeklyPay } from '@/lib/calculations/pay';
import { calculateWorkedMinutes } from '@/lib/calculations/shifts';
import { getCurrentMonthRange, getCurrentWeekRange } from '@/lib/dates';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { shift, status, refresh } = useActiveShift();
  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  const monthRange = useMemo(() => getCurrentMonthRange(), []);
  const { shifts: weekShifts } = useShiftsInRange(weekRange);
  const { shifts: monthShifts } = useShiftsInRange(monthRange);
  const { occurrences } = useBillOccurrences();

  const now = new Date();
  const todayMinutes = monthShifts
    .filter((s) => isSameDay(parseISO(s.clockIn), now))
    .reduce((sum, s) => sum + calculateWorkedMinutes(s), 0);

  const weeklyPay = calculateWeeklyPay(weekShifts);
  const projection = projectMonthlyIncome(monthShifts);

  const dueThisMonth = getBillsDueThisMonth(occurrences);
  const totalBillsDue = sumOccurrences(dueThisMonth);
  const paidThisMonth = sumOccurrences(getPaidBillsThisMonth(occurrences));
  const remainingThisMonth = sumOccurrences(getUnpaidBillsThisMonth(occurrences));

  const affordability = calculateMonthlyAffordability(projection.projectedNet, totalBillsDue);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.text }]}>Hourly Wallet</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          All numbers are estimates
        </Text>
      </View>

      <ActiveShiftCard
        shift={shift}
        status={status}
        todayMinutes={todayMinutes}
        onChanged={refresh}
      />
      <WeeklyPayCard pay={weeklyPay} />
      <MonthlyAffordabilityCard affordability={affordability} netSoFar={projection.netSoFar} />
      <BillsDueCard occurrences={occurrences} />

      <View style={styles.footerRow}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Bills this month: paid {`$${paidThisMonth.toFixed(2)}`} · remaining{' '}
          {`$${remainingThisMonth.toFixed(2)}`} of {`$${totalBillsDue.toFixed(2)}`}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
    marginBottom: spacing.xs,
  },
  footerRow: {
    paddingHorizontal: spacing.xs,
  },
});
