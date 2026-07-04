import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BillCard } from '@/components/bills/BillCard';
import { sumOccurrences } from '@/lib/calculations/bills';
import { formatCurrency } from '@/lib/money';
import type { BillOccurrenceWithBill } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BillMonthListProps = {
  occurrences: BillOccurrenceWithBill[];
  onTogglePaid: (occurrence: BillOccurrenceWithBill) => void;
  onEdit: (occurrence: BillOccurrenceWithBill) => void;
  onDelete: (occurrence: BillOccurrenceWithBill) => void;
};

function monthKey(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM');
}

function monthLabel(iso: string): string {
  return format(parseISO(iso), 'MMMM yyyy');
}

export function BillMonthList({
  occurrences,
  onTogglePaid,
  onEdit,
  onDelete,
}: BillMonthListProps) {
  const { colors } = useTheme();
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([currentMonthKey]));

  const groups = useMemo(() => {
    const map = new Map<string, BillOccurrenceWithBill[]>();
    const sorted = [...occurrences].sort(
      (a, b) => parseISO(b.dueDate).getTime() - parseISO(a.dueDate).getTime()
    );
    for (const occ of sorted) {
      const key = monthKey(occ.dueDate);
      const list = map.get(key) ?? [];
      list.push(occ);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1));
  }, [occurrences]);

  if (groups.length === 0) {
    return null;
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <View style={styles.container}>
      {groups.map(([key, items]) => {
        const total = sumOccurrences(items);
        const isExpanded = expanded.has(key);
        return (
          <View key={key} style={styles.group}>
            <Pressable
              style={[styles.header, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              onPress={() => toggle(key)}>
              <View style={styles.headerLeft}>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>{monthLabel(items[0].dueDate)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {items.length} bill{items.length === 1 ? '' : 's'} · {formatCurrency(total)}
                </Text>
              </View>
              {isExpanded ? (
                <ChevronDown size={20} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={20} color={colors.textSecondary} />
              )}
            </Pressable>

            {isExpanded ? (
              <View style={styles.items}>
                {items.map((occ) => (
                  <BillCard
                    key={occ.id}
                    occurrence={occ}
                    onTogglePaid={onTogglePaid}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
  },
  headerLeft: {
    gap: 2,
  },
  items: {
    gap: spacing.sm,
  },
});
