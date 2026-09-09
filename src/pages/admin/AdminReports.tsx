import React, { useState } from 'react';
import {
  AttendanceRecord,
  SchoolClass,
  Student,
  StudentWarningStatus,
  WarningLetter,
} from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, Stethoscope, Users, School } from 'lucide-react';
import { sortSchoolClasses } from '../../utils/classOrder';

interface AdminReportsProps {
  students: Student[];
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  warnings: WarningLetter[];
  studentStatuses: StudentWarningStatus[];
}

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#e11d48', '#8b5cf6', '#64748b'];

export const AdminReports: React.FC<AdminReportsProps> = ({
  students,
  classes,
  attendance,
  warnings,
  studentStatuses,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  const activeAttendance = attendance.filter((a) => {
    if (a.isDeleted) return false;
    if (selectedClass !== 'ALL' && a.className !== selectedClass) return false;
    return true;
  });

  // Taburan Sebab Ketidakhadiran
  const reasonMap: Record<string, number> = {};
  activeAttendance.forEach((a) => {
    const r = a.reason.trim().toUpperCase() || 'TIADA MAKLUMAN';
    reasonMap[r] = (reasonMap[r] || 0) + 1;
  });

  const reasonPieData = Object.keys(reasonMap)
    .map((k) => ({ name: k, value: reasonMap[k] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Taburan Status Amaran Murid
  const statusCounts = {
    Normal: studentStatuses.filter((s) => s.status === 'normal').length,
    Pantau: studentStatuses.filter((s) => s.status === 'monitor').length,
    'Amaran 1': studentStatuses.filter(
      (s) => s.status === 'warning1_needed' || s.status === 'warning1_issued'
    ).length,
    'Amaran 2': studentStatuses.filter(
      (s) => s.status === 'warning2_needed' || s.status === 'warning2_issued'
    ).length,
    'Amaran 3': studentStatuses.filter(
      (s) => s.status === 'warning3_needed' || s.status === 'warning3_issued'
    ).length,
  };

  const statusPieData = Object.keys(statusCounts).map((k) => ({
    name: k,
    value: (statusCounts as any)[k],
  }));

  // Perbandingan Kehadiran Mengikut Kelas
  const classComparison = sortSchoolClasses(classes).map((cls) => {
    const list = attendance.filter((a) => a.className === cls.className && !a.isDeleted);
    const counted = list.filter((a) => a.countsTowardsWarning).length;
    const doc = list.filter((a) => !a.countsTowardsWarning).length;
    return {
      name: cls.className,
      'Dikira Amaran': counted,
      'Surat Doktor': doc,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan & Analisis Ketidakhadiran
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis punca ketidakhadiran, status pengeluaran surat amaran dan perbandingan rentas kelas
          </p>
        </div>

        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Kelas Keseluruhan</option>
            {sortSchoolClasses(classes).map((c) => (
              <option key={c.id} value={c.className}>
                Kelas {c.className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2 Buah Carta Analisis Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Punca Ketidakhadiran */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Taburan Sebab / Punca Ketidakhadiran
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Analisis jenis ketidakhadiran yang paling kerap dilaporkan
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reasonPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name.substring(0, 12)} (${(percent * 100).toFixed(0)}%)`}
                >
                  {reasonPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Taburan Status Amaran Murid */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Status Kategori Amaran Keseluruhan Murid
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Pecahan murid mengikut tahap risiko dan peringkat surat
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusPieData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Perbandingan Rentas Kelas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Perbandingan Ketidakhadiran Rentas Kelas
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Bilangan hari ketidakhadiran dikira amaran berbanding sijil sakit hospital/klinik
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classComparison}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Dikira Amaran" fill="#e11d48" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Surat Doktor" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
