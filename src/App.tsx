/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Transaction,
  Category,
  Account,
  Budget,
  Currency,
  Language,
  ExchangeRates,
  DateFilterType,
  LaoFontStyle,
  AppFontSize,
  User,
  RecurringTransaction,
  RecurringFrequency,
} from './types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
  DEFAULT_BUDGETS,
  DEFAULT_EXCHANGE_RATES,
  generateInitialTransactions,
} from './data/defaultData';
import { getT } from './utils/translations';
import { playSound } from './utils/audio';

import {
  getCurrentUser,
  setCurrentUser as setStoredCurrentUser,
  loadUserTransactions,
  saveUserTransactions,
  loadUserCategories,
  saveUserCategories,
  loadUserAccounts,
  saveUserAccounts,
  loadUserBudgets,
  saveUserBudgets,
  loadUserRecurring,
  saveUserRecurring,
  syncUserDataToServer,
  syncUserProfileToServer,
} from './utils/authStorage';

import {
  processRecurringTransactions,
  triggerManualRecurringRun,
} from './utils/recurringEngine';

import { AuthScreen } from './components/AuthScreen';
import { UserProfileModal } from './components/UserProfileModal';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { RealtimeDashboard } from './components/RealtimeDashboard';
import { TransactionList } from './components/TransactionList';
import { RecurringManager } from './components/RecurringManager';
import { BudgetManager } from './components/BudgetManager';
import { AccountsManager } from './components/AccountsManager';
import { ReportsView } from './components/ReportsView';
import { TransactionModal } from './components/TransactionModal';
import { SettingsModal } from './components/SettingsModal';
import { PrintReportModal } from './components/PrintReportModal';
import { TransactionVoucherModal } from './components/TransactionVoucherModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { SlipViewerModal } from './components/SlipViewerModal';
import { CategoryIcon } from './components/CategoryIcon';
import { Check } from 'lucide-react';

