import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer id="app-footer" className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>e-AMARAN KEHADIRAN</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 font-normal">Sistem Pemantauan Ketidakhadiran & Rekod Surat Amaran Murid</span>
        </div>
        <div className="font-bold text-slate-700 tracking-wide flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold tracking-wider">
            BY CIKGU XIE
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 font-normal">© 2026 Hak Cipta Terpelihara</span>
        </div>
      </div>
    </footer>
  );
};
