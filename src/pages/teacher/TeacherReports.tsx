import React, { useState } from 'react';
import {
  AttendanceRecord,
  SchoolClass,
  Student,
  StudentWarningStatus,
  WarningLetter,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DataExportModal } from '../../components/common/DataExportModal';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { BarChart3, Stethoscope, AlertTriangle, Users, FileSpreadsheet } from 'lucide-react';

interface TeacherReportsProps {
  students: Student[];
  attendance: AttendanceRecord[];
  studentStatuses: StudentWarningStatus[];
  warnings?: WarningLetter[];
  classes?: SchoolClass[];
}

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#e11d48', '#8b5cf6'];

export const TeacherReports: React.FC<TeacherReportsProps> = ({
  students,
  attendance,
  studentStatuses,
  warnings = [],
  classes = [],
}) => {
  const { user } = useAuth();
  const assignedClass = user?.assignedClasses[0] || '3 AA';
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const myStudents = students.filter((s) => s.className === assignedClass);
  const myAttendance = attendance.filter(
    (a) => a.className === assignedClass && !a.isDeleted
  );
  const myStatuses = studentStatuses.filter((s) => s.student.className === assignedClass);

  // Punca ketidakhadiran dalam kelas
  const reasonMap: Record<string, number> = {};
  myAttendance.forEach((a) => {
    const r = a.reason.trim().toUpperCase() || 'TIADA MAKLUMAN';
    reasonMap[r] = (reasonMap[r] || 0) + 1;
  });

  const reasonPieData = Object.keys(reasonMap)
    .map((k) => ({ name: k, value: reasonMap[k] }))
    .sort((a, b) => b.value - a.value);

  // Status Amaran Murid Kelas
  const statusCounts = {
    Normal: myStatuses.filter((s) => s.status === 'normal').length,
    Pantau: myStatuses.filter((s) => s.status === 'monitor').length,
    'Amaran 1': myStatuses.filter(
      (s) => s.status === 'warning1_needed' || s.status === 'warning1_issued'
    ).length,
    'Amaran 2': myStatuses.filter(
      (s) => s.status === 'warning2_needed' || s.status === 'warning2_issued'
    ).length,
    'Amaran 3': myStatuses.filter(
      (s) => s.status === 'warning3_needed' || s.status === 'warning3_issued'
    ).length,
  };

  const statusBarData = Object.keys(statusCounts).map((k) => ({
    name: k,
    Murid: (statusCounts as any)[k],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-1">
            <span>Kelas {assignedClass}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan Analitik Kelas {assignedClass}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistik kehadiran dan profil amaran bagi murid di bawah jagaan anda
          </p>
        </div>

        <button
          type="button"
          id="btn-open-export-teacher-reports"
          onClick={() => setIsExportModalOpen(true)}
          className="px-3.5 py-2 text-xs font-bold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Eksport (CSV / Sheets)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Punca Ketidakhadiran */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Taburan Sebab Ketidakhadiran Kelas {assignedClass}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Perincian jenis ketidakhadiran yang dilaporkan dalam kelas
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
                  label={({ name, percent }) =>
                    `${name.substring(0, 10)} (${(percent * 100).toFixed(0)}%)`
                  }
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
            Tahap Status Amaran Murid ({assignedClass})
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Bilangan murid mengikut peringkat amaran semasa
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBarData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Murid" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal Eksport Data Kelas */}
      <DataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        studentStatuses={studentStatuses}
        attendance={attendance}
        warnings={warnings}
        classes={classes}
        initialDataset="student_warnings_master"
        defaultClass={assignedClass}
        lockClass={true}
      />
    </div>
  );
};
