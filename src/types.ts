export type TransactionType = 'income' | 'expense' | 'transfer';

export type Currency = 'LAK' | 'THB' | 'USD';

export interface User {
  id: string;
  username: string; // username or login name
  phone: string; // phone number e.g. 020 99887766
  fullName: string; // display name
  password: string;
  avatarColor: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  amountInBase: number; // Converted to LAK base
  categoryId: string;
  accountId: string;
  toAccountId?: string; // used when type === 'transfer'
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  note?: string;
  receiptUrl?: string; // base64 or object URL of slip / receipt image
  createdAt: number;
}

export type LaoFontStyle = 'modern' | 'looped';
export type AppFontSize = 'normal' | 'large';

export interface Category {
  id: string;
  userId?: string;
  nameLo: string;
  nameEn: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface Account {
  id: string;
  userId?: string;
  nameLo: string;
  nameEn: string;
  type: 'bank' | 'cash' | 'savings' | 'wallet';
  initialBalance: number;
  currency: Currency;
  accountNumber?: string;
  color: string;
}

export interface Budget {
  id: string;
  userId?: string;
  categoryId: string;
  amount: number; // in LAK
  period: 'monthly';
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  userId?: string;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  currency: Currency;
  amountInBase: number;
  categoryId: string;
  accountId: string;
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  nextRunDate: string; // YYYY-MM-DD
  lastRunDate?: string; // YYYY-MM-DD
  active: boolean;
  autoPost: boolean;
  note?: string;
  createdAt: number;
}

export interface ExchangeRates {
  LAK: number; // always 1
  THB: number; // e.g. 640 LAK per 1 THB
  USD: number; // e.g. 22,000 LAK per 1 USD
}

export type Language = 'lo' | 'en';

export type DateFilterType = 'today' | '7days' | 'month' | 'last_month' | 'year' | 'all' | 'custom';

export interface FilterState {
  search: string;
  type: 'all' | TransactionType;
  categoryId: string;
  accountId: string;
  dateFilter: DateFilterType;
  startDate?: string;
  endDate?: string;
}
