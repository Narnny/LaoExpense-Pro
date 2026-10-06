import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  lang?: 'lo' | 'en';
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  lang = 'lo',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-rose-500/30 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-100">
              {title || (lang === 'lo' ? 'ຢືນຢັນການລຶບຂໍ້ມູນ' : 'Confirm Deletion')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {message || (lang === 'lo' ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການນີ້? ການກະທຳນີ້ບໍ່ສາມາດກູ້ຄືນໄດ້.' : 'Are you sure you want to delete this? This action cannot be undone.')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {lang === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === 'lo' ? 'ຢືນຢັນລຶບ' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
