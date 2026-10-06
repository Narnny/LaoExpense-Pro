import React, { useState, useEffect } from 'react';
import {
  Transaction,
  TransactionType,
  Category,
  Account,
  Currency,
  ExchangeRates,
  Language,
  RecurringFrequency,
} from '../types';
import { getT } from '../utils/translations';
import { CategoryIcon } from './CategoryIcon';
import { playSound } from '../utils/audio';
import { X, Check, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Paperclip, Image as ImageIcon, Trash2, CalendarClock } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionData: Omit<Transaction, 'id' | 'createdAt'>, editingId?: string) => void;
  onDelete?: (id: string) => void;
  onCreateRecurring?: (rec: {
    title: string;
    type: 'income' | 'expense';
    amount: number;
    currency: Currency;
    categoryId: string;
    accountId: string;
    frequency: RecurringFrequency;
    startDate: string;
    autoPost: boolean;
    note?: string;
  }) => void;
  editingTransaction?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  exchangeRates: ExchangeRates;
  currentCurrency: Currency;
  lang: Language;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onCreateRecurring,
  editingTransaction,
  categories,
  accounts,
  exchangeRates,
  currentCurrency,
  lang,
}) => {
  const t = getT(lang);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(currentCurrency);
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [title, setTitle] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');
  const [error, setError] = useState<string>('');

  // Filter categories by type
  const availableCategories = categories.filter(c => c.type === (type === 'transfer' ? 'expense' : type));

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCurrency(editingTransaction.currency);
      setCategoryId(editingTransaction.categoryId);
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || '');
      setDate(editingTransaction.date);
      setTime(editingTransaction.time);
      setTitle(editingTransaction.title);
      setNote(editingTransaction.note || '');
      setReceiptUrl(editingTransaction.receiptUrl || '');
    } else {
      // Default reset
      setType('expense');
      setAmount('');
      setCurrency(currentCurrency);
      setDate(new Date().toISOString().slice(0, 10));
      setTime(new Date().toTimeString().slice(0, 5));
      setTitle('');
      setNote('');
      setReceiptUrl('');
      setIsRecurring(false);
      setRecurringFrequency('monthly');
      setError('');
      if (availableCategories.length > 0) {
        setCategoryId(availableCategories[0].id);
      }
      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
        if (accounts.length > 1) {
          setToAccountId(accounts[1].id);
        }
      }
    }
  }, [editingTransaction, isOpen, currentCurrency]);

  // Adjust default category when type switches
  useEffect(() => {
    if (!editingTransaction && availableCategories.length > 0) {
      if (!availableCategories.some(c => c.id === categoryId)) {
        setCategoryId(availableCategories[0].id);
      }
    }
  }, [type, availableCategories, categoryId, editingTransaction]);

  if (!isOpen) return null;

  const handleQuickAdd = (addVal: number) => {
    playSound('click');
    const current = parseFloat(amount) || 0;
    setAmount((current + addVal).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError(lang === 'lo' ? 'ກະລຸນາໃສ່ຈຳນວນເງິນທີ່ຖືກຕ້ອງ' : 'Please enter a valid positive amount');
      return;
    }
    if (!title.trim()) {
      setError(lang === 'lo' ? 'ກະລຸນາໃສ່ຫົວຂໍ້/ລາຍລະອຽດລາຍການ' : 'Please enter a description or title');
      return;
    }
    if (!accountId) {
      setError(lang === 'lo' ? 'ກະລຸນາເລືອກບັນຊີ' : 'Please select an account');
      return;
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      setError(lang === 'lo' ? 'ກະລຸນາເລືອກບັນຊີປາຍທາງທີ່ຕ່າງຈາກບັນຊີຕົ້ນທາງ' : 'Please select a different destination account');
      return;
    }

    // Calculate base LAK
    let amountInBase = numAmount;
    if (currency === 'THB') {
      amountInBase = numAmount * exchangeRates.THB;
    } else if (currency === 'USD') {
      amountInBase = numAmount * exchangeRates.USD;
    }

    playSound(type === 'income' ? 'income' : 'expense');

    onSave(
      {
        type,
        amount: numAmount,
        currency,
        amountInBase,
        categoryId: type === 'transfer' ? 'exp_other' : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        date,
        time,
        title: title.trim(),
        note: note.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
      },
      editingTransaction?.id
    );

    if (!editingTransaction && isRecurring && onCreateRecurring && (type === 'expense' || type === 'income')) {
      onCreateRecurring({
        title: title.trim(),
        type,
        amount: numAmount,
        currency,
        categoryId: categoryId || availableCategories[0]?.id || '',
        accountId,
        frequency: recurringFrequency,
        startDate: date,
        autoPost: true,
        note: note.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">
            {editingTransaction ? t.editTransaction : t.addTransaction}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
              {error}
            </div>
          )}

          {/* Type Segmented Control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => { playSound('click'); setType('expense'); }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>{t.expense}</span>
            </button>

            <button
              type="button"
              onClick={() => { playSound('click'); setType('income'); }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{t.income}</span>
            </button>

            <button
              type="button"
              onClick={() => { playSound('click'); setType('transfer'); }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{t.transfer}</span>
            </button>
          </div>

          {/* Amount & Currency */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              {t.amount} <span className="text-rose-400">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="any"
                  autoFocus
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-lg font-bold text-slate-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-slate-700"
              >
                <option value="LAK">₭ ກີບ (LAK)</option>
                <option value="THB">฿ ບາດ (THB)</option>
                <option value="USD">$ ໂດລາ (USD)</option>
              </select>
            </div>

            {/* Quick Amount presets for Lao Kip */}
            {currency === 'LAK' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[10000, 20000, 50000, 100000, 500000, 1000000, 5000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickAdd(preset)}
                    className="px-2 py-0.5 text-[11px] font-mono tabular-nums rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 transition-colors"
                  >
                    +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                  </button>
                ))}
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount('')}
                    className="px-2 py-0.5 text-[11px] rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Title / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              {t.title} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder={t.titlePlaceholder}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(''); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category selection (if not transfer) */}
          {type !== 'transfer' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">{t.category}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
                {availableCategories.map(cat => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2 p-2 rounded-md text-left text-xs transition-colors border ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500/60 text-white font-medium shadow-xs'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <CategoryIcon iconName={cat.icon} className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{lang === 'lo' ? cat.nameLo : cat.nameEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account selector(s) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                {type === 'transfer' ? t.fromAccount : t.account}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {lang === 'lo' ? acc.nameLo : acc.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">{t.toAccount}</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === accountId}>
                      {lang === 'lo' ? acc.nameLo : acc.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">{t.date}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">{t.time}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-slate-700"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">{t.note}</label>
            <input
              type="text"
              placeholder={t.notePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
            />
          </div>

          {/* Slip / Receipt Image Attachment */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'lo' ? 'ແນບຮູບສະລິບ / ໃບຮັບເງິນ (QR Slip / Receipt)' : 'Attach Receipt / Transfer Slip'}</span>
              </span>
              {receiptUrl && (
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300"
                >
                  {lang === 'lo' ? 'ເອົາຮູບອອກ' : 'Remove image'}
                </button>
              )}
            </label>

            {receiptUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-2 flex items-center gap-3">
                <img
                  src={receiptUrl}
                  alt="Receipt Preview"
                  className="w-16 h-16 object-cover rounded border border-slate-800"
                />
                <div className="text-xs text-slate-300 flex-1 truncate">
                  <span className="font-semibold text-emerald-400 block">{lang === 'lo' ? 'ແນບສະລິບແລ້ວ' : 'Slip Attached'}</span>
                  <span className="text-[11px] text-slate-500">{lang === 'lo' ? 'ສາມາດກວດເບິ່ງໄດ້ໃນລາຍລະອຽດ' : 'Ready to save'}</span>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950 cursor-pointer transition-colors text-xs text-slate-400">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span>{lang === 'lo' ? 'ຄລິກເພື່ອອັບໂຫຼດຮູບສະລິບ (BCEL One / ໃບສຳຄັນ)' : 'Upload transfer slip or photo receipt'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2.5 * 1024 * 1024) {
                        setError(lang === 'lo' ? 'ຂະໜາດຮູບພາບໃຫຍ່ເກີນ 2.5MB' : 'Image exceeds 2.5MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setReceiptUrl(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            {editingTransaction && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  playSound('delete');
                  onDelete(editingTransaction.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-900/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.deleteTransaction}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>{t.save}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
