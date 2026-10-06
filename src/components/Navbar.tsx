import React from 'react';
import { Language, Currency, User } from '../types';
import { getT } from '../utils/translations';
import { Plus, Globe, Settings as SettingsIcon, Printer, Tag, LogOut, User as UserIcon } from 'lucide-react';
import { playSound } from '../utils/audio';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
  onOpenCategories: () => void;
  onOpenPrintReport: () => void;
  currentUser?: User | null;
  onOpenUserProfile?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  currency,
  setCurrency,
  onOpenAddModal,
  onOpenSettings,
  onOpenCategories,
  onOpenPrintReport,
  currentUser,
  onOpenUserProfile,
  onLogout,
}) => {
  const t = getT(lang);

  const navItems = [
    { id: 'dashboard', label: t.dashboard },
    { id: 'transactions', label: t.transactions },
    { id: 'budgets', label: t.budgets },
    { id: 'accounts', label: t.accounts },
    { id: 'reports', label: t.reports },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
              ₭
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap">
              LaoExpense Pro
            </span>
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playSound('click');
                  setCurrentTab(item.id);
                }}
                className={`py-1 transition-colors whitespace-nowrap text-xs sm:text-sm font-medium border-b-2 ${
                  isActive
                    ? 'text-emerald-400 border-emerald-500'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Print Report Button */}
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onOpenPrintReport();
            }}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 hover:text-slate-100 transition-colors"
            title={t.printReport}
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">{t.printReport}</span>
          </button>

          {/* Categories Manager trigger */}
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onOpenCategories();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-800"
            title={t.categoriesNav}
          >
            <Tag className="w-4 h-4" />
          </button>

          {/* Currency Switcher */}
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 font-mono focus:outline-none cursor-pointer hover:border-slate-700"
            >
              <option value="LAK">₭ LAK</option>
              <option value="THB">฿ THB</option>
              <option value="USD">$ USD</option>
            </select>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'lo' ? 'en' : 'lo')}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
            title="ປ່ຽນພາສາ / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">{lang === 'lo' ? 'ລາວ' : 'EN'}</span>
          </button>

          {/* Settings Modal trigger */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-800"
            title={t.settings}
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* User Account Profile Badge */}
          {currentUser && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  if (onOpenUserProfile) onOpenUserProfile();
                }}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
                title={lang === 'lo' ? `ບັນຊີ: ${currentUser.fullName} (${currentUser.phone})` : `User: ${currentUser.fullName}`}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm"
                  style={{ backgroundColor: currentUser.avatarColor || '#059669' }}
                >
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="hidden lg:block truncate max-w-[120px]">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 truncate">
                    {currentUser.fullName.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono leading-none truncate">
                    {currentUser.phone}
                  </div>
                </div>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    playSound('delete');
                    onLogout();
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors border border-transparent hover:border-rose-900/30"
                  title={lang === 'lo' ? 'ອອກຈາກລະບົບ (Log Out)' : 'Log Out'}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Primary CTA: Add Transaction */}
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onOpenAddModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.addTransaction}</span>
            <span className="sm:hidden">{lang === 'lo' ? '+ ບັນທຶກ' : '+ New'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                playSound('click');
                setCurrentTab(item.id);
              }}
              className={`px-2.5 py-1 text-xs whitespace-nowrap rounded-md font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
