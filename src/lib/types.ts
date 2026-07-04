export type PayPeriod = 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';

export type PaySettings = {
  id: string;
  hourlyRate: number;
  overtimeEnabled: boolean;
  overtimeMultiplier: number;
  overtimeThresholdHours: number;
  taxPercent: number;
  defaultLunchMinutes: number;
  defaultBreakMinutes: number;
  breakPaidByDefault: boolean;
  holidayPayInOvertime: boolean;
  allowPTOInOvertime: boolean;
  payPeriod: PayPeriod;
  currency: 'USD';
  createdAt: string;
  updatedAt: string;
};

export type ShiftBreak = {
  id: string;
  start: string;
  end?: string;
  paid: boolean;
};

export type Shift = {
  id: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  lunchStart?: string;
  lunchEnd?: string;
  breaks: ShiftBreak[];
  notes?: string;
  isHolidayPay: boolean;
  isPTO: boolean;
  hourlyRateSnapshot: number;
  overtimeEnabledSnapshot: boolean;
  overtimeMultiplierSnapshot: number;
  overtimeThresholdSnapshot: number;
  taxPercentSnapshot: number;
  holidayPayInOvertimeSnapshot: boolean;
  ptoInOvertimeSnapshot: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BillCategory =
  | 'Mortgage / Rent'
  | 'Car'
  | 'Insurance'
  | 'Phone'
  | 'Internet'
  | 'Utilities'
  | 'Credit Card'
  | 'Food'
  | 'Subscription'
  | 'Loan'
  | 'Other';

export const BILL_CATEGORIES: BillCategory[] = [
  'Mortgage / Rent',
  'Car',
  'Insurance',
  'Phone',
  'Internet',
  'Utilities',
  'Credit Card',
  'Food',
  'Subscription',
  'Loan',
  'Other',
];

export type BillRecurrence =
  | 'one-time'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'yearly';

export const BILL_RECURRENCES: BillRecurrence[] = [
  'one-time',
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
];

export type Bill = {
  id: string;
  name: string;
  amount: number;
  category: BillCategory;
  recurrence: BillRecurrence;
  dueDay?: number;
  dueDate?: string;
  autopay: boolean;
  reminderEnabled: boolean;
  reminderDaysBefore?: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BillOccurrence = {
  id: string;
  billId: string;
  dueDate: string;
  amountSnapshot: number;
  paid: boolean;
  paidAt?: string;
  autopaid: boolean;
  notificationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type BillOccurrenceWithBill = BillOccurrence & {
  bill: Bill;
};

export type ClockStatus = 'not-clocked-in' | 'clocked-in' | 'on-lunch' | 'on-break';

export type ThemePreference = 'system' | 'light' | 'dark';
