import React from 'react';
import { Transaction, Category, Account, Currency, Language } from '../types';
import { getT } from '../utils/translations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { playSound } from '../utils/audio';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface TransactionVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: Category[];
  accounts: Account[];
  currency: Currency;
  lang: Language;
}

export const TransactionVoucherModal: React.FC<TransactionVoucherModalProps> = ({
  isOpen,
  onClose,
  transaction,
  categories,
  accounts,
  currency,
  lang,
}) => {
  const t = getT(lang);

  if (!isOpen || !transaction) return null;

  const cat = categories.find(c => c.id === transaction.categoryId);
  const acc = accounts.find(a => a.id === transaction.accountId);
  const toAcc = transaction.toAccountId ? accounts.find(a => a.id === transaction.toAccountId) : null;

  const isIncome = transaction.type === 'income';
  const isExpense = transaction.type === 'expense';
  const isTransfer = transaction.type === 'transfer';

  const voucherTitle = isIncome
    ? (lang === 'lo' ? 'ໃບສຳຄັນຮັບເງິນ (Receipt Voucher)' : 'Official Receipt Voucher')
    : isExpense
    ? (lang === 'lo' ? 'ໃບສຳຄັນຈ່າຍເງິນ (Payment Voucher)' : 'Payment Voucher')
    : (lang === 'lo' ? 'ໃບສຳຄັນໂອນເງິນ (Transfer Voucher)' : 'Transfer Voucher');

  const handlePrint = () => {
    playSound('click');
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header (No print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 shrink-0 no-print">
          <h2 className="text-sm font-semibold text-slate-100">{t.voucherReceipt}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printDocument}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-6 overflow-y-auto bg-slate-950 flex justify-center">
          <div
            className="w-full bg-white text-slate-900 p-6 sm:p-8 rounded-sm shadow-md print:shadow-none print:p-0 print:m-0 border border-slate-200 print:border-none"
            style={{ fontFamily: "'Noto Sans Lao', 'Noto Sans', sans-serif" }}
          >
            {/* Voucher Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-slate-900">
                {voucherTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">LaoExpense Pro · Financial Management System</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-3">
                <span>VOUCHER NO: #{transaction.id.replace('tx_', '').toUpperCase()}</span>
                <span>{formatDate(transaction.date, lang)} {transaction.time}</span>
              </div>
            </div>

            {/* Voucher Content */}
            <div className="space-y-3 text-xs mb-6">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">{t.title}:</span>
                <span className="font-semibold text-slate-900 text-right">{transaction.title}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">{t.category}:</span>
                <span className="font-medium text-slate-800">
                  {cat ? (lang === 'lo' ? cat.nameLo : cat.nameEn) : '-'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">{t.account}:</span>
                <span className="font-medium text-slate-800">
                  {acc ? (lang === 'lo' ? acc.nameLo : acc.nameEn) : '-'}
                  {toAcc && ` → ${lang === 'lo' ? toAcc.nameLo : toAcc.nameEn}`}
                </span>
              </div>

              {transaction.note && (
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{t.note}:</span>
                  <span className="text-slate-700 max-w-[240px] text-right">{transaction.note}</span>
                </div>
              )}

              {/* Amount Box */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded-sm flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider">{t.amount}:</span>
                <span className="text-lg font-bold font-mono tabular-nums text-slate-950">
                  {formatCurrency(transaction.amountInBase, currency)}
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-6 pt-6 mt-6 border-t border-slate-300 text-center text-xs">
              <div>
                <p className="font-semibold text-slate-800 mb-10">{t.payerPayee}</p>
                <div className="w-32 mx-auto border-b border-slate-400 mb-1" />
                <p className="text-[10px] text-slate-400">{t.signature}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-10">{t.approvedBy}</p>
                <div className="w-32 mx-auto border-b border-slate-400 mb-1" />
                <p className="text-[10px] text-slate-400">{t.signature}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
