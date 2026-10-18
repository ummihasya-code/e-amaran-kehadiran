import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { dataService } from '../../services/dataService';
import { formatDateDisplay } from '../../utils/dateUtils';
import { History, Search, RefreshCw, Shield, Clock, FileText, ArrowLeft } from 'lucide-react';

interface AdminAuditTrailProps {
  onBack?: () => void;
}

export const AdminAuditTrail: React.FC<AdminAuditTrailProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getAuditLogs();
      setLogs(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchAction = log.action.toLowerCase().includes(q);
    const matchUser = log.userName.toLowerCase().includes(q);
    const matchType = log.targetType.toLowerCase().includes(q);
    const matchId = log.targetId.toLowerCase().includes(q);
    return matchAction || matchUser || matchType || matchId;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs"
              title="Kembali ke Tetapan"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <span>Jejak Audit Sistem (Audit Trail)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Log rekod integriti bagi semua aktiviti pengimportan, kemaskini status surat dan pindaan data (disembunyikan dari menu harian)
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Carian Log */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari log mengikut tindakan, nama pengguna atau entiti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Jadual Senarai Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Tarikh & Masa</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Tindakan</th>
                <th className="py-3 px-4">Kategori Entiti</th>
                <th className="py-3 px-4">Butiran / Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Tiada rekod audit dijumpai.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedTime = dateObj.toLocaleString('ms-MY', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono">
                        {formattedTime}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{log.userName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 uppercase">
                        {log.targetType}
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <pre className="text-[11px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded border border-slate-100 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 1)}
                        </pre>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
