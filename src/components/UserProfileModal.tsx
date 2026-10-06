import React from 'react';
import { User, Language } from '../types';
import { X, LogOut, Users, Phone, Shield, Calendar, UserCheck } from 'lucide-react';
import { playSound } from '../utils/audio';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onSwitchAccount: () => void;
  lang: Language;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onSwitchAccount,
  lang,
}) => {
  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-slate-100">
              {lang === 'lo' ? 'ຂໍ້ມູນບັນຊີຜູ້ໃຊ້ (User Profile)' : 'User Account Profile'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md shrink-0"
            style={{ backgroundColor: currentUser.avatarColor || '#059669' }}
          >
            {currentUser.fullName.charAt(0)}
          </div>
          <div className="truncate">
            <h3 className="text-sm font-bold text-slate-100 truncate">
              {currentUser.fullName}
            </h3>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-emerald-400" />
              <span>{currentUser.phone}</span>
            </p>
            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono mt-1 border border-emerald-500/20">
              @{currentUser.username}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="space-y-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'lo' ? 'ສະຖານະຄວາມປອດໄພ' : 'Security Status'}</span>
            </span>
            <span className="text-emerald-400 font-medium">
              {lang === 'lo' ? 'ແຍກຂໍ້ມູນສ່ວນຕົວ 100%' : 'Isolated Data Active'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'lo' ? 'ວັນທີສະໝັກ' : 'Member Since'}</span>
            </span>
            <span className="font-mono text-slate-300">
              {new Date(currentUser.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onClose();
              onSwitchAccount();
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-colors"
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>{lang === 'lo' ? 'ສະຫຼັບບັນຊີຜູ້ໃຊ້ອື່ນ (Switch User)' : 'Switch User'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('delete');
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>{lang === 'lo' ? 'ອອກຈາກລະບົບ (Log Out)' : 'Log Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