const STORAGE_KEYS = {
  RATES: 'lao_expense_rates_v2',
  CURRENCY: 'lao_expense_curr_v2',
  LANG: 'lao_expense_lang_v2',
  FONT_STYLE: 'lao_expense_font_style_v2',
  FONT_SIZE: 'lao_expense_font_size_v2',
};

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // User-scoped Data States
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const user = getCurrentUser();
    if (user) return loadUserTransactions(user.id);
    return [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const user = getCurrentUser();
    if (user) return loadUserCategories(user.id);
    return DEFAULT_CATEGORIES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const user = getCurrentUser();
    if (user) {
      const accs = loadUserAccounts(user.id);
      return accs.map(a => {
        if (a.initialBalance === 1000000 || a.initialBalance === 200000 || a.initialBalance === 12500000 || a.initialBalance === 1800000) {
          return { ...a, initialBalance: 0 };
        }
        return a;
      });
    }
    return DEFAULT_ACCOUNTS.map(a => ({ ...a, initialBalance: 0 }));
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const user = getCurrentUser();
    if (user) return loadUserBudgets(user.id);
    return DEFAULT_BUDGETS;
  });

  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>(() => {
    const user = getCurrentUser();
    if (user) return loadUserRecurring(user.id);
    return [];
  });

  // App Configuration
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RATES);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_EXCHANGE_RATES;
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENCY);
      if (stored && ['LAK', 'THB', 'USD'].includes(stored)) return stored as Currency;
    } catch {}
    return 'LAK';
  });

  const [lang, setLang] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LANG);
      if (stored && ['lo', 'en'].includes(stored)) return stored as Language;
    } catch {}
    return 'lo';
  });

  const t = getT(lang);

  const [fontStyle, setFontStyle] = useState<LaoFontStyle>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FONT_STYLE);
      if (stored === 'modern' || stored === 'looped') return stored as LaoFontStyle;
    } catch {}
    return 'modern';
  });

  const [fontSize, setFontSize] = useState<AppFontSize>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
      if (stored === 'normal' || stored === 'large') return stored as AppFontSize;
    } catch {}
    return 'normal';
  });

  // UI State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [voucherTransaction, setVoucherTransaction] = useState<Transaction | null>(null);
  const [viewingSlipUrl, setViewingSlipUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Re-load data whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      syncUserProfileToServer(currentUser);
      setTransactions(loadUserTransactions(currentUser.id));
      setCategories(loadUserCategories(currentUser.id));
      const loadedAccs = loadUserAccounts(currentUser.id).map(a => {
        if (a.initialBalance === 1000000 || a.initialBalance === 200000 || a.initialBalance === 12500000 || a.initialBalance === 1800000) {
          return { ...a, initialBalance: 0 };
        }
        return a;
      });
      setAccounts(loadedAccs);
      saveUserAccounts(currentUser.id, loadedAccs);
      setBudgets(loadUserBudgets(currentUser.id));
      setRecurringList(loadUserRecurring(currentUser.id));
    } else {
      setTransactions([]);
      setRecurringList([]);
    }
  }, [currentUser?.id]);

  // Sync isolated data per user
  useEffect(() => {
    if (currentUser) {
      saveUserTransactions(currentUser.id, transactions);
    }
  }, [transactions, currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      saveUserCategories(currentUser.id, categories);
    }
  }, [categories, currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      saveUserAccounts(currentUser.id, accounts);
    }
  }, [accounts, currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      saveUserBudgets(currentUser.id, budgets);
    }
  }, [budgets, currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      saveUserRecurring(currentUser.id, recurringList);
      syncUserDataToServer(currentUser.id);
    }
  }, [recurringList, currentUser?.id]);

  // Check and auto-post any due recurring transactions
  useEffect(() => {
    if (!currentUser || recurringList.length === 0) return;
    const { newTransactions, updatedRecurring, hasChanges } = processRecurringTransactions(
      recurringList,
      exchangeRates
    );
    if (hasChanges && newTransactions.length > 0) {
      setTransactions(prev => [...newTransactions, ...prev]);
      setRecurringList(updatedRecurring);
      showToast(
        lang === 'lo'
          ? `ລະບົບໄດ້ບັນທຶກລາຍການປະຈຳ ${newTransactions.length} ລາຍການລົງບັນຊີແລ້ວ!`
          : `Auto-recorded ${newTransactions.length} recurring transactions!`
      );
    }
  }, [currentUser?.id]);

  // Global settings sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(exchangeRates));
    } catch {}
  }, [exchangeRates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENCY, currency);
    } catch {}
  }, [currency]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LANG, lang);
    } catch {}
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FONT_STYLE, fontStyle);
    } catch {}
  }, [fontStyle]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
    } catch {}
  }, [fontSize]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Auth Handlers
  const handleLogout = () => {
    setStoredCurrentUser(null);
    setCurrentUser(null);
    showToast(lang === 'lo' ? 'ອອກຈາກລະບົບສຳເລັດແລ້ວ' : 'Logged out successfully');
  };

  const handleSwitchAccount = () => {
    setStoredCurrentUser(null);
    setCurrentUser(null);
  };

  // Transaction CRUD (User Scoped)
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    if (!currentUser) return;
    const t = getT(lang);
    if (editingId) {
      setTransactions(prev =>
        prev.map(item =>
          item.id === editingId
            ? { ...item, ...txData, userId: currentUser.id }
            : item
        )
      );
      showToast(t.transactionUpdated);
    } else {
      const newTx: Transaction = {
        ...txData,
        userId: currentUser.id,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      setTransactions(prev => [newTx, ...prev]);
      showToast(t.transactionAdded);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const t = getT(lang);
    setTransactions(prev => prev.filter(item => item.id !== id));
    showToast(t.transactionDeleted);
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    if (!currentUser) return;
    const t = getT(lang);
    playSound('income');
    const now = new Date();
    const duplicated: Transaction = {
      ...tx,
      userId: currentUser.id,
      id: `tx_${Date.now()}_dup`,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      createdAt: Date.now(),
    };
    setTransactions(prev => [duplicated, ...prev]);
    showToast(`${t.duplicate} ${tx.title}`);
  };

  // Recurring CRUD
  const handleSaveRecurring = (rec: RecurringTransaction) => {
    if (!currentUser) return;
    const userRec = { ...rec, userId: currentUser.id };
    setRecurringList(prev => {
      const idx = prev.findIndex(r => r.id === rec.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = userRec;
        return copy;
      }
      return [userRec, ...prev];
    });
    showToast(lang === 'lo' ? 'ບັນທຶກລາຍການປະຈຳສຳເລັດ!' : 'Recurring schedule saved!');
  };

  const handleDeleteRecurring = (id: string) => {
    setRecurringList(prev => prev.filter(r => r.id !== id));
    showToast(lang === 'lo' ? 'ລຶບລາຍການປະຈຳສຳເລັດ!' : 'Recurring schedule deleted!');
  };

  const handleManualTriggerRecurring = (rec: RecurringTransaction) => {
    if (!currentUser) return;
    const { newTx, updatedRec } = triggerManualRecurringRun(rec, exchangeRates);
    setTransactions(prev => [newTx, ...prev]);
    setRecurringList(prev => prev.map(r => r.id === rec.id ? updatedRec : r));
    showToast(lang === 'lo' ? `ປະມວນຜົນ ${rec.title} ລົງບັນຊີແລ້ວ!` : `Recorded ${rec.title}!`);
  };

  const handleProcessAllDueRecurring = () => {
    if (!currentUser) return;
    const { newTransactions, updatedRecurring, hasChanges } = processRecurringTransactions(
      recurringList,
      exchangeRates
    );
    if (hasChanges && newTransactions.length > 0) {
      setTransactions(prev => [...newTransactions, ...prev]);
      setRecurringList(updatedRecurring);
      showToast(
        lang === 'lo'
          ? `ບັນທຶກລາຍການຮອດກຳນົດ ${newTransactions.length} ລາຍການສຳເລັດ!`
          : `Processed ${newTransactions.length} due transactions!`
      );
    } else {
      showToast(lang === 'lo' ? 'ບໍ່ມີລາຍການທີ່ຮອດກຳນົດ' : 'No schedules currently due');
    }
  };

  // Budget CRUD
  const handleSaveBudget = (budget: Budget) => {
    if (!currentUser) return;
    const t = getT(lang);
    const userBudget = { ...budget, userId: currentUser.id };
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.categoryId === budget.categoryId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = userBudget;
        return copy;
      }
      return [...prev, userBudget];
    });
    showToast(t.budgetUpdated);
  };

  const handleDeleteBudget = (budgetId: string) => {
    const t = getT(lang);
    setBudgets(prev => prev.filter(b => b.id !== budgetId));
    showToast(t.budgetDeleted);
  };

  // Account CRUD
  const handleAddAccount = (acc: Account) => {
    if (!currentUser) return;
    const t = getT(lang);
    setAccounts(prev => [...prev, { ...acc, userId: currentUser.id }]);
    showToast(t.accountAdded);
  };

  const handleEditAccount = (acc: Account) => {
    if (!currentUser) return;
    const t = getT(lang);
    setAccounts(prev => prev.map(a => a.id === acc.id ? { ...acc, userId: currentUser.id } : a));
    showToast(t.accountUpdated);
  };

  const handleDeleteAccount = (accId: string) => {
    const t = getT(lang);
    setAccounts(prev => prev.filter(a => a.id !== accId));
    showToast(t.accountDeleted);
  };

  // Category CRUD
  const handleAddCategory = (cat: Category) => {
    if (!currentUser) return;
    const t = getT(lang);
    setCategories(prev => [...prev, { ...cat, userId: currentUser.id }]);
    showToast(t.categoryAdded);
  };

  const handleEditCategory = (cat: Category) => {
    if (!currentUser) return;
    const t = getT(lang);
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...cat, userId: currentUser.id } : c));
    showToast(t.categoryUpdated);
  };

  const handleDeleteCategory = (catId: string) => {
    const t = getT(lang);
    setCategories(prev => prev.filter(c => c.id !== catId));
    showToast(t.categoryDeleted);
  };

  // Backup to JSON (Scoped to Current User)
  const handleBackupJSON = () => {
    if (!currentUser) return;
    playSound('click');
    const data = {
      version: '2.5',
      exportedAt: new Date().toISOString(),
      user: {
        id: currentUser.id,
        username: currentUser.username,
        phone: currentUser.phone,
        fullName: currentUser.fullName,
      },
      transactions,
      categories,
      accounts,
      budgets,
      recurringList,
      exchangeRates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LaoExpense_${currentUser.username}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Restore from JSON
  const handleRestoreJSON = (jsonString: string) => {
    const data = JSON.parse(jsonString);
    if (data.transactions && Array.isArray(data.transactions)) {
      setTransactions(data.transactions.map((tx: any) => ({ ...tx, userId: currentUser?.id })));
    }
    if (data.categories && Array.isArray(data.categories)) {
      setCategories(data.categories.map((c: any) => ({ ...c, userId: currentUser?.id })));
    }
    if (data.accounts && Array.isArray(data.accounts)) {
      setAccounts(data.accounts.map((a: any) => ({ ...a, userId: currentUser?.id })));
    }
    if (data.budgets && Array.isArray(data.budgets)) {
      setBudgets(data.budgets.map((b: any) => ({ ...b, userId: currentUser?.id })));
    }
    if (data.recurringList && Array.isArray(data.recurringList)) {
      setRecurringList(data.recurringList.map((r: any) => ({ ...r, userId: currentUser?.id })));
    }
    if (data.exchangeRates) {
      setExchangeRates(data.exchangeRates);
    }
  };

  // Reset Demo Data for current user
  const handleResetDemo = () => {
    if (!currentUser) return;
    const initial = generateInitialTransactions().map(tx => ({ ...tx, userId: currentUser.id }));
    setTransactions(initial);
    setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c, userId: currentUser.id })));
    setAccounts(DEFAULT_ACCOUNTS.map(a => ({ ...a, userId: currentUser.id })));
    setBudgets(DEFAULT_BUDGETS.map(b => ({ ...b, userId: currentUser.id })));
    setExchangeRates(DEFAULT_EXCHANGE_RATES);
    showToast(lang === 'lo' ? 'ໂຫຼດຂໍ້ມູນຕົວຢ່າງສຳເລັດແລ້ວ' : 'Loaded sample demo data');
  };

  // Clear All for current user
  const handleClearAll = () => {
    setTransactions([]);
    showToast(lang === 'lo' ? 'ລຶບຂໍ້ມູນລາຍການທັງໝົດແລ້ວ' : 'All transactions cleared');
  };

  // If user is not authenticated, display the login/registration screen
  if (!currentUser) {
    return (
      <div
        className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${
          fontSize === 'large' ? 'text-base' : 'text-sm'
        }`}
        style={{ fontFamily: "'Noto Sans Lao', 'Noto Sans', sans-serif" }}
      >
        <AuthScreen
          onSuccess={(user) => {
            setCurrentUser(user);
            showToast(lang === 'lo' ? `ຍິນດີຕ້ອນຮັບ, ${user.fullName}!` : `Welcome, ${user.fullName}!`);
          }}
          lang={lang}
        />
        {/* Lightweight Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 rounded-xl shadow-xl text-xs font-medium backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200 no-print">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans ${
        fontSize === 'large' ? 'text-base' : 'text-sm'
      }`}
      style={{ fontFamily: "'Noto Sans Lao', 'Noto Sans', sans-serif" }}
    >
      {/* Left Sidebar (Dark Navy matching screenshot) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPrintReport={() => setIsPrintModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area (Offset on desktop for fixed sidebar) */}
      <div className="lg:pl-64 flex flex-col min-h-screen bg-[#070d1e]">
        {/* Top Header Bar matching screenshot */}
        <TopHeader
          lang={lang}
          setLang={setLang}
          currency={currency}
          setCurrency={setCurrency}
          onOpenAddModal={() => {
            setEditingTransaction(null);
            setIsAddModalOpen(true);
          }}
          currentUser={currentUser}
          onOpenUserProfile={() => setIsProfileModalOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (q.trim() && currentTab !== 'transactions' && currentTab !== 'dashboard') {
              setCurrentTab('transactions');
            }
          }}
        />

        {/* Viewport Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <RealtimeDashboard
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              budgets={budgets}
              currency={currency}
              lang={lang}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              onOpenAddModal={() => {
                setEditingTransaction(null);
                setIsAddModalOpen(true);
              }}
              onEditTransaction={(tr) => {
                setEditingTransaction(tr);
                setIsAddModalOpen(true);
              }}
              onNavigateToTransactions={() => setCurrentTab('transactions')}
              onNavigateToBudgets={() => setCurrentTab('budgets')}
              onQuickAddTransaction={(tx) => handleSaveTransaction(tx)}
              onViewSlip={(url) => setViewingSlipUrl(url)}
              currentUser={currentUser}
            />
          )}

          {currentTab === 'transactions' && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <TransactionList
                transactions={transactions}
                categories={categories}
                accounts={accounts}
                currency={currency}
                lang={lang}
                onOpenAddModal={() => {
                  setEditingTransaction(null);
                  setIsAddModalOpen(true);
                }}
                onEditTransaction={(tr) => {
                  setEditingTransaction(tr);
                  setIsAddModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onDuplicateTransaction={handleDuplicateTransaction}
                onPrintVoucher={(tr) => setVoucherTransaction(tr)}
                onOpenPrintReport={() => setIsPrintModalOpen(true)}
                onViewSlip={(url) => setViewingSlipUrl(url)}
              />
            </div>
          )}

          {currentTab === 'recurring' && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <RecurringManager
                recurringList={recurringList}
                categories={categories}
                accounts={accounts}
                currency={currency}
                exchangeRates={exchangeRates}
                lang={lang}
                onSaveRecurring={handleSaveRecurring}
                onDeleteRecurring={handleDeleteRecurring}
                onManualTrigger={handleManualTriggerRecurring}
                onProcessAllDue={handleProcessAllDueRecurring}
              />
            </div>
          )}

          {currentTab === 'budgets' && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <BudgetManager
                budgets={budgets}
                categories={categories}
                transactions={transactions}
                currency={currency}
                lang={lang}
                onSaveBudget={handleSaveBudget}
                onDeleteBudget={handleDeleteBudget}
              />
            </div>
          )}

          {currentTab === 'accounts' && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <AccountsManager
                accounts={accounts}
                transactions={transactions}
                currency={currency}
                lang={lang}
                onAddAccount={handleAddAccount}
                onEditAccount={handleEditAccount}
                onDeleteAccount={handleDeleteAccount}
                onOpenTransferModal={() => {
                  setEditingTransaction(null);
                  setIsAddModalOpen(true);
                }}
              />
            </div>
          )}

          {currentTab === 'categories' && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{t.categoriesNav}</h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'lo' ? 'ຈັດການໝວດໝູ່ລາຍຮັບ ແລະ ລາຍຈ່າຍ' : 'Manage income and expense categories'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  + {t.addCategory}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: c.color }}>
                        <CategoryIcon iconName={c.icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100">{lang === 'lo' ? c.nameLo : c.nameEn}</div>
                        <div className="text-[10px] text-slate-400">{c.type === 'income' ? 'ລາຍຮັບ' : 'ລາຍຈ່າຍ'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'reports' && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-sm">
              <ReportsView
                transactions={transactions}
                categories={categories}
                accounts={accounts}
                currency={currency}
                lang={lang}
                onOpenPrintModal={() => setIsPrintModalOpen(true)}
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-slate-800/80 bg-[#0a1128] py-4 px-6 text-center text-xs text-slate-400 no-print mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              © 2026 LaoExpense Pro · {lang === 'lo' ? `ຜູ້ໃຊ້ງານ: ${currentUser?.fullName} (${currentUser?.phone})` : `User: ${currentUser?.fullName}`}
            </span>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>1 USD ≈ {exchangeRates.USD.toLocaleString()} ₭</span>
              <span aria-hidden="true">·</span>
              <span>1 THB ≈ {exchangeRates.THB.toLocaleString()} ₭</span>
            </div>
          </div>
        </footer>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
        lang={lang}
      />

      {/* Transaction Modal (Add / Edit) */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        onCreateRecurring={({
          title,
          type,
          amount,
          currency: recCurr,
          categoryId,
          accountId,
          frequency,
          startDate,
          autoPost,
          note,
        }) => {
          let amountInBase = amount;
          if (recCurr === 'THB') amountInBase = Math.round(amount * exchangeRates.THB);
          else if (recCurr === 'USD') amountInBase = Math.round(amount * exchangeRates.USD);

          const newRec: RecurringTransaction = {
            id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: currentUser?.id,
            title,
            type,
            amount,
            currency: recCurr,
            amountInBase,
            categoryId,
            accountId,
            frequency,
            startDate,
            nextRunDate: startDate,
            active: true,
            autoPost,
            note,
            createdAt: Date.now(),
          };
          handleSaveRecurring(newRec);
        }}
        editingTransaction={editingTransaction}
        categories={categories}
        accounts={accounts}
        exchangeRates={exchangeRates}
        currentCurrency={currency}
        lang={lang}
      />

      {/* Print Report Modal (Financial Statement) */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        currency={currency}
        lang={lang}
      />

      {/* Single Transaction Voucher Print Modal */}
      <TransactionVoucherModal
        isOpen={voucherTransaction !== null}
        onClose={() => setVoucherTransaction(null)}
        transaction={voucherTransaction}
        categories={categories}
        accounts={accounts}
        currency={currency}
        lang={lang}
      />

      {/* Category Manager Modal (Add / Edit / Delete Categories) */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        lang={lang}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Slip Image Viewer Modal */}
      <SlipViewerModal
        isOpen={viewingSlipUrl !== null}
        onClose={() => setViewingSlipUrl(null)}
        slipUrl={viewingSlipUrl}
        lang={lang}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        exchangeRates={exchangeRates}
        onSaveRates={setExchangeRates}
        lang={lang}
        setLang={setLang}
        currency={currency}
        setCurrency={setCurrency}
        fontStyle={fontStyle}
        setFontStyle={setFontStyle}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onBackupJSON={handleBackupJSON}
        onRestoreJSON={handleRestoreJSON}
        onResetDemo={handleResetDemo}
        onClearAll={handleClearAll}
      />

      {/* Lightweight Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white border border-slate-700 rounded-xl shadow-xl text-xs font-medium backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200 no-print">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
