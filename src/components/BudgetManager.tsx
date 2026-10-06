import React, { useState } from 'react';
import { Budget, Category, Transaction, Currency, Language } from '../types';
import { getT } from '../utils/translations';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { playSound } from '../utils/audio';
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  currency: Currency;
  lang: Language;
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (budgetId: string) => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  budgets,
  categories,
  transactions,
  currency,
  lang,
  onSaveBudget,
  onDeleteBudget,
}) => {
  const t = getT(lang);

  const [isEditing, setIsEditing] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string>('');
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const catMap = new Map(categories.map(c => [c.id, c]));
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Calculate current month's spending per category
  const now = new Date();
  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'expense';
  });

  const categorySpentMap = new Map<string, number>();
  currentMonthTransactions.forEach(t => {
    const cur = categorySpentMap.get(t.categoryId) || 0;
    categorySpentMap.set(t.categoryId, cur + t.amountInBase);
  });

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpentInBudgeted = budgets.reduce((sum, b) => sum + (categorySpentMap.get(b.categoryId) || 0), 0);
  const overallBurnRate = totalBudgeted > 0 ? Math.round((totalSpentInBudgeted / totalBudgeted) * 100) : 0;

  const handleOpenAdd = () => {
    playSound('click');
    const existingCatIds = new Set(budgets.map(b => b.categoryId));
    const availableCat = expenseCategories.find(c => !existingCatIds.has(c.id));
    if (availableCat) {
      setEditingCategoryId(availableCat.id);
      setBudgetAmount('1000000');
    } else {
      setEditingCategoryId(expenseCategories[0]?.id || '');
      setBudgetAmount('1000000');
    }
    setIsEditing(true);
  };

  const handleEdit = (budget: Budget) => {
    playSound('click');
    setEditingCategoryId(budget.categoryId);
    setBudgetAmount(budget.amount.toString());
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(budgetAmount);
    if (!num || num <= 0 || !editingCategoryId) return;

    playSound('success');
    const existing = budgets.find(b => b.categoryId === editingCategoryId);
    onSaveBudget({
      id: existing ? existing.id : `b_${editingCategoryId}`,
      categoryId: editingCategoryId,
      amount: num,
      period: 'monthly',
    });

    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Title & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            {t.budgets}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'lo' ? 'ກຳນົດເພດານລາຍຈ່າຍປະຈຳເດືອນ ແລະ ຄວບຄຸມບໍ່ໃຫ້ເກີນງົບ' : 'Monthly spending caps and burn-rate guardrails'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addBudget}</span>
        </button>
      </div>

      {/* Aggregate Budget Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">{lang === 'lo' ? 'ງົບປະມານລວມທັງໝົດ' : 'Total Allocated'}</div>
          <div className="text-xl font-bold text-slate-100 font-mono tabular-nums">
            {formatCurrency(totalBudgeted, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {budgets.length} {lang === 'lo' ? 'ໝວດໝູ່ທີ່ຕັ້ງງົບ' : 'budgeted categories'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">{t.spent}</div>
          <div className="text-xl font-bold text-rose-400 font-mono tabular-nums">
            {formatCurrency(totalSpentInBudgeted, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {overallBurnRate}% {lang === 'lo' ? 'ຂອງງົບປະມານ' : 'of allocated budget'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">{t.remaining}</div>
          <div className={`text-xl font-bold font-mono tabular-nums ${totalBudgeted - totalSpentInBudgeted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalBudgeted - totalSpentInBudgeted, currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalBudgeted - totalSpentInBudgeted >= 0 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {lang === 'lo' ? 'ຢູ່ໃນເກນທີ່ດີ' : 'Within budget limits'}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                {lang === 'lo' ? 'ເກີນງົບປະມານແລ້ວ' : 'Exceeded target'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Budget Form Drawer */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-4">
          <div className="text-sm font-semibold text-slate-100">
            {lang === 'lo' ? 'ຕັ້ງຄ່າງົບປະມານໝວດໝູ່' : 'Set Category Budget'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t.category}</label>
              <select
                value={editingCategoryId}
                onChange={(e) => setEditingCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {lang === 'lo' ? c.nameLo : c.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t.monthlyLimit} (LAK ₭)</label>
              <input
                type="number"
                step="any"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="3,000,000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold font-mono text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
            >
              {t.save}
            </button>
          </div>
        </form>
      )}

      {/* Category Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map(b => {
          const cat = catMap.get(b.categoryId);
          const spent = categorySpentMap.get(b.categoryId) || 0;
          const percent = Math.round((spent / b.amount) * 100);
          const isOver = spent > b.amount;
          const isWarning = percent >= 80 && percent <= 100;
          const diff = b.amount - spent;

          return (
            <div
              key={b.id}
              className={`p-4 rounded-xl border transition-all ${
                isOver
                  ? 'bg-rose-950/20 border-rose-800/60'
                  : isWarning
                  ? 'bg-amber-950/20 border-amber-800/60'
                  : 'bg-slate-900/80 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: cat?.color || '#3b82f6' }}
                  >
                    <CategoryIcon iconName={cat?.icon || 'HelpCircle'} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      {cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : b.categoryId}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {lang === 'lo' ? 'ເພດານປະຈຳເດືອນ' : 'Monthly cap'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(b)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      playSound('click');
                      setDeletingBudgetId(b.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono tabular-nums pt-1">
                  <span className="text-slate-400">
                    {t.spent}: <strong className="text-slate-200">{formatCurrency(spent, currency)}</strong>
                  </span>
                  <span className="text-slate-400">
                    {t.remaining}: <strong className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(diff, currency)}</strong>
                  </span>
                </div>
              </div>

              {/* Warning tag */}
              {isOver && (
                <div className="mt-3 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.budgetExceededBy} {formatCurrency(Math.abs(diff), currency)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* In-app Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deletingBudgetId !== null}
        onClose={() => setDeletingBudgetId(null)}
        onConfirm={() => {
          if (deletingBudgetId) {
            playSound('delete');
            onDeleteBudget(deletingBudgetId);
            setDeletingBudgetId(null);
          }
        }}
        title={lang === 'lo' ? 'ຢືນຢັນການລຶບງົບປະມານ' : 'Confirm Delete Budget'}
        message={lang === 'lo' ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບງົບປະມານໝວດໝູ່ນີ້?' : 'Are you sure you want to delete this budget limit?'}
        lang={lang}
      />
    </div>
  );
};
