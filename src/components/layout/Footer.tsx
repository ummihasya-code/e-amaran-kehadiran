import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer id="app-footer" className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500 pb-20 lg:pb-4">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-1.5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 font-medium text-slate-700">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-bold tracking-tight">e-AMARAN KEHADIRAN</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-normal">Sistem Pemantauan Ketidakhadiran & Rekod Surat Amaran Murid</span>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2 mt-0.5">
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold tracking-widest text-xs shadow-xs">
            BY CIKGU XIE
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-medium">© 2026 Hak Cipta Terpelihara</span>
        </div>
      </div>
    </footer>
  );
};

