import React, { useState, useMemo } from 'react';
import { Transaction, Category, Account, Currency, Language } from '../types';
import { getT } from '../utils/translations';
import { formatCurrency, formatDate, exportTransactionsToCSV } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { playSound } from '../utils/audio';
import { Printer, Download, TrendingUp, TrendingDown, Award, PieChart, ShieldCheck } from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  currency: Currency;
  lang: Language;
  onOpenPrintModal?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  accounts,
  currency,
  lang,
  onOpenPrintModal,
}) => {
  const t = getT(lang);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Filter by year
  const yearlyTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedYear));
  }, [transactions, selectedYear]);

  // Compute monthly data for the year
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      return {
        month: monthNum,
        monthName: lang === 'lo' ? ['ມ.ກ', 'ກ.ພ', 'ມ.ນ', 'ເມ.ສ', 'ພ.ພ', 'ມິ.ຖ', 'ກ.ລ', 'ສ.ຫ', 'ກ.ຍ', 'ຕ.ລ', 'ພ.ຈ', 'ທ.ວ'][i] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        income: 0,
        expense: 0,
      };
    });

    yearlyTransactions.forEach(tr => {
      const mIdx = parseInt(tr.date.slice(5, 7), 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        if (tr.type === 'income') months[mIdx].income += tr.amountInBase;
        else if (tr.type === 'expense') months[mIdx].expense += tr.amountInBase;
      }
    });

    return months;
  }, [yearlyTransactions, lang]);

  // Category ranking
  const categoryRankings = useMemo(() => {
    const map = new Map<string, number>();
    let totalExpense = 0;

    yearlyTransactions.forEach(tr => {
      if (tr.type === 'expense') {
        const cur = map.get(tr.categoryId) || 0;
        map.set(tr.categoryId, cur + tr.amountInBase);
        totalExpense += tr.amountInBase;
      }
    });

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = catMap.get(catId);
        return {
          id: catId,
          name: cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : catId,
          icon: cat?.icon || 'HelpCircle',
          color: cat?.color || '#3b82f6',
          amount,
          percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [yearlyTransactions, catMap, lang]);

  // Overall totals
  let totalIncome = 0;
  let totalExpense = 0;
  yearlyTransactions.forEach(tr => {
    if (tr.type === 'income') totalIncome += tr.amountInBase;
    if (tr.type === 'expense') totalExpense += tr.amountInBase;
  });
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  const handlePrint = () => {
    playSound('click');
    if (onOpenPrintModal) {
      onOpenPrintModal();
    } else {
      window.print();
    }
  };

  const handleExport = () => {
    playSound('click');
    exportTransactionsToCSV(yearlyTransactions, categories, accounts, lang);
  };

  const maxMonthValue = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 100000);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            {t.reports}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'lo' ? 'ບົດວິເຄາະສະຫຼຸບລາຍຮັບ-ລາຍຈ່າຍປະຈຳປີ ແລະ ໃບລາຍງານທາງການເງິນ' : 'Annual financial statement and spending audit'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.exportCSV}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printReport}</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header (only visible on print or report top) */}
      <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/60 print:bg-white print:border-black print:text-black">
        <div className="flex items-center justify-between border-b border-slate-800 print:border-black pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 print:text-black">
              {lang === 'lo' ? 'ໃບສະຫຼຸບລາຍງານລາຍຮັບ-ລາຍຈ່າຍ ປະຈຳປີ' : 'Annual Financial Statement'} {selectedYear}
            </h2>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
              LaoExpense Pro · {formatDate(new Date().toISOString().slice(0, 10), lang)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 print:text-slate-600 block">{t.netSavings}</span>
            <span className={`text-xl font-bold font-mono tabular-nums ${netSavings >= 0 ? 'text-emerald-400 print:text-black' : 'text-rose-400 print:text-black'}`}>
              {formatCurrency(netSavings, currency)}
            </span>
          </div>
        </div>

        {/* 3 Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-slate-950/60 print:bg-slate-100 border border-slate-800/60 print:border-slate-300">
            <span className="text-xs text-slate-400 print:text-slate-600 block">{t.totalIncome}</span>
            <span className="text-lg font-bold text-emerald-400 print:text-black font-mono tabular-nums">
              +{formatCurrency(totalIncome, currency)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 print:bg-slate-100 border border-slate-800/60 print:border-slate-300">
            <span className="text-xs text-slate-400 print:text-slate-600 block">{t.totalExpense}</span>
            <span className="text-lg font-bold text-rose-400 print:text-black font-mono tabular-nums">
              -{formatCurrency(totalExpense, currency)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 print:bg-slate-100 border border-slate-800/60 print:border-slate-300">
            <span className="text-xs text-slate-400 print:text-slate-600 block">{t.savingsRate}</span>
            <span className="text-lg font-bold text-blue-400 print:text-black font-mono tabular-nums">
              {savingsRate}%
            </span>
          </div>
        </div>

        {/* Month by Month Comparative Bar Chart */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-semibold text-slate-300 print:text-black uppercase tracking-wider">
            {lang === 'lo' ? 'ການປຽບທຽບລາຍຮັບ-ລາຍຈ່າຍ ແຕ່ລະເດືອນ' : 'Monthly Income vs Expense Comparison'}
          </h3>

          <div className="grid grid-cols-12 gap-1 sm:gap-2 pt-2 items-end h-40 border-b border-slate-800 print:border-black pb-2">
            {monthlyData.map(m => {
              const incHeight = maxMonthValue > 0 ? (m.income / maxMonthValue) * 100 : 0;
              const expHeight = maxMonthValue > 0 ? (m.expense / maxMonthValue) * 100 : 0;

              return (
                <div key={m.month} className="flex flex-col items-center justify-end h-full group">
                  <div className="flex items-end gap-0.5 sm:gap-1 w-full justify-center h-28">
                    {/* Income Bar */}
                    <div
                      className="w-1.5 sm:w-3 bg-emerald-500 rounded-t-xs transition-all duration-300"
                      style={{ height: `${Math.max(incHeight, 2)}%` }}
                      title={`Income: ${formatCurrency(m.income, currency)}`}
                    />
                    {/* Expense Bar */}
                    <div
                      className="w-1.5 sm:w-3 bg-rose-500 rounded-t-xs transition-all duration-300"
                      style={{ height: `${Math.max(expHeight, 2)}%` }}
                      title={`Expense: ${formatCurrency(m.expense, currency)}`}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs text-slate-400 print:text-slate-700 font-mono mt-2">
                    {m.monthName}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-400 print:text-slate-700 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>{t.income}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
              <span>{t.expense}</span>
            </div>
          </div>
        </div>

        {/* Category Expense Ranking Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 print:text-black uppercase tracking-wider">
            {lang === 'lo' ? 'ອັນດັບການໃຊ້ຈ່າຍຕາມໝວດໝູ່' : 'Spending Ranked by Category'}
          </h3>

          <div className="divide-y divide-slate-800/80 print:divide-slate-200">
            {categoryRankings.map((cat, idx) => (
              <div key={cat.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 font-mono text-[11px] w-4">{idx + 1}.</span>
                  <CategoryIcon iconName={cat.icon} className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-200 print:text-black">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="text-slate-400 print:text-slate-600">{cat.percentage}%</span>
                  <span className="font-semibold text-slate-100 print:text-black">{formatCurrency(cat.amount, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
