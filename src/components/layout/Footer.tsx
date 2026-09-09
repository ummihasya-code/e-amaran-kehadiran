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
        <div className="font-semibold text-slate-600 tracking-wide">
          © 2026 Cikgu Xie™ — All Rights Reserved
        </div>
      </div>
    </footer>
  );
};
