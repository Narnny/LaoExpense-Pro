import React from 'react';
import { X, Download, Printer } from 'lucide-react';
import { playSound } from '../utils/audio';

interface SlipViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  slipUrl: string | null;
  lang: 'lo' | 'en';
}

export const SlipViewerModal: React.FC<SlipViewerModalProps> = ({
  isOpen,
  onClose,
  slipUrl,
  lang,
}) => {
  if (!isOpen || !slipUrl) return null;

  const handleDownload = () => {
    playSound('click');
    const a = document.createElement('a');
    a.href = slipUrl;
    a.download = `Payment_Slip_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    playSound('click');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payment Slip</title>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff; }
              img { max-width: 90%; max-height: 90%; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${slipUrl}" onload="window.print(); window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <span className="text-sm font-semibold text-slate-100">
            {lang === 'lo' ? 'ຮູບສະລິບ / ໃບຮັບເງິນທີ່ແນບໄວ້' : 'Attached Slip / Receipt'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title={lang === 'lo' ? 'ດາວໂຫຼດຮູບ' : 'Download image'}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title={lang === 'lo' ? 'ພິມຮູບສະລິບ' : 'Print image'}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="p-4 flex items-center justify-center overflow-auto bg-slate-950 flex-1 min-h-[300px]">
          <img
            src={slipUrl}
            alt="Payment Slip"
            className="max-h-[70vh] max-w-full object-contain rounded border border-slate-800 shadow-md"
          />
        </div>
      </div>
    </div>
  );
};
