import React, { useState } from 'react';
import { Account, Transaction, Currency, Language } from '../types';
import { getT } from '../utils/translations';
import { formatCurrency } from '../utils/formatters';
import { playSound } from '../utils/audio';
import { Plus, Building2, Wallet, PiggyBank, CreditCard, ArrowRightLeft, Edit2, Trash2, Check, X } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AccountsManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  currency: Currency;
  lang: Language;
  onAddAccount: (acc: Account) => void;
  onEditAccount: (acc: Account) => void;
  onDeleteAccount: (accountId: string) => void;
  onOpenTransferModal: () => void;
}

export const AccountsManager: React.FC<AccountsManagerProps> = ({
  accounts,
  transactions,
  currency,
  lang,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onOpenTransferModal,
}) => {
  const t = getT(lang);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // Form states
  const [nameLo, setNameLo] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [type, setType] = useState<Account['type']>('bank');
  const [initialBalance, setInitialBalance] = useState('0');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#2563eb');

  // Compute live account balance
  const computedAccounts = accounts.map(acc => {
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

  const totalAssets = computedAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

  const handleOpenAdd = () => {
    playSound('click');
    setEditingAccount(null);
    setNameLo('');
    setNameEn('');
    setType('bank');
    setInitialBalance('0');
    setAccountNumber('');
    setColor('#2563eb');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    playSound('click');
    setEditingAccount(acc);
    setNameLo(acc.nameLo);
    setNameEn(acc.nameEn);
    setType(acc.type);
    setInitialBalance(acc.initialBalance.toString());
    setAccountNumber(acc.accountNumber || '');
    setColor(acc.color);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameLo.trim()) return;

    if (editingAccount) {
      playSound('success');
      onEditAccount({
        ...editingAccount,
        nameLo: nameLo.trim(),
        nameEn: nameEn.trim() || nameLo.trim(),
        type,
        initialBalance: parseFloat(initialBalance) || 0,
        accountNumber: accountNumber.trim() || undefined,
        color,
      });
    } else {
      playSound('success');
      const newAcc: Account = {
        id: `acc_${Date.now()}`,
        nameLo: nameLo.trim(),
        nameEn: nameEn.trim() || nameLo.trim(),
        type,
        initialBalance: parseFloat(initialBalance) || 0,
        currency: 'LAK',
        accountNumber: accountNumber.trim() || undefined,
        color,
      };
      onAddAccount(newAcc);
    }

    setIsFormOpen(false);
  };

  const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            {t.accounts}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'lo' ? 'ຈັດການບັນຊີທະນາຄານ ແລະ ກະເປົາເງິນສົດ (ເພີ່ມ, ແກ້ໄຂ, ລົບ)' : 'Multi-account management (Add, Edit, Delete)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTransferModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang === 'lo' ? 'ໂອນເງິນລະຫວ່າງບັນຊີ' : 'Transfer'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addAccount}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Card */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider">{t.totalBalance}</span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-100 font-mono tabular-nums mt-0.5">
            {formatCurrency(totalAssets, currency)}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono tabular-nums">
          <div>
            <span className="text-slate-500 block">{lang === 'lo' ? 'ທະນາຄານ' : 'Banks'}:</span>
            <strong className="text-slate-200">
              {formatCurrency(computedAccounts.filter(a => a.type === 'bank').reduce((s, a) => s + a.currentBalance, 0), currency)}
            </strong>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <span className="text-slate-500 block">{lang === 'lo' ? 'ເງິນສົດ' : 'Cash'}:</span>
            <strong className="text-slate-200">
              {formatCurrency(computedAccounts.filter(a => a.type === 'cash').reduce((s, a) => s + a.currentBalance, 0), currency)}
            </strong>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <span className="text-slate-500 block">{lang === 'lo' ? 'ເງິນຝາກປະຢັດ' : 'Savings'}:</span>
            <strong className="text-slate-200">
              {formatCurrency(computedAccounts.filter(a => a.type === 'savings').reduce((s, a) => s + a.currentBalance, 0), currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Add / Edit Account Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="p-5 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">
              {editingAccount ? t.editAccount : t.addAccount}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t.accountName} (ລາວ) *</label>
              <input
                type="text"
                placeholder="ຕົວຢ່າງ: BCEL One, ເງິນສົດ"
                value={nameLo}
                onChange={(e) => setNameLo(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t.accountType}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Account['type'])}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="bank">{t.bank}</option>
                <option value="cash">{t.cash}</option>
                <option value="savings">{t.savings}</option>
                <option value="wallet">{t.wallet}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t.initialBalance} (LAK ₭)</label>
              <input
                type="number"
                step="any"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t.accountNumber}</label>
              <input
                type="text"
                placeholder="010-12-..."
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{lang === 'lo' ? 'ສີສັນ' : 'Color'}:</span>
              <div className="flex items-center gap-1.5">
                {colors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t.save}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {computedAccounts.map(acc => {
          const txCount = transactions.filter(t => t.accountId === acc.id || t.toAccountId === acc.id).length;
          return (
            <div
              key={acc.id}
              className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: acc.color }}
                  >
                    {acc.type === 'bank' && <Building2 className="w-4 h-4" />}
                    {acc.type === 'cash' && <Wallet className="w-4 h-4" />}
                    {acc.type === 'savings' && <PiggyBank className="w-4 h-4" />}
                    {acc.type === 'wallet' && <CreditCard className="w-4 h-4" />}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(acc)}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                      title={t.editAccount}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {accounts.length > 1 && (
                      <button
                        onClick={() => {
                          playSound('click');
                          setDeletingAccountId(acc.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                        title={t.deleteAccount}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-100 truncate">
                  {lang === 'lo' ? acc.nameLo : acc.nameEn}
                </h3>
                {acc.accountNumber && (
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {acc.accountNumber}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                <span className="text-[11px] text-slate-500">
                  {txCount} {lang === 'lo' ? 'ລາຍການ' : 'txns'}
                </span>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-100 font-mono tabular-nums block">
                    {formatCurrency(acc.currentBalance, currency)}
                  </span>
                  {acc.currentBalance === 0 && txCount === 0 && (
                    <span className="text-[10px] text-slate-500 block">
                      {lang === 'lo' ? 'ຍັງບໍ່ມີຍອດເງິນ' : 'Zero balance'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* In-app Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deletingAccountId !== null}
        onClose={() => setDeletingAccountId(null)}
        onConfirm={() => {
          if (deletingAccountId) {
            playSound('delete');
            onDeleteAccount(deletingAccountId);
            setDeletingAccountId(null);
          }
        }}
        title={lang === 'lo' ? 'ຢືນຢັນການລຶບບັນຊີ' : 'Confirm Delete Account'}
        message={t.confirmDeleteAccount}
        lang={lang}
      />
    </div>
  );
};
