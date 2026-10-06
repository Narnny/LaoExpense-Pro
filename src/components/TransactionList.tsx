import React, { useState, useMemo } from 'react';
import {
  Transaction,
  TransactionType,
  Category,
  Account,
  Currency,
  Language,
  DateFilterType
} from '../types';
import { getT } from '../utils/translations';
import { formatCurrency, formatDate, exportTransactionsToCSV } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { playSound } from '../utils/audio';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit2,
  Copy,
  ArrowRightLeft,
  Calendar,
  X,
  Printer,
  Paperclip
} from 'lucide-react';

import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  currency: Currency;
  lang: Language;
  onOpenAddModal: () => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onDuplicateTransaction: (t: Transaction) => void;
  onPrintVoucher?: (t: Transaction) => void;
  onOpenPrintReport?: () => void;
  onViewSlip?: (slipUrl: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  accounts,
  currency,
  lang,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  onDuplicateTransaction,
  onPrintVoucher,
  onOpenPrintReport,
  onViewSlip,
}) => {
  const t = getT(lang);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter(tr => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const cat = catMap.get(tr.categoryId);
        const acc = accMap.get(tr.accountId);
        const matchTitle = tr.title.toLowerCase().includes(q);
        const matchNote = tr.note ? tr.note.toLowerCase().includes(q) : false;
        const matchCat = cat ? (cat.nameLo + ' ' + cat.nameEn).toLowerCase().includes(q) : false;
        const matchAcc = acc ? (acc.nameLo + ' ' + acc.nameEn).toLowerCase().includes(q) : false;
        const matchAmount = tr.amount.toString().includes(q) || tr.amountInBase.toString().includes(q);

        if (!matchTitle && !matchNote && !matchCat && !matchAcc && !matchAmount) {
          return false;
        }
      }

      // Type
      if (typeFilter !== 'all' && tr.type !== typeFilter) {
        return false;
      }

      // Category
      if (categoryFilter !== 'all' && tr.categoryId !== categoryFilter) {
        return false;
      }

      // Account
      if (accountFilter !== 'all' && tr.accountId !== accountFilter && tr.toAccountId !== accountFilter) {
        return false;
      }

      // Date
      const trDate = new Date(tr.date);
      const now = new Date();

      if (dateFilter === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        return tr.date === todayStr;
      }
      if (dateFilter === '7days') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return trDate >= sevenDaysAgo && trDate <= now;
      }
      if (dateFilter === 'month') {
        return trDate.getMonth() === now.getMonth() && trDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return trDate.getMonth() === lastMonth && trDate.getFullYear() === year;
      }
      if (dateFilter === 'year') {
        return trDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'custom') {
        if (customStart && tr.date < customStart) return false;
        if (customEnd && tr.date > customEnd) return false;
        return true;
      }

      return true;
    }).sort((a, b) => {
      // Sort newest first
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.time || '').localeCompare(a.time || '');
    });
  }, [transactions, search, typeFilter, categoryFilter, accountFilter, dateFilter, customStart, customEnd, catMap, accMap]);

  // Aggregate sums of filtered results
  const summary = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filtered.forEach(tr => {
      if (tr.type === 'income') inc += tr.amountInBase;
      if (tr.type === 'expense') exp += tr.amountInBase;
    });
    return { income: inc, expense: exp, net: inc - exp };
  }, [filtered]);

  const handleExportCSV = () => {
    playSound('click');
    exportTransactionsToCSV(filtered, categories, accounts, lang);
  };

  return (
    <div className="space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            {t.transactions}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'lo' ? 'ຈັດການ ແລະ ຄົ້ນຫາປະຫວັດລາຍຮັບ-ລາຍຈ່າຍທັງໝົດ' : 'Comprehensive ledger and audit trail'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPrintReport && (
            <button
              type="button"
              onClick={() => { playSound('click'); onOpenPrintReport(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.printReport}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.exportCSV}</span>
          </button>

          <button
            type="button"
            onClick={() => { playSound('click'); onOpenAddModal(); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addTransaction}</span>
          </button>
        </div>
      </div>

      {/* Filter Surface */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Live Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type segmented button */}
          <div className="md:col-span-4 flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            {(
              [
                { id: 'all', label: t.all },
                { id: 'income', label: t.income },
                { id: 'expense', label: t.expense },
                { id: 'transfer', label: t.transfer },
              ] as const
            ).map(item => (
              <button
                key={item.id}
                onClick={() => { playSound('click'); setTypeFilter(item.id); }}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  typeFilter === item.id
                    ? 'bg-slate-800 text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Date Range Selector */}
          <div className="md:col-span-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
            >
              <option value="month">{t.thisMonth}</option>
              <option value="7days">{t.sevenDays}</option>
              <option value="today">{t.today}</option>
              <option value="last_month">{t.lastMonth}</option>
              <option value="year">{t.thisYear}</option>
              <option value="all">{t.all}</option>
              <option value="custom">{t.customRange}</option>
            </select>
          </div>
        </div>

        {/* Custom date range row if selected */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-3 pt-1 text-xs text-slate-400 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span>{t.startDate}:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>{t.endDate}:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* Category & Account secondary filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/40 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">{t.category}:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">{t.all}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {lang === 'lo' ? c.nameLo : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">{t.account}:</span>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">{t.all}</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {lang === 'lo' ? a.nameLo : a.nameEn}
                </option>
              ))}
            </select>
          </div>

          {(search || typeFilter !== 'all' || categoryFilter !== 'all' || accountFilter !== 'all' || dateFilter !== 'month') && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
                setCategoryFilter('all');
                setAccountFilter('all');
                setDateFilter('month');
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 ml-auto transition-colors"
            >
              {lang === 'lo' ? 'ລ້າງຕົວກັ່ນຕອງ' : 'Reset filters'}
            </button>
          )}
        </div>
      </div>

      {/* Filter Results Summary Strip (Zero-pill text metadata) */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span>{filtered.length} {t.totalEntries}</span>
          <span aria-hidden="true">·</span>
          <span>{lang === 'lo' ? 'ຮັບ' : 'Inc'}: <strong className="text-emerald-400 font-mono tabular-nums">+{formatCurrency(summary.income, currency)}</strong></span>
          <span aria-hidden="true">·</span>
          <span>{lang === 'lo' ? 'ຈ່າຍ' : 'Exp'}: <strong className="text-rose-400 font-mono tabular-nums">-{formatCurrency(summary.expense, currency)}</strong></span>
          <span aria-hidden="true">·</span>
          <span>{lang === 'lo' ? 'ສຸດທິ' : 'Net'}: <strong className={`font-mono tabular-nums ${summary.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(summary.net, currency)}</strong></span>
        </div>
      </div>

      {/* High-density Data Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <p className="text-sm">{t.noTransactions}</p>
            <button
              type="button"
              onClick={() => { playSound('click'); onOpenAddModal(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addTransaction}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">{t.date}</th>
                  <th className="py-2.5 px-4 font-semibold">{t.title}</th>
                  <th className="py-2.5 px-3 font-semibold">{t.category}</th>
                  <th className="py-2.5 px-3 font-semibold">{t.account}</th>
                  <th className="py-2.5 px-4 font-semibold text-right">{t.amount}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{lang === 'lo' ? 'ຈັດການ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(tr => {
                  const cat = catMap.get(tr.categoryId);
                  const acc = accMap.get(tr.accountId);
                  const toAcc = tr.toAccountId ? accMap.get(tr.toAccountId) : null;

                  return (
                    <tr
                      key={tr.id}
                      className="hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Date & Time */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="text-slate-200 font-mono tabular-nums">{tr.date}</div>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums">{tr.time}</div>
                      </td>

                      {/* Title & Note */}
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          <span>{tr.title}</span>
                          {tr.receiptUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onViewSlip && tr.receiptUrl) onViewSlip(tr.receiptUrl);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded hover:bg-emerald-950/40 transition-colors shrink-0"
                              title={lang === 'lo' ? 'ເບິ່ງຮູບສະລິບ / ໃບຮັບເງິນ' : 'View attached slip'}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {tr.note && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{tr.note}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {tr.type === 'transfer' ? (
                          <span className="text-blue-400 flex items-center gap-1.5">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>{t.transfer}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat?.color || '#94a3b8' }}
                            />
                            <CategoryIcon iconName={cat?.icon || 'HelpCircle'} className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : '-'}</span>
                          </div>
                        )}
                      </td>

                      {/* Account */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                        {tr.type === 'transfer' ? (
                          <div className="text-[11px] flex items-center gap-1">
                            <span>{acc ? (lang === 'lo' ? acc.nameLo : acc.nameEn) : ''}</span>
                            <span>→</span>
                            <span className="text-slate-200">{toAcc ? (lang === 'lo' ? toAcc.nameLo : toAcc.nameEn) : ''}</span>
                          </div>
                        ) : (
                          <span>{acc ? (lang === 'lo' ? acc.nameLo : acc.nameEn) : '-'}</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div
                          className={`font-semibold font-mono tabular-nums ${
                            tr.type === 'income'
                              ? 'text-emerald-400'
                              : tr.type === 'expense'
                              ? 'text-rose-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {tr.type === 'income' ? '+' : tr.type === 'expense' ? '-' : ''}
                          {formatCurrency(tr.amountInBase, currency)}
                        </div>
                        {tr.currency !== 'LAK' && (
                          <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                            ({tr.amount} {tr.currency})
                          </div>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {onPrintVoucher && (
                            <button
                              type="button"
                              onClick={() => { playSound('click'); onPrintVoucher(tr); }}
                              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                              title={t.printVoucher}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { playSound('click'); onEditTransaction(tr); }}
                            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                            title={t.editTransaction}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { playSound('click'); onDuplicateTransaction(tr); }}
                            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                            title={t.duplicate}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playSound('click');
                              setDeletingTx(tr);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                            title={t.deleteTransaction}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* In-app Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deletingTx !== null}
        onClose={() => setDeletingTx(null)}
        onConfirm={() => {
          if (deletingTx) {
            playSound('delete');
            onDeleteTransaction(deletingTx.id);
            setDeletingTx(null);
          }
        }}
        title={lang === 'lo' ? 'ຢືນຢັນການລຶບລາຍການ' : 'Confirm Delete Transaction'}
        message={
          deletingTx
            ? `${deletingTx.title} (${formatCurrency(deletingTx.amountInBase, currency)})`
            : undefined
        }
        lang={lang}
      />
    </div>
  );
};
