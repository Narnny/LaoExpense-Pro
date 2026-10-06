import React from 'react';
import { Language, Currency, User } from '../types';
import { getT } from '../utils/translations';
import { playSound } from '../utils/audio';
import { Search, Plus, Globe, Menu } from 'lucide-react';

interface TopHeaderProps {
  lang: Language;
  setLang: (lang: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  onOpenAddModal: () => void;
  currentUser?: User | null;
  onOpenUserProfile?: () => void;
  onOpenMobileMenu: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  lang,
  setLang,
  currency,
  setCurrency,
  onOpenAddModal,
  currentUser,
  onOpenUserProfile,
  onOpenMobileMenu,
  searchQuery = '',
  setSearchQuery,
}) => {
  const t = getT(lang);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0a1128]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shadow-md shadow-black/20 no-print">
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search input matching screenshot: "Enter keywords..." */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            placeholder={lang === 'lo' ? 'ຄົ້ນຫາລາຍການ (Enter keywords)...' : 'Enter keywords...'}
            className="w-full bg-[#0f1b38] border border-slate-700/80 hover:border-slate-600 rounded-lg pl-3 pr-9 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-[#132247] transition-all shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Right: Currency, Language, + Add Transaction, User profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Currency Switcher */}
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="bg-[#0f1b38] border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2 py-1.5 font-mono focus:outline-none cursor-pointer hover:border-slate-600 transition-colors"
        >
          <option value="LAK">₭ LAK</option>
          <option value="THB">฿ THB</option>
          <option value="USD">$ USD</option>
        </select>

        {/* Language Toggle */}
        <button
          type="button"
          onClick={() => setLang(lang === 'lo' ? 'en' : 'lo')}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-[#0f1b38] border border-slate-700/80 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-colors"
          title="ປ່ຽນພາສາ / Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[11px] font-semibold">{lang === 'lo' ? 'ລາວ' : 'EN'}</span>
        </button>

        {/* Primary CTA: + New Transaction */}
        <button
          type="button"
          onClick={() => {
            playSound('click');
            onOpenAddModal();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-md shadow-blue-900/40 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.addTransaction}</span>
          <span className="sm:hidden">{lang === 'lo' ? '+ ບັນທຶກ' : '+ New'}</span>
        </button>

        {/* User Profile Pill matching screenshot: "Welcome Freddie Mercury" with avatar */}
        {currentUser && (
          <button
            type="button"
            onClick={() => {
              playSound('click');
              if (onOpenUserProfile) onOpenUserProfile();
            }}
            className="flex items-center gap-2 pl-2 border-l border-slate-800 text-left hover:opacity-90 transition-opacity group"
            title={currentUser.fullName}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md ring-2 ring-blue-500/30"
              style={{ backgroundColor: currentUser.avatarColor || '#2563eb' }}
            >
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="hidden md:block leading-tight">
              <span className="text-[10px] text-slate-400 block font-normal">
                {lang === 'lo' ? 'ສະບາຍດີ' : 'Welcome'}
              </span>
              <span className="text-xs font-bold text-slate-100 block truncate max-w-[130px]">
                {currentUser.fullName}
              </span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
