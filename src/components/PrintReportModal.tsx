import React, { useState, useMemo } from 'react';
import { Transaction, Category, Account, Currency, Language } from '../types';
import { getT } from '../utils/translations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { playSound } from '../utils/audio';
import { Printer, X, Filter, FileText, CheckCircle2 } from 'lucide-react';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  currency: Currency;
  lang: Language;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  accounts,
  currency,
  lang,
}) => {
  const t = getT(lang);

  const [orgName, setOrgName] = useState(lang === 'lo' ? 'ທຸລະກິດສ່ວນຕົວ / ບໍລິສັດ' : 'Personal Finance / Business');
  const [preparedBy, setPreparedBy] = useState(lang === 'lo' ? 'ຜູ້ຈັດການການເງິນ' : 'Finance Manager');
  const [periodType, setPeriodType] = useState<'month' | 'today' | '7days' | 'year' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  // Filtered transactions for printing
  const printTransactions = useMemo(() => {
    return transactions.filter(tr => {
      // Account
      if (accountFilter !== 'all' && tr.accountId !== accountFilter && tr.toAccountId !== accountFilter) {
        return false;
      }
      // Type
      if (typeFilter !== 'all' && tr.type !== typeFilter) {
        return false;
      }
      // Period
      if (periodType === 'today') {
        const today = new Date().toISOString().slice(0, 10);
        return tr.date === today;
      }
      if (periodType === '7days') {
        const now = new Date();
        const past = new Date(now);
        past.setDate(now.getDate() - 7);
        const trDate = new Date(tr.date);
        return trDate >= past && trDate <= now;
      }
      if (periodType === 'month') {
        return tr.date.startsWith(selectedMonth);
      }
      if (periodType === 'year') {
        const y = selectedMonth.slice(0, 4);
        return tr.date.startsWith(y);
      }
      if (periodType === 'custom') {
        if (startDate && tr.date < startDate) return false;
        if (endDate && tr.date > endDate) return false;
        return true;
      }
      return true;
    }).sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [transactions, accountFilter, typeFilter, periodType, selectedMonth, startDate, endDate]);

  // Summary calculations
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    printTransactions.forEach(t => {
      if (t.type === 'income') income += t.amountInBase;
      if (t.type === 'expense') expense += t.amountInBase;
    });
    const net = income - expense;
    const rate = income > 0 ? Math.round((net / income) * 100) : 0;
    return { income, expense, net, rate };
  }, [printTransactions]);

  // Category breakdown for report
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    printTransactions.filter(t => t.type === 'expense').forEach(t => {
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amountInBase);
    });
    return Array.from(map.entries())
      .map(([catId, amount]) => ({
        cat: catMap.get(catId),
        amount,
        percentage: summary.expense > 0 ? Math.round((amount / summary.expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [printTransactions, catMap, summary.expense]);

  if (!isOpen) return null;

  const handlePrint = () => {
    playSound('click');
    window.print();
  };

  const periodLabel = periodType === 'month'
    ? `${lang === 'lo' ? 'ເດືອນ' : 'Month'} ${selectedMonth}`
    : periodType === 'today'
    ? `${t.today} (${new Date().toISOString().slice(0, 10)})`
    : periodType === '7days'
    ? t.sevenDays
    : periodType === 'year'
    ? `${lang === 'lo' ? 'ປະຈຳປີ' : 'Year'} ${selectedMonth.slice(0, 4)}`
    : `${startDate} ຫາ ${endDate}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col h-[94vh]">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                {t.printReport} / {lang === 'lo' ? 'ໃບສະຫຼຸບລາຍຮັບ-ລາຍຈ່າຍ' : 'Financial Statement'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'lo' ? 'ປັບແຕ່ງຊ່ວງເວລາ, ຫົວໜ່ວຍທຸລະກິດ ແລະ ກວດສອບກ່ອນສັ່ງພິມ' : 'Configure options and preview before printing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printDocument}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options Toolbar (Hidden on print) */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 shrink-0 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">{t.organizationName}</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">{t.preparedBy}</label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">{t.reportPeriod}</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as typeof periodType)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
              >
                <option value="month">{t.thisMonth} (ເລືອກເດືອນ)</option>
                <option value="today">{t.today}</option>
                <option value="7days">{t.sevenDays}</option>
                <option value="year">{t.thisYear}</option>
                <option value="custom">{t.customRange}</option>
              </select>
            </div>

            {periodType === 'month' && (
              <div>
                <label className="text-slate-400 block mb-1">{lang === 'lo' ? 'ເລືອກເດືອນ' : 'Select Month'}</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono"
                />
              </div>
            )}

            {periodType === 'custom' && (
              <>
                <div>
                  <label className="text-slate-400 block mb-1">{t.startDate}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t.endDate}</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-slate-400 block mb-1">{t.account}</label>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
              >
                <option value="all">{t.all}</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {lang === 'lo' ? a.nameLo : a.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Document View (A4 Styled) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex justify-center">
          <div
            id="printable-area"
            className="w-full max-w-4xl bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
            style={{ minHeight: '297mm', fontFamily: "'Noto Sans Lao', 'Noto Sans', sans-serif" }}
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1
                    className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 uppercase"
                    style={{ fontFamily: "'Noto Sans Lao', 'Noto Sans', sans-serif" }}
                  >
                    {t.financialStatementTitle}
                  </h1>
                  <p
                    className="text-xs text-slate-600 mt-1 font-semibold"
                    style={{ fontFamily: "'Noto Sans Lao', 'Noto Sans', sans-serif" }}
                  >
                    {orgName} · {t.reportSubtitle}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-mono">
                    {t.reportDate}: {formatDate(new Date().toISOString().slice(0, 10), lang)}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {t.reportPeriod}: {periodLabel}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Doc ID: REP-{Date.now().toString().slice(-6)}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary Highlight Card */}
            <div className="grid grid-cols-4 gap-3 mb-6 bg-slate-50 border border-slate-300 p-4 rounded-sm">
              <div className="border-r border-slate-300 pr-3">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">
                  {t.totalIncome}
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono tabular-nums">
                  +{formatCurrency(summary.income, currency)}
                </span>
              </div>

              <div className="border-r border-slate-300 pr-3">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">
                  {t.totalExpense}
                </span>
                <span className="text-base sm:text-lg font-bold text-rose-700 font-mono tabular-nums">
                  -{formatCurrency(summary.expense, currency)}
                </span>
              </div>

              <div className="border-r border-slate-300 pr-3">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">
                  {t.netSavings}
                </span>
                <span className={`text-base sm:text-lg font-bold font-mono tabular-nums ${summary.net >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                  {formatCurrency(summary.net, currency)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">
                  {t.savingsRate}
                </span>
                <span className="text-base sm:text-lg font-bold text-blue-700 font-mono tabular-nums">
                  {summary.rate}%
                </span>
              </div>
            </div>

            {/* Category Distribution Summary (Horizontal compact table) */}
            {categoryBreakdown.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  {lang === 'lo' ? 'ສັດສ່ວນລາຍຈ່າຍຕາມໝວດໝູ່ຫຼັກ' : 'Spending by Category'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border border-slate-200 p-2.5 rounded-sm bg-slate-50/50">
                  {categoryBreakdown.slice(0, 8).map(c => (
                    <div key={c.cat?.id || Math.random()} className="flex items-center justify-between pr-2">
                      <span className="text-slate-600 truncate">{c.cat ? (lang === 'lo' ? c.cat.nameLo : c.cat.nameEn) : ''}</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {c.percentage}% ({formatCurrency(c.amount, currency)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Transaction Table */}
            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                {lang === 'lo' ? 'ຕາຕະລາງລາຍການລະອຽດທັງໝົດ' : 'Detailed Transaction Records'} ({printTransactions.length} {t.totalEntries})
              </h3>

              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                    <th className="py-2 px-2.5 border-r border-slate-300 w-8 text-center">#</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 whitespace-nowrap">{t.date}</th>
                    <th className="py-2 px-2.5 border-r border-slate-300">{t.title}</th>
                    <th className="py-2 px-2.5 border-r border-slate-300">{t.category}</th>
                    <th className="py-2 px-2.5 border-r border-slate-300">{t.account}</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 text-right whitespace-nowrap text-emerald-800">{t.income}</th>
                    <th className="py-2 px-2.5 text-right whitespace-nowrap text-rose-800">{t.expense}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        {t.noTransactions}
                      </td>
                    </tr>
                  ) : (
                    printTransactions.map((tr, idx) => {
                      const cat = catMap.get(tr.categoryId);
                      const acc = accMap.get(tr.accountId);
                      const isInc = tr.type === 'income';
                      const isExp = tr.type === 'expense';

                      return (
                        <tr key={tr.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono text-center text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono whitespace-nowrap text-slate-700">
                            {tr.date} {tr.time}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                            <div>{tr.title}</div>
                            {tr.note && <div className="text-[10px] text-slate-500">{tr.note}</div>}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                            {cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                            {acc ? (lang === 'lo' ? acc.nameLo : acc.nameEn) : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                            {isInc ? `+${formatCurrency(tr.amountInBase, currency)}` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-rose-700 whitespace-nowrap">
                            {isExp ? `-${formatCurrency(tr.amountInBase, currency)}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td colSpan={5} className="py-2.5 px-3 text-right uppercase border-r border-slate-300 text-slate-700">
                      {lang === 'lo' ? 'ຍອດລວມທັງໝົດ' : 'Grand Total'}:
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-emerald-700 border-r border-slate-300">
                      +{formatCurrency(summary.income, currency)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-rose-700">
                      -{formatCurrency(summary.expense, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Formal Signature Blocks */}
            <div className="grid grid-cols-2 gap-12 pt-8 mt-12 border-t border-slate-300 text-xs">
              <div className="text-center">
                <p className="font-semibold text-slate-800 mb-1">{t.preparedBy}</p>
                <p className="text-[11px] text-slate-500 mb-12">{orgName}</p>
                <div className="w-48 mx-auto border-b border-dashed border-slate-400 mb-1" />
                <p className="font-medium text-slate-700">({preparedBy})</p>
                <p className="text-[10px] text-slate-400">{t.signature}</p>
              </div>

              <div className="text-center">
                <p className="font-semibold text-slate-800 mb-1">{t.approvedBy}</p>
                <p className="text-[11px] text-slate-500 mb-12">{lang === 'lo' ? 'ກວດສອບຖືກຕ້ອງຕາມລະບຽບການ' : 'Audited & Verified'}</p>
                <div className="w-48 mx-auto border-b border-dashed border-slate-400 mb-1" />
                <p className="font-medium text-slate-700">(........................................................)</p>
                <p className="text-[10px] text-slate-400">{t.signature}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
