import React, { useMemo } from 'react';
import {
  Transaction,
  Category,
  Account,
  Budget,
  Currency,
  Language,
  DateFilterType,
  User,
} from '../types';
import { getT } from '../utils/translations';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { playSound } from '../utils/audio';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Paperclip,
  ChevronRight,
  Edit2
} from 'lucide-react';

interface RealtimeDashboardProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  currency: Currency;
  lang: Language;
  dateFilter: DateFilterType;
  setDateFilter: (f: DateFilterType) => void;
  onOpenAddModal: () => void;
  onEditTransaction: (t: Transaction) => void;
  onNavigateToTransactions: () => void;
  onNavigateToBudgets: () => void;
  onQuickAddTransaction?: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onViewSlip?: (slipUrl: string) => void;
  currentUser?: User | null;
  onResetBalance?: () => void;
}

export const RealtimeDashboard: React.FC<RealtimeDashboardProps> = ({
  transactions,
  categories,
  accounts,
  currency,
  lang,
  dateFilter,
  setDateFilter,
  onOpenAddModal,
  onEditTransaction,
  onNavigateToTransactions,
  onViewSlip,
  currentUser,
  onResetBalance,
}) => {
  const t = getT(lang);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  // Calculate live account balances based on initial balances + all transactions
  const calculatedAccounts = useMemo(() => {
    return accounts.map(acc => {
      let balance = acc.initialBalance;
      transactions.forEach(tr => {
        if (tr.accountId === acc.id) {
          if (tr.type === 'income') balance += tr.amountInBase;
          else if (tr.type === 'expense' || tr.type === 'transfer') balance -= tr.amountInBase;
        }
        if (tr.type === 'transfer' && tr.toAccountId === acc.id) {
          balance += tr.amountInBase;
        }
      });
      return { ...acc, currentBalance: balance };
    });
  }, [accounts, transactions]);

  const totalLiquidity = useMemo(() => {
    return calculatedAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  }, [calculatedAccounts]);

  // Filter transactions for the selected dashboard timeframe
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tr => {
      if (dateFilter === 'all') return true;
      const now = new Date();
      const trDate = new Date(tr.date);

      if (dateFilter === 'today') {
        return tr.date === now.toISOString().slice(0, 10);
      }
      if (dateFilter === '7days') {
        const diff = (now.getTime() - trDate.getTime()) / (1000 * 3600 * 24);
        return diff >= 0 && diff <= 7;
      }
      if (dateFilter === 'month') {
        return trDate.getMonth() === now.getMonth() && trDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return trDate.getMonth() === lastMonth.getMonth() && trDate.getFullYear() === lastMonth.getFullYear();
      }
      if (dateFilter === 'year') {
        return trDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, dateFilter]);

  // Income, Expense, Savings metrics
  const { totalIncome, totalExpense, netSavings, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach(tr => {
      if (tr.type === 'income') inc += tr.amountInBase;
      else if (tr.type === 'expense') exp += tr.amountInBase;
    });
    const net = inc - exp;
    const rate = inc > 0 ? Math.max(0, Math.round((net / inc) * 100)) : 0;
    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: net,
      savingsRate: rate,
    };
  }, [filteredTransactions]);

  // Top spending categories
  const topCategories = useMemo(() => {
    const map = new Map<string, { categoryId: string; amount: number; count: number }>();
    filteredTransactions
      .filter(tr => tr.type === 'expense')
      .forEach(tr => {
        const cur = map.get(tr.categoryId) || { categoryId: tr.categoryId, amount: 0, count: 0 };
        cur.amount += tr.amountInBase;
        cur.count += 1;
        map.set(tr.categoryId, cur);
      });
    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  // Monthly dual-bar data (past 8 months) matching the "Visitors Statistics" in screenshot
  const monthlyBarData = useMemo(() => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const now = new Date();
    const result = [];

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const mName = monthNames[mIdx];

      let inc = 0;
      let exp = 0;

      transactions.forEach(tr => {
        const trD = new Date(tr.date);
        if (trD.getMonth() === mIdx && trD.getFullYear() === y) {
          if (tr.type === 'income') inc += tr.amountInBase;
          else if (tr.type === 'expense') exp += tr.amountInBase;
        }
      });

      result.push({
        monthName: mName,
        year: y,
        income: inc,
        expense: exp,
      });
    }

    return result;
  }, [transactions]);

  const maxBarValue = useMemo(() => {
    const highest = Math.max(
      ...monthlyBarData.map(d => Math.max(d.income, d.expense)),
      1000000
    );
    return highest * 1.15;
  }, [monthlyBarData]);

  // Donut chart segments for category expenses
  const donutSegments = useMemo(() => {
    const totalExp = topCategories.reduce((sum, c) => sum + c.amount, 0) || 1;
    let accumulatedAngle = 0;

    return topCategories.map((item, idx) => {
      const cat = catMap.get(item.categoryId);
      const percentage = Math.round((item.amount / totalExp) * 100);
      const startAngle = accumulatedAngle;
      accumulatedAngle += (item.amount / totalExp) * 360;
      return {
        ...item,
        category: cat,
        percentage,
        startAngle,
        endAngle: accumulatedAngle,
        color: cat?.color || ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][idx % 5],
      };
    });
  }, [topCategories, catMap]);

  return (
    <div className="space-y-6">
      {/* 1. HERO WAVE BANNER (Dark Sapphire Gradient, Comfortable for Eyes) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/20 text-white p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Subtle curved background wave graphics */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full object-cover" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path
              fill="#3b82f6"
              d="M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,117.3C672,117,768,171,864,197.3C960,224,1056,224,1152,197.3C1248,171,1344,117,1392,90.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-12 sm:pb-14">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{lang === 'lo' ? `ສະບາຍດີ, ${currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'ທ່ານ'}! 👋` : `Hey ${currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'there'}! 👋`}</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              {lang === 'lo'
                ? 'ຍິນດີຕ້ອນຮັບສູ່ LaoExpense Pro · ລະບົບຄຸ້ມຄອງການເງິນ, ງົບປະມານ ແລະ ລາຍຮັບ-ລາຍຈ່າຍແບບມືອາຊີບ'
                : 'We are on a mission to help you track expenses, budget smartly, and grow your savings with ease.'}
            </p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 rounded-xl backdrop-blur-md border border-white/10 self-start md:self-auto">
            {(['today', '7days', 'month', 'last_month', 'year', 'all'] as DateFilterType[]).map((f) => {
              const labels: Record<DateFilterType, { lo: string; en: string }> = {
                today: { lo: 'ມື້ນີ້', en: 'Today' },
                '7days': { lo: '7 ມື້', en: '7 Days' },
                month: { lo: 'ເດືອນນີ້', en: 'This Month' },
                last_month: { lo: 'ເດືອນແລ້ວ', en: 'Last Month' },
                year: { lo: 'ປີນີ້', en: 'Year' },
                all: { lo: 'ທັງໝົດ', en: 'All' },
                custom: { lo: 'ກຳນົດເອງ', en: 'Custom' },
              };
              const active = dateFilter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setDateFilter(f);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {labels[f][lang]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. 4 FLOATING METRIC CARDS OVERLAPPING THE BANNER (Modern Dark Luxury Cards) */}
      <div className="-mt-14 sm:-mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2 sm:px-4 relative z-20">
        {/* Card 1: Balance */}
        <div className="bg-[#0d162e] rounded-2xl p-5 border border-slate-800 shadow-xl shadow-black/30 hover:border-slate-700 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {t.totalBalance}
              </span>
              {totalLiquidity > 0 ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                  {lang === 'lo' ? 'ພ້ອມໃຊ້ງານ' : 'Available'}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700 px-1.5 py-0.5 rounded-full">
                  {lang === 'lo' ? 'ເລີ່ມຕົ້ນ 0 ₭' : 'Start 0'}
                </span>
              )}
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-slate-100 tabular-nums truncate mt-0.5">
              {formatCurrency(totalLiquidity, currency)}
            </div>
            {totalLiquidity === 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {lang === 'lo' ? 'ຍັງບໍ່ມີຍອດເງິນ (ເພີ່ມເຂົ້າມາເອງ)' : 'No balance yet (add yours)'}
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Income */}
        <div className="bg-[#0d162e] rounded-2xl p-5 border border-slate-800 shadow-xl shadow-black/30 hover:border-slate-700 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-950/70 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {t.totalIncome}
              </span>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-950/70 border border-blue-500/30 px-1.5 py-0.5 rounded-full">
                {filteredTransactions.filter(t => t.type === 'income').length} {lang === 'lo' ? 'ລາຍການ' : 'tx'}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-blue-400 tabular-nums truncate mt-0.5">
              +{formatCurrency(totalIncome, currency)}
            </div>
          </div>
        </div>

        {/* Card 3: Expense */}
        <div className="bg-[#0d162e] rounded-2xl p-5 border border-slate-800 shadow-xl shadow-black/30 hover:border-slate-700 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-950/70 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {t.totalExpense}
              </span>
              <span className="text-[10px] font-bold text-rose-400 bg-rose-950/70 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
                {filteredTransactions.filter(t => t.type === 'expense').length} {lang === 'lo' ? 'ລາຍການ' : 'tx'}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-400 tabular-nums truncate mt-0.5">
              -{formatCurrency(totalExpense, currency)}
            </div>
          </div>
        </div>

        {/* Card 4: Savings Rate */}
        <div className="bg-[#0d162e] rounded-2xl p-5 border border-slate-800 shadow-xl shadow-black/30 hover:border-slate-700 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {t.savingsRate}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                {savingsRate}%
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-slate-100 tabular-nums truncate mt-0.5">
              {formatCurrency(netSavings, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE ROW: BAR CHART (2/3) + DONUT CHART (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2/3): Dual-bar Financial Statistics */}
        <div className="lg:col-span-2 bg-[#0d162e] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {lang === 'lo' ? 'ສະຖິຕິການເງິນ (Financial Statistics)' : 'Financial Statistics'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'lo' ? 'ປຽບທຽບລາຍຮັບ-ລາຍຈ່າຍແຕ່ລະເດືອນ' : 'Monthly comparative income & expense flow'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-slate-300 font-medium">{t.income}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-sky-400" />
                <span className="text-slate-300 font-medium">{t.expense}</span>
              </div>
            </div>
          </div>

          {/* SVG Double Bar Chart matching screenshot */}
          <div className="w-full h-64 relative pt-4">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-mono text-slate-500">
              <div className="border-b border-slate-800/80 pb-1">100%</div>
              <div className="border-b border-slate-800/80 pb-1">75%</div>
              <div className="border-b border-slate-800/80 pb-1">50%</div>
              <div className="border-b border-slate-800/80 pb-1">25%</div>
              <div className="border-b border-slate-800/80 pb-1">0%</div>
            </div>

            <div className="h-full flex items-end justify-around pl-8 pr-2 relative z-10">
              {monthlyBarData.map((bar, idx) => {
                const incHeight = Math.min(100, Math.max(8, (bar.income / maxBarValue) * 100));
                const expHeight = Math.min(100, Math.max(8, (bar.expense / maxBarValue) * 100));

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 border border-slate-700 text-white text-[11px] rounded-lg p-2 shadow-2xl z-20 whitespace-nowrap">
                      <div className="font-bold text-slate-200">{bar.monthName} {bar.year}</div>
                      <div className="text-blue-400">+{formatCurrency(bar.income, currency)}</div>
                      <div className="text-rose-400">-{formatCurrency(bar.expense, currency)}</div>
                    </div>

                    {/* Dual Bars side-by-side */}
                    <div className="flex items-end gap-1.5 h-48">
                      {/* Income Bar (Solid Blue) */}
                      <div
                        style={{ height: `${incHeight}%` }}
                        className="w-3.5 sm:w-4 bg-blue-500 rounded-t-xs hover:bg-blue-400 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                      />
                      {/* Expense Bar (Sky Blue) */}
                      <div
                        style={{ height: `${expHeight}%` }}
                        className="w-3.5 sm:w-4 bg-sky-400 rounded-t-xs hover:bg-sky-300 transition-all cursor-pointer shadow-md shadow-sky-400/20"
                      />
                    </div>

                    <span className="text-xs font-semibold text-slate-400">
                      {bar.monthName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right (1/3): Customers / Expense Breakdown Donut */}
        <div className="bg-[#0d162e] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {lang === 'lo' ? 'ສັດສ່ວນລາຍຈ່າຍ (Breakdown)' : 'Expense Breakdown'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'lo' ? 'ຕາມໝວດໝູ່ທີ່ໃຊ້ຈ່າຍຫຼາຍສຸດ' : 'By category distribution'}
              </p>
            </div>
          </div>

          {/* Donut Chart matching screenshot */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="12"
                />
                {donutSegments.map((seg, i) => {
                  const circumference = 2 * Math.PI * 38;
                  const strokeLength = (seg.percentage / 100) * circumference;
                  const rotation = (seg.startAngle);

                  return (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={`${strokeLength} ${circumference}`}
                      style={{
                        transformOrigin: '50% 50%',
                        transform: `rotate(${rotation}deg)`,
                      }}
                      className="transition-all duration-500 cursor-pointer hover:opacity-85"
                    />
                  );
                })}
              </svg>

              {/* Donut Center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  {lang === 'lo' ? 'ລາຍຈ່າຍລວມ' : 'TOTAL'}
                </span>
                <span className="text-sm font-bold font-mono text-slate-100 mt-0.5">
                  {formatCurrency(totalExpense, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Clean Legend underneath matching screenshot */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            {donutSegments.slice(0, 4).map((seg, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-slate-300 truncate flex-1 font-medium">
                  {seg.category ? (lang === 'lo' ? seg.category.nameLo : seg.category.nameEn) : 'Other'}
                </span>
                <span className="text-slate-400 font-mono text-[11px] font-semibold">
                  {seg.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ROW: TOP CATEGORIES (1/3) + RECENT TRANSACTIONS TABLE (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (1/3): Top Categories matching screenshot */}
        <div className="bg-[#0d162e] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-100">
                Top Categories
              </h2>
              <button
                onClick={onNavigateToTransactions}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                {lang === 'lo' ? 'ເບິ່ງທັງໝົດ' : 'View all'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {topCategories.length} {lang === 'lo' ? 'ໝວດໝູ່' : 'categories'}, {filteredTransactions.length} {lang === 'lo' ? 'ລາຍການ' : 'entries'}
            </p>

            <div className="space-y-4">
              {topCategories.map((item, idx) => {
                const cat = catMap.get(item.categoryId);
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                        style={{ backgroundColor: cat?.color || '#3b82f6' }}
                      >
                        <CategoryIcon iconName={cat?.icon || 'HelpCircle'} className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                          {cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : 'Category'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.count} {lang === 'lo' ? 'ລາຍການເຄື່ອນໄຫວ' : 'transactions'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-100">
                        {formatCurrency(item.amount, currency)}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">
                        +{item.count}
                      </span>
                    </div>
                  </div>
                );
              })}

              {topCategories.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  {lang === 'lo' ? 'ຍັງບໍ່ມີຂໍ້ມູນລາຍຈ່າຍໃນໄລຍະນີ້' : 'No expense data for this timeframe'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right (2/3): Recent Transactions Table matching screenshot */}
        <div className="lg:col-span-2 bg-[#0d162e] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  {lang === 'lo' ? 'ລາຍການເຄື່ອນໄຫວຫຼ້າສຸດ' : 'Recent Transactions'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'lo' ? 'ບັນທຶກລາຍຮັບ-ລາຍຈ່າຍລ່າສຸດ' : 'Latest logged transactions & activity'}
                </p>
              </div>

              <button
                onClick={onNavigateToTransactions}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                <span>{lang === 'lo' ? 'ເບິ່ງທັງໝົດ' : 'See all'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table layout matching screenshot: TITLE | ACCOUNT | STATUS | DATE | ACTION */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 font-semibold">{lang === 'lo' ? 'ຊື່ລາຍການ' : 'TITLE'}</th>
                    <th className="py-2.5 font-semibold">{lang === 'lo' ? 'ບັນຊີ / ກະເປົາ' : 'ACCOUNT'}</th>
                    <th className="py-2.5 font-semibold">{lang === 'lo' ? 'ສະຖານະ' : 'STATUS'}</th>
                    <th className="py-2.5 font-semibold">{lang === 'lo' ? 'ວັນທີ' : 'DATE'}</th>
                    <th className="py-2.5 font-semibold text-right">{lang === 'lo' ? 'ຈຳນວນເງິນ' : 'AMOUNT'}</th>
                    <th className="py-2.5 font-semibold text-center">{lang === 'lo' ? 'ຈັດການ' : 'ACTION'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTransactions.slice(0, 6).map((tx) => {
                    const cat = catMap.get(tx.categoryId);
                    const acc = accMap.get(tx.accountId);
                    const isIncome = tx.type === 'income';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-850/40 transition-colors group">
                        {/* Title & Category */}
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                              style={{ backgroundColor: cat?.color || '#3b82f6' }}
                            >
                              <CategoryIcon iconName={cat?.icon || 'HelpCircle'} className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate max-w-[160px]">
                              <span className="font-semibold text-slate-100 block truncate">
                                {tx.title}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : tx.categoryId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Account */}
                        <td className="py-3 text-slate-300 font-medium whitespace-nowrap">
                          {acc ? (lang === 'lo' ? acc.nameLo : acc.nameEn) : '-'}
                        </td>

                        {/* Status Pill (Active / Pending style matching screenshot) */}
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              isIncome
                                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-950/70 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isIncome
                              ? lang === 'lo' ? 'ຮັບເງິນ' : 'Income'
                              : lang === 'lo' ? 'ຈ່າຍອອກ' : 'Expense'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {tx.date}
                        </td>

                        {/* Amount */}
                        <td className="py-3 text-right font-bold font-mono whitespace-nowrap">
                          <span className={isIncome ? 'text-emerald-400' : 'text-slate-100'}>
                            {isIncome ? '+' : '-'}
                            {formatCurrency(tx.amountInBase, currency)}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {tx.receiptUrl && onViewSlip && (
                              <button
                                type="button"
                                onClick={() => onViewSlip(tx.receiptUrl!)}
                                className="p-1 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded"
                                title="ເບິ່ງສະລິບ"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                playSound('click');
                                onEditTransaction(tx);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                              title="ແກ້ໄຂ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                        {t.noTransactions}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
