import React, { useState } from 'react';
import {
  AttendanceRecord,
  AttendanceSettings,
  SchoolClass,
  Student,
  StudentWarningStatus,
  WarningLetter,
} from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StudentProfileModal } from '../../components/attendance/StudentProfileModal';
import { AddAttendanceModal } from '../../components/attendance/AddAttendanceModal';
import { sortSchoolClasses } from '../../utils/classOrder';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  AlertTriangle,
  FileCheck2,
  Calendar,
  ArrowUpRight,
  Plus,
  Upload,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface AdminDashboardProps {
  students: Student[];
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  warnings: WarningLetter[];
  studentStatuses: StudentWarningStatus[];
  settings: AttendanceSettings;
  onNavigate: (view: string) => void;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  classes,
  attendance,
  warnings,
  studentStatuses,
  settings,
  onNavigate,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const userName = user?.name ? user.name.toUpperCase() : 'PENTADBIR';
  const [selectedStudentStatus, setSelectedStudentStatus] = useState<StudentWarningStatus | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Kira statistik sekolah
  const activeAttendance = attendance.filter((a) => !a.isDeleted);
  const totalAbsences = activeAttendance.length;
  const eligibleAbsences = activeAttendance.filter((a) => a.countsTowardsWarning).length;
  const doctorLettersCount = activeAttendance.filter((a) => !a.countsTowardsWarning).length;

  const warning1Issued = warnings.filter((w) => w.warningType === 'warning1').length;
  const warning2Issued = warnings.filter((w) => w.warningType === 'warning2').length;
  const warning3Issued = warnings.filter((w) => w.warningType === 'warning3').length;

  const needingActionStudents = studentStatuses.filter(
    (s) =>
      s.status === 'warning1_needed' ||
      s.status === 'warning2_needed' ||
      s.status === 'warning3_needed' ||
      s.status === 'expulsion_needed'
  );

  // Data Graf Mengikut Kelas
  const classData = sortSchoolClasses(classes).map((cls) => {
    const classRecords = activeAttendance.filter((a) => a.className === cls.className);
    const counted = classRecords.filter((a) => a.countsTowardsWarning).length;
    const doc = classRecords.filter((a) => !a.countsTowardsWarning).length;
    return {
      name: cls.className,
      'Dikira (Amaran)': counted,
      'Surat Doktor': doc,
    };
  });

  // Data Graf Mengikut Bulan
  const monthMap: Record<string, number> = {
    '01': 0, '02': 0, '03': 0, '04': 0, '05': 0, '06': 0,
    '07': 0, '08': 0, '09': 0, '10': 0, '11': 0, '12': 0,
  };
  const monthNames: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mac', '04': 'Apr', '05': 'Mei', '06': 'Jun',
    '07': 'Jul', '08': 'Ogo', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dis',
  };

  activeAttendance.forEach((a) => {
    const parts = a.date.split('-');
    if (parts.length >= 2 && monthMap[parts[1]] !== undefined) {
      monthMap[parts[1]]++;
    }
  });

  const monthlyTrendData = Object.keys(monthMap).map((k) => ({
    month: monthNames[k],
    Jumlah: monthMap[k],
  }));

  return (
    <div className="space-y-6">
      {/* Header Dashboard & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Dashboard Pentadbir Sekolah</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            SELAMAT DATANG KEPADA {userName}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan ketidakhadiran murid & status rekod pengeluaran surat amaran peringkat sekolah
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('admin_import')}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Excel/CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Kehadiran</span>
          </button>
        </div>
      </div>

      {/* 6 Statistik Keseluruhan Sekolah (Requirement 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Jumlah Murid */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Jumlah Murid</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{students.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">{classes.length} buah kelas aktif</div>
        </div>

        {/* 2. Jumlah Ketidakhadiran */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Ketidakhadiran</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAbsences}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">
            {doctorLettersCount} surat cuti sakit
          </div>
        </div>

        {/* 3. Murid Perlu Tindakan */}
        <div className="rounded-xl bg-rose-50/50 border border-rose-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase">Perlu Tindakan</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-800">{needingActionStudents.length}</div>
          <div className="text-[10px] text-rose-600 font-medium mt-1">Menanti tindakan guru</div>
        </div>

        {/* 4. Surat Amaran 1 */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Amaran 1</span>
            <FileCheck2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{warning1Issued}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Threshold: ≥ {settings.warning1Threshold || 10} hari
          </div>
        </div>

        {/* 5. Surat Amaran 2 */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Amaran 2</span>
            <FileCheck2 className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{warning2Issued}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Threshold: +{settings.warning2Threshold || 10} hari selepas Amaran 1
          </div>
        </div>

        {/* 6. Surat Amaran 3 */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Amaran 3</span>
            <FileCheck2 className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{warning3Issued}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Threshold: +{settings.warning3Threshold || 20} hari selepas Amaran 2
          </div>
        </div>
      </div>

      {/* 2 Buah Carta Analisis Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graf Ketidakhadiran Mengikut Kelas */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ketidakhadiran Mengikut Kelas
              </h3>
              <p className="text-[11px] text-slate-500">
                Perbandingan rekod dikira amaran vs surat doktor
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              Bar Chart
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Dikira (Amaran)" fill="#e11d48" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Surat Doktor" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graf Ketidakhadiran Mengikut Bulan */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Trend Ketidakhadiran Bulanan (2026)
              </h3>
              <p className="text-[11px] text-slate-500">
                Taburan rekod mengikut bulan persekolahan
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              Trend Line
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Jumlah"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Senarai Murid Memerlukan Tindakan Amaran Segera */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
            <h3 className="text-sm font-bold text-slate-900">
              Murid Memerlukan Tindakan Surat Amaran Segera ({needingActionStudents.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('admin_warnings')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Buka Modul Amaran</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Murid</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jumlah Tidak Hadir</th>
                <th className="py-3 px-4">Surat Doktor</th>
                <th className="py-3 px-4">Hari Dikira Amaran</th>
                <th className="py-3 px-4">Status Diperlukan</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {needingActionStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <span>Tiada murid yang memerlukan pengeluaran surat amaran segera buat masa ini.</span>
                  </td>
                </tr>
              ) : (
                needingActionStudents.map((item) => (
                  <tr key={item.student.id} className="hover:bg-rose-50/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.student.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.student.studentNumber || 'ID: ' + item.student.id.substring(0, 10)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {item.student.className}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.totalAbsences} hari</td>
                    <td className="py-3 px-4 font-medium text-emerald-700">
                      {item.doctorLetterCount} hari
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {item.eligibleAbsences} hari
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentStatus(item)}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 shadow-2xs inline-flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profil & Surat</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Kehadiran Manual */}
      <AddAttendanceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={onRefreshData}
      />

      {/* Modal Profil Murid & Rekod Surat */}
      {selectedStudentStatus && (
        <StudentProfileModal
          isOpen={Boolean(selectedStudentStatus)}
          onClose={() => setSelectedStudentStatus(null)}
          statusData={selectedStudentStatus}
          attendanceRecords={attendance}
          onDataChanged={onRefreshData}
        />
      )}
    </div>
  );
};
