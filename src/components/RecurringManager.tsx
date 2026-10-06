import React, { useState, useMemo } from 'react';
import {
  RecurringTransaction,
  RecurringFrequency,
  Category,
  Account,
  Currency,
  Language,
  ExchangeRates,
  Transaction,
} from '../types';
import { getT } from '../utils/translations';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { playSound } from '../utils/audio';
import {
  computeNextRunDate,
  formatFrequency,
  getDaysUntil,
  triggerManualRecurringRun,
} from '../utils/recurringEngine';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Zap,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Calendar,
  X,
  Check,
} from 'lucide-react';

interface RecurringManagerProps {
  recurringList: RecurringTransaction[];
  categories: Category[];
  accounts: Account[];
  currency: Currency;
  exchangeRates: ExchangeRates;
  lang: Language;
  onSaveRecurring: (rec: RecurringTransaction) => void;
  onDeleteRecurring: (id: string) => void;
  onManualTrigger: (rec: RecurringTransaction) => void;
  onProcessAllDue: () => void;
}

export const RecurringManager: React.FC<RecurringManagerProps> = ({
  recurringList,
  categories,
  accounts,
  currency,
  exchangeRates,
  lang,
  onSaveRecurring,
  onDeleteRecurring,
  onManualTrigger,
  onProcessAllDue,
}) => {
  const t = getT(lang);
  const today = new Date().toISOString().slice(0, 10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [recCurrency, setRecCurrency] = useState<Currency>(currency);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [autoPost, setAutoPost] = useState(true);
  const [note, setNote] = useState('');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Filter categories by type
  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  // Compute monthly projected totals
  const { monthlyProjectedExpense, monthlyProjectedIncome, dueCount } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    let due = 0;

    recurringList.forEach((rec) => {
      if (!rec.active) return;
      if (rec.nextRunDate <= today) due++;

      let monthlyEquiv = rec.amountInBase;
      if (rec.frequency === 'daily') monthlyEquiv = rec.amountInBase * 30;
      else if (rec.frequency === 'weekly') monthlyEquiv = rec.amountInBase * 4.33;
      else if (rec.frequency === 'yearly') monthlyEquiv = rec.amountInBase / 12;

      if (rec.type === 'expense') exp += monthlyEquiv;
      else if (rec.type === 'income') inc += monthlyEquiv;
    });

    return {
      monthlyProjectedExpense: exp,
      monthlyProjectedIncome: inc,
      dueCount: due,
    };
  }, [recurringList, today]);

  const handleOpenAdd = (template?: Partial<RecurringTransaction>) => {
    playSound('click');
    setEditingItem(null);
    setTitle(template?.title || '');
    setType(template?.type || 'expense');
    setAmount(template?.amount ? String(template.amount) : '');
    setRecCurrency(template?.currency || currency);
    setCategoryId(template?.categoryId || (availableCategories[0]?.id || ''));
    setAccountId(template?.accountId || (accounts[0]?.id || ''));
    setFrequency(template?.frequency || 'monthly');
    setStartDate(today);
    setEndDate('');
    setAutoPost(true);
    setNote(template?.note || '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: RecurringTransaction) => {
    playSound('click');
    setEditingItem(rec);
    setTitle(rec.title);
    setType(rec.type);
    setAmount(String(rec.amount));
    setRecCurrency(rec.currency);
    setCategoryId(rec.categoryId);
    setAccountId(rec.accountId);
    setFrequency(rec.frequency);
    setStartDate(rec.startDate);
    setEndDate(rec.endDate || '');
    setAutoPost(rec.autoPost);
    setNote(rec.note || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) return;

    let amountInBase = numAmount;
    if (recCurrency === 'THB') {
      amountInBase = Math.round(numAmount * exchangeRates.THB);
    } else if (recCurrency === 'USD') {
      amountInBase = Math.round(numAmount * exchangeRates.USD);
    }

    const nextRun = editingItem ? editingItem.nextRunDate : startDate;

    const recurringData: RecurringTransaction = {
      id: editingItem ? editingItem.id : `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: editingItem?.userId,
      title: title.trim(),
      type,
      amount: numAmount,
      currency: recCurrency,
      amountInBase,
      categoryId: categoryId || availableCategories[0]?.id || '',
      accountId: accountId || accounts[0]?.id || '',
      frequency,
      startDate,
      endDate: endDate.trim() || undefined,
      nextRunDate: nextRun,
      lastRunDate: editingItem?.lastRunDate,
      active: editingItem ? editingItem.active : true,
      autoPost,
      note: note.trim() || undefined,
      createdAt: editingItem ? editingItem.createdAt : Date.now(),
    };

    playSound('success');
    onSaveRecurring(recurringData);
    setIsModalOpen(false);
  };

  const handleToggleActive = (rec: RecurringTransaction) => {
    playSound('click');
    onSaveRecurring({
      ...rec,
      active: !rec.active,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-emerald-400" />
              <span>{t.recurring}</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">
              {recurringList.filter((r) => r.active).length} {lang === 'lo' ? 'ລາຍການ' : 'active'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'lo'
              ? 'ກຳນົດລາຍຮັບ-ລາຍຈ່າຍປະຈຳ (ຄ່າເຊົ່າ, ຄ່າເນັດ, ເງິນເດືອນ) ໃຫ້ບັນທຶກອັດຕະໂນມັດເມື່ອຮອດວັນທີ'
              : 'Automate repeating expenses and income (rent, utilities, salary) on schedule.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dueCount > 0 && (
            <button
              type="button"
              onClick={onProcessAllDue}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 rounded-lg hover:bg-emerald-900/50 transition-colors shadow-sm animate-pulse"
              title="ປະມວນຜົນລາຍການທີ່ຮອດກຳນົດ"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'lo' ? `ປະມວນຜົນທັນທີ (${dueCount})` : `Process Due (${dueCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addRecurring}</span>
          </button>
        </div>
      </div>

      {/* Metric Projection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{lang === 'lo' ? 'ປະມານການລາຍຈ່າຍປະຈຳ/ເດືອນ' : 'Projected Monthly Expense'}</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 tabular-nums">
            -{formatCurrency(monthlyProjectedExpense, currency)}
          </div>
          <p className="text-[10px] text-slate-500">
            {lang === 'lo' ? 'ລວມລາຍຈ່າຍທີ່ຕັ້ງຊ້ຳທຸກຮອບ' : 'Total scheduled monthly outlays'}
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{lang === 'lo' ? 'ປະມານການລາຍຮັບປະຈຳ/ເດືອນ' : 'Projected Monthly Income'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            +{formatCurrency(monthlyProjectedIncome, currency)}
          </div>
          <p className="text-[10px] text-slate-500">
            {lang === 'lo' ? 'ລວມລາຍຮັບທີ່ຕັ້ງຊ້ຳ (ເງິນເດືອນ/ປະຈຳ)' : 'Total scheduled monthly inflows'}
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{lang === 'lo' ? 'ສະຖານະລາຍການຮອດກຳນົດ' : 'Due Status'}</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
            {dueCount}{' '}
            <span className="text-xs font-normal text-slate-400">
              {lang === 'lo' ? 'ລາຍການພ້ອມບັນທຶກ' : 'ready to post'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            {dueCount > 0
              ? lang === 'lo'
                ? 'ກົດປຸ່ມປະມວນຜົນເພື່ອລົງບັນຊີທັນທີ'
                : 'Ready to automatically log into ledger'
              : lang === 'lo'
              ? 'ທຸກລາຍການຢູ່ໃນເກນປົກກະຕິ'
              : 'All schedules up to date'}
          </p>
        </div>
      </div>

      {/* Main Recurring List */}
      {recurringList.length === 0 ? (
        /* Empty State with Quick Starter Templates */
        <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 text-emerald-400 flex items-center justify-center border border-slate-700">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-100">
              {lang === 'lo' ? 'ຍັງບໍ່ທັນມີລາຍການປະຈຳເທື່ອ' : 'No recurring schedules yet'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'lo'
                ? 'ຕັ້ງຄ່າລາຍການທີ່ເກີດຂຶ້ນຊ້ຳໆ ເຊັ່ນ: ຄ່າເນັດ Wi-Fi, ຄ່າເຊົ່າຫ້ອງ, ຄ່າສະມາຊິກ, ຫຼື ເງິນເດືອນ ເພື່ອໃຫ້ລະບົບບັນທຶກລົງບັນຊີໃຫ້ອັດຕະໂນມັດ!'
                : 'Schedule repeating transactions like rent, subscriptions, utilities or salary to auto-post on due dates.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleOpenAdd({
                  title: 'ຄ່າອິນເຕີເນັດ Wi-Fi ປະຈຳເດືອນ',
                  amount: 250000,
                  frequency: 'monthly',
                  type: 'expense',
                })
              }
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              + ຄ່າເນັດ Wi-Fi (ປະຈຳເດືອນ)
            </button>
            <button
              type="button"
              onClick={() =>
                handleOpenAdd({
                  title: 'ຄ່າເຊົ່າຫ້ອງ / ເຊົ່າບ້ານ',
                  amount: 2000000,
                  frequency: 'monthly',
                  type: 'expense',
                })
              }
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              + ຄ່າເຊົ່າບ້ານ (ປະຈຳເດືອນ)
            </button>
            <button
              type="button"
              onClick={() =>
                handleOpenAdd({
                  title: 'ຮັບເງິນເດືອນປະຈຳ',
                  amount: 8000000,
                  frequency: 'monthly',
                  type: 'income',
                })
              }
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              + ຮັບເງິນເດືອນ (ປະຈຳເດືອນ)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {recurringList.map((rec) => {
            const cat = catMap.get(rec.categoryId);
            const acc = accMap.get(rec.accountId);
            const daysLeft = getDaysUntil(rec.nextRunDate, today);
            const isDue = rec.active && daysLeft <= 0;

            return (
              <div
                key={rec.id}
                className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  !rec.active
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : isDue
                    ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top row: Icon, Category, Frequency badge, Active toggle */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: cat?.color || '#3b82f6' }}
                      >
                        <CategoryIcon iconName={cat?.icon || 'HelpCircle'} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                          {rec.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span>{cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : rec.categoryId}</span>
                          <span>·</span>
                          <span className="text-slate-500">{acc ? (lang === 'lo' ? acc.nameLo : acc.nameEn) : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {formatFrequency(rec.frequency, lang)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(rec)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          rec.active
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                        }`}
                        title={rec.active ? t.activeSchedule : t.pausedSchedule}
                      >
                        {rec.active ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Amount Display */}
                  <div className="my-2.5 flex items-baseline justify-between">
                    <div className="text-xs text-slate-400 font-medium">
                      {rec.type === 'expense' ? (
                        <span className="text-rose-400">{lang === 'lo' ? 'ລາຍຈ່າຍ' : 'Expense'}</span>
                      ) : (
                        <span className="text-emerald-400">{lang === 'lo' ? 'ລາຍຮັບ' : 'Income'}</span>
                      )}
                    </div>
                    <div
                      className={`text-lg font-bold font-mono tabular-nums ${
                        rec.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {rec.type === 'income' ? '+' : '-'}
                      {formatCurrency(rec.amountInBase, currency)}
                      {rec.currency !== 'LAK' && (
                        <span className="text-xs text-slate-500 ml-1 font-normal font-sans">
                          ({rec.amount} {rec.currency})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Schedule Details pill */}
                  <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80 space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-sans flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{t.nextDue}:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">{rec.nextRunDate}</span>
                        {rec.active && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-sans ${
                              daysLeft <= 0
                                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                                : daysLeft <= 3
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {daysLeft === 0
                              ? lang === 'lo'
                                ? 'ມື້ນີ້'
                                : 'Today'
                              : daysLeft < 0
                              ? lang === 'lo'
                                ? `ກາຍ ${Math.abs(daysLeft)} ມື້`
                                : `${Math.abs(daysLeft)}d overdue`
                              : lang === 'lo'
                              ? `ອີກ ${daysLeft} ມື້`
                              : `in ${daysLeft}d`}
                          </span>
                        )}
                      </div>
                    </div>

                    {rec.lastRunDate && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-sans">{t.lastProcessed}:</span>
                        <span>{rec.lastRunDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Zap className="w-3 h-3 text-emerald-400/80" />
                    <span>{rec.autoPost ? t.autoPostShort : (lang === 'lo' ? 'ເຕືອນກ່ອນ' : 'Prompt')}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Process Now CTA */}
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        onManualTrigger(rec);
                      }}
                      className="px-2 py-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 rounded border border-emerald-500/30 transition-colors flex items-center gap-1"
                      title={t.processNow}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{t.processNow}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(rec)}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                      title={t.editRecurring}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setDeletingId(rec.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                      title={t.deleteRecurring}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Recurring Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {editingItem ? t.editRecurring : t.addRecurring}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    const firstExp = categories.find((c) => c.type === 'expense');
                    if (firstExp) setCategoryId(firstExp.id);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    type === 'expense'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'lo' ? 'ລາຍຈ່າຍປະຈຳ' : 'Recurring Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income');
                    const firstInc = categories.find((c) => c.type === 'income');
                    if (firstInc) setCategoryId(firstInc.id);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'lo' ? 'ລາຍຮັບປະຈຳ' : 'Recurring Income'}
                </button>
              </div>

              {/* Title & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">
                    {lang === 'lo' ? 'ຊື່ລາຍການປະຈຳ *' : 'Schedule Title *'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      type === 'expense'
                        ? 'ຕົວຢ່າງ: ຄ່າເນັດ Wi-Fi, ຄ່າເຊົ່າຫ້ອງ'
                        : 'ຕົວຢ່າງ: ເງິນເດືອນ, ຄ່າເຊົ່າຕຶກ'
                    }
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{t.frequency} *</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="daily">{t.daily}</option>
                    <option value="weekly">{t.weekly}</option>
                    <option value="monthly">{t.monthly}</option>
                    <option value="yearly">{t.yearly}</option>
                  </select>
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-slate-400">
                    {lang === 'lo' ? 'ຈຳນວນເງິນ *' : 'Amount *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="250,000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{lang === 'lo' ? 'ສະກຸນ' : 'Currency'}</label>
                  <select
                    value={recCurrency}
                    onChange={(e) => setRecCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  >
                    <option value="LAK">₭ LAK</option>
                    <option value="THB">฿ THB</option>
                    <option value="USD">$ USD</option>
                  </select>
                </div>
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{lang === 'lo' ? 'ໝວດໝູ່' : 'Category'}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'lo' ? c.nameLo : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{lang === 'lo' ? 'ບັນຊີ/ກະເປົາ' : 'Account'}</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {lang === 'lo' ? a.nameLo : a.nameEn} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{t.startDate} *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{t.endDate}</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Auto Post Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">{t.autoPost}</div>
                  <div className="text-[10px] text-slate-400">
                    {lang === 'lo'
                      ? 'ເມື່ອຮອດວັນທີກຳນົດ ລະບົບຈະສ້າງລາຍການລົງບັນຊີໃຫ້ໂດຍອັດຕະໂນມັດ'
                      : 'Automatically create the transaction when next due date arrives'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPost}
                  onChange={(e) => setAutoPost(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400">{lang === 'lo' ? 'ໝາຍເຫດ' : 'Note'}</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
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
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) {
            playSound('delete');
            onDeleteRecurring(deletingId);
            setDeletingId(null);
          }
        }}
        title={t.deleteRecurring}
        message={
          lang === 'lo'
            ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການປະຈຳນີ້? (ລາຍການທີ່ເຄີຍບັນທຶກໄປແລ້ວຈະຍັງຄົງຢູ່)'
            : 'Are you sure you want to delete this recurring schedule?'
        }
        lang={lang}
      />
    </div>
  );
};
