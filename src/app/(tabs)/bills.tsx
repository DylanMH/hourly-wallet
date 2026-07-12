import { Plus, ReceiptText } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BillFormModal } from "@/components/bills/BillFormModal";
import { BillMonthList } from "@/components/bills/BillMonthList";
import { BillsOverviewList } from "@/components/bills/BillsOverviewList";
import { BillsSummaryCard } from "@/components/bills/BillsSummaryCard";
import { BillsByCategoryPieChart } from "@/components/reports/BillsByCategoryPieChart";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import { getBills, getPaidOccurrenceYears } from "@/db/queries/billQueries";
import {
    generateAllOccurrencesUntil,
    removeBill,
    setOccurrencePaid,
} from "@/features/bills/billService";
import { useBillOccurrences } from "@/features/bills/useBillOccurrences";
import { usePaidBillsInRange } from "@/features/bills/usePaidBillsInRange";
import { useNowTicker } from "@/hooks/useNowTicker";
import { hapticSuccess, hapticWarning } from "@/lib/haptics";
import type { Bill, BillOccurrenceWithBill } from "@/lib/types";
import { useAppStore } from "@/state/appStore";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";
import { endOfYear, startOfYear } from "date-fns";

type BillsTab = "overview" | "unpaid" | "paid";

const TABS: { value: BillsTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

export default function BillsScreen() {
  const { colors } = useTheme();
  const now = useNowTicker(true, 60000);
  const { occurrences } = useBillOccurrences(3, 12);
  const [activeTab, setActiveTab] = useState<BillsTab>("overview");
  const currentYear = now.getFullYear();
  const [paidYear, setPaidYear] = useState<string>(String(currentYear));
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const billsVersion = useAppStore((s) => s.billsVersion);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const created = await generateAllOccurrencesUntil();
      const years = await getPaidOccurrenceYears();
      if (cancelled) return;
      setAvailableYears(years);
      setPaidYear((prev) =>
        years.length > 0 && !years.includes(Number(prev))
          ? String(years[0])
          : prev,
      );
      if (created > 0) {
        useAppStore.getState().bumpBills();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [billsVersion]);

  const [bills, setBills] = useState<Bill[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getBills();
      if (!cancelled) setBills(all);
    })();
    return () => {
      cancelled = true;
    };
  }, [billsVersion]);

  const [formVisible, setFormVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<BillOccurrenceWithBill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const paidRange = useMemo(() => {
    const year = Number(paidYear);
    return {
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1)),
    };
  }, [paidYear]);
  const { occurrences: paidOccurrences } = usePaidBillsInRange(paidRange);

  const currentYearKey = String(currentYear);
  const billsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const bill of bills) {
      map.set(bill.category, (map.get(bill.category) ?? 0) + bill.amount);
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [bills]);

  const filteredBills = useMemo(() => {
    if (!selectedCategory) return bills;
    return bills.filter((b) => b.category === selectedCategory);
  }, [bills, selectedCategory]);

  const filtered = useMemo(() => {
    if (activeTab === "overview") return [];
    if (activeTab === "unpaid") {
      return occurrences.filter((o) => {
        if (o.paid) return false;
        const year = o.dueDate.slice(0, 4);
        return year === currentYearKey;
      });
    }
    return paidOccurrences;
  }, [occurrences, activeTab, paidOccurrences, currentYearKey]);

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
      hitSlop={8}
    >
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
              ]}
            >
              <Text
                style={[
                  typography.bodyMedium,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "paid" && availableYears.length > 0 && (
        <Select
          label="Year"
          value={paidYear}
          options={availableYears.map((y) => ({
            label: String(y),
            value: String(y),
          }))}
          onChange={setPaidYear}
        />
      )}

      {activeTab === "overview" ? (
        <View style={{ gap: spacing.md }}>
          {billsByCategory.length > 0 && (
            <>
              <BillsByCategoryPieChart
                data={billsByCategory}
                onSelect={(category) =>
                  setSelectedCategory((prev) =>
                    prev === category ? null : category,
                  )
                }
                emptyLabel="No bills to show."
                title="Total Bills"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                <Pressable
                  onPress={() => setSelectedCategory(null)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: !selectedCategory
                        ? colors.primary
                        : colors.surface,
                      borderColor: !selectedCategory
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.captionMedium,
                      {
                        color: !selectedCategory
                          ? colors.onPrimary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {billsByCategory.map(({ category }) => {
                  const active = selectedCategory === category;
                  return (
                    <Pressable
                      key={category}
                      onPress={() =>
                        setSelectedCategory((prev) =>
                          prev === category ? null : category,
                        )
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.captionMedium,
                          {
                            color: active
                              ? colors.onPrimary
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
          <BillsOverviewList
            bills={filteredBills}
            onEdit={(bill) => {
              setEditingBill(bill);
              setFormVisible(true);
            }}
            onDelete={setDeletingBill}
          />
        </View>
      ) : filtered.length === 0 ? (
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
          key={activeTab}
          occurrences={filtered}
          sortOrder={activeTab === "unpaid" ? "asc" : "desc"}
          groupBy={activeTab === "paid" ? "paidAt" : "dueDate"}
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
            : ""
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

      <ConfirmModal
        visible={deletingBill != null}
        title="Delete bill?"
        message={
          deletingBill
            ? `This deletes "${deletingBill.name}" and all of its occurrences.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deletingBill) {
            await removeBill(deletingBill.id);
            hapticWarning();
          }
          setDeletingBill(null);
        }}
        onCancel={() => setDeletingBill(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
  },
});
