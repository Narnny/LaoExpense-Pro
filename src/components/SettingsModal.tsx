import React, { useState, useRef } from 'react';
import { ExchangeRates, Language, Currency, LaoFontStyle, AppFontSize } from '../types';
import { getT } from '../utils/translations';
import { playSound } from '../utils/audio';
import { X, Download, Upload, RotateCcw, Trash2, Check, RefreshCw, Type } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeRates: ExchangeRates;
  onSaveRates: (rates: ExchangeRates) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fontStyle?: LaoFontStyle;
  setFontStyle?: (style: LaoFontStyle) => void;
  fontSize?: AppFontSize;
  setFontSize?: (size: AppFontSize) => void;
  onBackupJSON: () => void;
  onRestoreJSON: (jsonString: string) => void;
  onResetDemo: () => void;
  onClearAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  exchangeRates,
  onSaveRates,
  lang,
  setLang,
  currency,
  setCurrency,
  fontStyle = 'modern',
  setFontStyle,
  fontSize = 'normal',
  setFontSize,
  onBackupJSON,
  onRestoreJSON,
  onResetDemo,
  onClearAll,
}) => {
  const t = getT(lang);

  const [thbRate, setThbRate] = useState(exchangeRates.THB.toString());
  const [usdRate, setUsdRate] = useState(exchangeRates.USD.toString());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'clear' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    const thb = parseFloat(thbRate);
    const usd = parseFloat(usdRate);
    if (thb > 0 && usd > 0) {
      playSound('success');
      onSaveRates({
        LAK: 1,
        THB: thb,
        USD: usd,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          try {
            onRestoreJSON(content);
            playSound('success');
            alert(lang === 'lo' ? 'ກູ້ຄືນຂໍ້ມູນສຳເລັດແລ້ວ!' : 'Data restored successfully!');
            onClose();
          } catch {
            alert(lang === 'lo' ? 'ຮູບແບບໄຟລ໌ບໍ່ຖືກຕ້ອງ' : 'Invalid backup file format');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">{t.settings}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Currency & Language Preferences */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {lang === 'lo' ? 'ພາສາ ແລະ ສະກຸນເງິນເລີ່ມຕົ້ນ' : 'Display Preferences'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{lang === 'lo' ? 'ພາສາ' : 'Language'}</label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Language)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  <option value="lo">ພາສາລາວ (Lao)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">{t.currency}</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                >
                  <option value="LAK">₭ ກີບ (LAK)</option>
                  <option value="THB">฿ ບາດ (THB)</option>
                  <option value="USD">$ ໂດລາ (USD)</option>
                </select>
              </div>
            </div>

            {/* Typography & Noto Sans Lao Settings */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {lang === 'lo' ? 'ແບບຟ້ອນ Noto Sans Lao' : 'Noto Sans Lao Style'}
                </label>
                <select
                  value={fontStyle}
                  onChange={(e) => {
                    if (setFontStyle) setFontStyle(e.target.value as LaoFontStyle);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="modern">Noto Sans Lao (ທັນສະໄໝ)</option>
                  <option value="looped">Noto Sans Lao Looped (ມີຫົວ)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {lang === 'lo' ? 'ຂະໜາດຕົວໜັງສື' : 'Font Size'}
                </label>
                <select
                  value={fontSize}
                  onChange={(e) => {
                    if (setFontSize) setFontSize(e.target.value as AppFontSize);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="normal">{lang === 'lo' ? 'ປົກກະຕິ (Normal)' : 'Normal'}</option>
                  <option value="large">{lang === 'lo' ? 'ໃຫຍ່ສະບາຍຕາ (Large)' : 'Large'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Exchange Rates */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.exchangeRatesNote}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'lo' ? 'ຄິດໄລ່ທຽບເທົ່າເປັນເງິນກີບ (1 Unit = X LAK)' : 'Value in LAK per unit'}
                </p>
              </div>
              {savedSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  {lang === 'lo' ? 'ບັນທຶກແລ້ວ' : 'Saved'}
                </span>
              )}
            </div>

            <form onSubmit={handleSaveRates} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">1 THB (ບາດ) =</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      value={thbRate}
                      onChange={(e) => setThbRate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                    <span className="text-xs text-slate-500 font-mono">₭</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">1 USD (ໂດລາ) =</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      value={usdRate}
                      onChange={(e) => setUsdRate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                    <span className="text-xs text-slate-500 font-mono">₭</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              >
                {lang === 'lo' ? 'ອັບເດດອັດຕາແລກປ່ຽນ' : 'Update Exchange Rates'}
              </button>
            </form>
          </div>

          {/* Backup & Data Persistence */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {lang === 'lo' ? 'ການຈັດການຂໍ້ມູນ & ສຳຮອງ' : 'Data Management & Backup'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {lang === 'lo'
                ? 'ຂໍ້ມູນຂອງທ່ານຖືກບັນທຶກໄວ້ໃນ LocalStorage ຂອງບຣາວເຊີຢ່າງປອດໄພ. ທ່ານສາມາດດາວໂຫຼດສຳຮອງ ຫຼື ນຳເຂົ້າໄດ້ທຸກເວລາ.'
                : 'Data is persistently stored in browser LocalStorage. You can export or restore backups anytime.'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onBackupJSON}
                className="flex items-center justify-center gap-1.5 p-2.5 text-xs font-medium text-slate-200 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.backupData}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 p-2.5 text-xs font-medium text-slate-200 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.restoreData}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setConfirmAction('reset');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 p-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.resetDemo}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setConfirmAction('clear');
                }}
                className="flex items-center justify-center gap-1.5 p-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-lg transition-colors border border-rose-900/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearAll}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
          >
            {t.cancel}
          </button>
        </div>
      </div>

      {/* In-app Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction === 'reset') {
            onResetDemo();
            playSound('success');
            onClose();
          } else if (confirmAction === 'clear') {
            onClearAll();
            playSound('delete');
            onClose();
          }
          setConfirmAction(null);
        }}
        title={confirmAction === 'clear' ? t.clearAll : t.resetDemo}
        message={
          confirmAction === 'clear'
            ? t.confirmClear
            : lang === 'lo'
            ? 'ຕ້ອງການໂຫຼດຂໍ້ມູນຕົວຢ່າງຄືນໃໝ່ແທ້ບໍ່?'
            : 'Reset to demo transactions?'
        }
        lang={lang}
      />
    </div>
  );
};
