import React from 'react';
import { Language, User } from '../types';
import { getT } from '../utils/translations';
import { playSound } from '../utils/audio';
import {
  LayoutDashboard,
  Receipt,
  CalendarClock,
  PiggyBank,
  Wallet,
  Tag,
  BarChart3,
  Settings as SettingsIcon,
  Printer,
  LogOut,
  X,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  onOpenSettings: () => void;
  onOpenPrintReport: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  onOpenSettings,
  onOpenPrintReport,
  currentUser,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}) => {
  const t = getT(lang);

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'transactions', label: t.transactions, icon: Receipt },
    { id: 'recurring', label: t.recurring || 'ລາຍການປະຈຳ', icon: CalendarClock },
    { id: 'budgets', label: t.budgets, icon: PiggyBank },
    { id: 'accounts', label: t.accounts, icon: Wallet },
    { id: 'categories', label: t.categoriesNav, icon: Tag },
    { id: 'reports', label: t.reports, icon: BarChart3 },
  ];

  const handleNavClick = (tabId: string) => {
    playSound('click');
    setCurrentTab(tabId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar (Dark Navy matching screenshot) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a1128] text-slate-300 flex flex-col justify-between border-r border-slate-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/60 shrink-0">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-3 text-left focus:outline-none group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-white text-base shadow-md group-hover:scale-105 transition-transform">
                ₭
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white block leading-none">
                  LaoExpense Pro
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                  FINANCIAL OS
                </span>
              </div>
            </button>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-slate-400 hover:text-white rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Navigation Menu */}
          <div className="px-3 py-4 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {lang === 'lo' ? 'ເມນູຫຼັກ (Main Menu)' : 'Main Menu'}
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Group / Tools */}
          <div className="px-3 py-2 space-y-1 border-t border-slate-800/60 mt-2">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {lang === 'lo' ? 'ເຄື່ອງມື & ຕັ້ງຄ່າ' : 'System & Tools'}
            </div>

            <button
              onClick={() => {
                playSound('click');
                onOpenSettings();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-4 h-4 text-slate-400" />
                <span>{t.settings}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              onClick={() => {
                playSound('click');
                onOpenPrintReport();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Printer className="w-4 h-4 text-slate-400" />
                <span>{t.printReport}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* User Card at Bottom */}
        {currentUser && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2.5 truncate">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                  style={{ backgroundColor: currentUser.avatarColor || '#059669' }}
                >
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-200 truncate leading-tight">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {currentUser.phone}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  title={lang === 'lo' ? 'ອອກຈາກລະບົບ' : 'Logout'}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
