import React from 'react';
import { StudentWarningStatus } from '../../types';

interface StatusBadgeProps {
  status?: StudentWarningStatus['status'];
  label?: string;
  variant?: 'normal' | 'monitor' | 'warning_needed' | 'warning_issued' | 'exempt' | 'counted' | 'active' | 'inactive';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, variant }) => {
  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
  let dotColor = 'bg-slate-400';
  let text = label || 'Status';

  if (status) {
    switch (status) {
      case 'normal':
        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        dotColor = 'bg-emerald-500';
        text = label || '🟢 Normal';
        break;
      case 'monitor':
        badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
        dotColor = 'bg-amber-500';
        text = label || '🟡 Pantau';
        break;
      case 'warning1_needed':
        badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
        dotColor = 'bg-rose-600 animate-pulse';
        text = label || '🔴 Amaran 1 Diperlukan';
        break;
      case 'warning1_issued':
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dotColor = 'bg-emerald-500';
        text = label || '🟢 Amaran 1 Telah Dikeluarkan';
        break;
      case 'warning2_needed':
        badgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
        dotColor = 'bg-rose-600 animate-pulse';
        text = label || '🔴 Amaran 2 Diperlukan';
        break;
      case 'warning2_issued':
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dotColor = 'bg-emerald-500';
        text = label || '🟢 Amaran 2 Telah Dikeluarkan';
        break;
      case 'warning3_needed':
        badgeClass = 'bg-red-100 text-red-900 border-red-300 font-semibold';
        dotColor = 'bg-red-700 animate-ping';
        text = label || '🔴 Amaran 3 (Terakhir) Diperlukan';
        break;
      case 'warning3_issued':
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dotColor = 'bg-emerald-500';
        text = label || '🟢 Amaran 3 Telah Dikeluarkan';
        break;
      case 'expulsion_needed':
        badgeClass = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
        dotColor = 'bg-purple-700 animate-pulse';
        text = label || '⚠️ Tindakan Buang Sekolah (Amaran)';
        break;
    }
  } else if (variant) {
    switch (variant) {
      case 'exempt':
        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        dotColor = 'bg-emerald-500';
        text = label || '🟢 Tidak dikira (Surat Doktor)';
        break;
      case 'counted':
        badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
        dotColor = 'bg-rose-500';
        text = label || '🔴 Dikira Untuk Amaran';
        break;
      case 'active':
        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        dotColor = 'bg-emerald-500';
        text = label || 'Aktif';
        break;
      case 'inactive':
        badgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
        dotColor = 'bg-slate-400';
        text = label || 'Tidak Aktif';
        break;
      case 'warning_needed':
        badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
        dotColor = 'bg-rose-600';
        text = label || '🔴 Perlu Tindakan';
        break;
      case 'warning_issued':
        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        dotColor = 'bg-emerald-500';
        text = label || '🟢 Telah Dikeluarkan';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${badgeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      <span>{text}</span>
    </span>
  );
};
