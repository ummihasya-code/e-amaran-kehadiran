import React, { useState } from 'react';
import { AttendanceRecord, Student } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { Search, Calendar, Stethoscope, AlertCircle } from 'lucide-react';

interface TeacherAttendanceProps {
  attendance: AttendanceRecord[];
  students: Student[];
}

export const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({
  attendance,
  students,
}) => {
  const { user } = useAuth();
  const assignedClass = user?.assignedClasses[0] || '3 AA';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'COUNTED' | 'DOCTOR'>('ALL');

  // Penapisan data: Hanya kelas guru sahaja
  const myAttendance = attendance.filter((a) => {
    if (a.className !== assignedClass) return false;
    if (a.isDeleted) return false;

    if (filterType === 'COUNTED' && !a.countsTowardsWarning) return false;
    if (filterType === 'DOCTOR' && a.countsTowardsWarning) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.studentName?.toLowerCase().includes(q);
      const matchReason = a.reason?.toLowerCase().includes(q);
      const matchDate = a.date?.includes(q);
      if (!matchName && !matchReason && !matchDate) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-1">
          <span>Kelas {assignedClass}</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Rekod Kehadiran Kelas {assignedClass}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Penyenaraian sejarah ketidakhadiran murid bagi kelas anda
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama murid, tarikh atau sebab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Rekod ({myAttendance.length})</option>
            <option value="COUNTED">🔴 Dikira Untuk Amaran Sahaja</option>
            <option value="DOCTOR">🟢 Surat Doktor Sahaja</option>
          </select>
        </div>
      </div>

      {/* Rekod Kehadiran: Responsif Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {myAttendance.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tiada rekod ketidakhadiran ditemui bagi kelas ini.
            </div>
          ) : (
            myAttendance.map((rec, idx) => (
              <div
                key={rec.id}
                className={`p-4 space-y-2 transition ${
                  !rec.countsTowardsWarning ? 'bg-emerald-50/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{rec.studentName}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {formatDateDisplay(rec.date)}
                      </div>
                    </div>
                  </div>
                  <div>
                    {rec.countsTowardsWarning ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
                        🔴 Dikira
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                        🟢 Surat Doktor
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">Sebab:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                      rec.reason === 'TIADA MAKLUMAN'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-100 font-semibold'
                    }`}
                  >
                    {rec.reason}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop / Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Bil</th>
                <th className="py-3 px-4">Tarikh Tidak Hadir</th>
                <th className="py-3 px-4">Nama Murid</th>
                <th className="py-3 px-4">Sebab Tidak Hadir</th>
                <th className="py-3 px-4">Kiraan Amaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tiada rekod ketidakhadiran ditemui bagi kelas ini.
                  </td>
                </tr>
              ) : (
                myAttendance.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    className={`hover:bg-slate-50 transition ${
                      !rec.countsTowardsWarning ? 'bg-emerald-50/15' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {formatDateDisplay(rec.date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{rec.studentName}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          rec.reason === 'TIADA MAKLUMAN'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-100 font-semibold'
                        }`}
                      >
                        {rec.reason}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {rec.countsTowardsWarning ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                          🔴 Dikira
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          🟢 Tidak dikira (Surat Doktor)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
