import React, { useState } from 'react';
import {
  AttendanceRecord,
  AttendanceSettings,
  Student,
  StudentWarningStatus,
  WarningLetter,
  WarningType,
} from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StudentProfileModal } from '../../components/attendance/StudentProfileModal';
import { RecordWarningModal } from '../../components/attendance/RecordWarningModal';
import { useAuth } from '../../context/AuthContext';
import { formatDateDisplay } from '../../utils/dateUtils';
import {
  AlertTriangle,
  FileCheck2,
  Calendar,
  Users,
  Eye,
  Info,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface TeacherDashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  warnings: WarningLetter[];
  studentStatuses: StudentWarningStatus[];
  settings: AttendanceSettings;
  onRefreshData: () => void;
  onNavigate: (view: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  students,
  attendance,
  warnings,
  studentStatuses,
  settings,
  onRefreshData,
  onNavigate,
}) => {
  const { user } = useAuth();
  const assignedClass = user?.assignedClasses[0] || '3 AA';

  const [inspectingStatus, setInspectingStatus] = useState<StudentWarningStatus | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<{
    status: StudentWarningStatus;
    type: WarningType;
  } | null>(null);

  // Penapisan Ketat: Hanya Murid Kelas Guru Sahaja (Requirement 27)
  const myStudents = students.filter((s) => s.className === assignedClass);
  const myAttendance = attendance.filter(
    (a) => a.className === assignedClass && !a.isDeleted
  );
  const myStatuses = studentStatuses.filter((s) => s.student.className === assignedClass);

  // Murid yang memerlukan tindakan surat amaran atau tindakan disiplin
  const actionRequiredStudents = myStatuses.filter(
    (s) =>
      s.status === 'warning1_needed' ||
      s.status === 'warning2_needed' ||
      s.status === 'warning3_needed' ||
      s.status === 'expulsion_needed'
  );

  const w1Count = myStatuses.filter((s) => Boolean(s.warning1)).length;
  const w2Count = myStatuses.filter((s) => Boolean(s.warning2)).length;
  const w3Count = myStatuses.filter((s) => Boolean(s.warning3)).length;

  return (
    <div className="space-y-6">
      {/* Header Guru Kelas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-1">
            <span>Portal Guru Kelas: {assignedClass}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Dashboard Guru Kelas ({assignedClass})
          </h2>
          <p className="text-xs text-slate-500">
            Selamat kembali, <strong>{user?.name}</strong>. Anda mengurus pemantauan kehadiran bagi kelas {assignedClass}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('teacher_warnings')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-xs flex items-center gap-1.5 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Senarai Perlu Tindakan ({actionRequiredStudents.length})</span>
          </button>
        </div>
      </div>

      {/* ALERT GURU KELAS (Requirement 26) */}
      {actionRequiredStudents.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border-2 border-rose-300 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-rose-800">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                ⚠️ PERHATIAN GURU KELAS: TINDAKAN SURAT AMARAN DIPERLUKAN
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                Terdapat <strong>{actionRequiredStudents.length} orang murid</strong> dalam kelas {assignedClass} telah mencapai ambang ketidakhadiran tanpa sijil sakit hospital/klinik.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {actionRequiredStudents.map((item) => {
              const isExpulsion = item.status === 'expulsion_needed';
              const warningStage = isExpulsion
                ? 'Tindakan Buang Sekolah (Alert)'
                : item.status === 'warning1_needed'
                ? 'Surat Amaran 1'
                : item.status === 'warning2_needed'
                ? 'Surat Amaran 2'
                : 'Surat Amaran 3 (Terakhir)';

              const warningType: WarningType =
                item.status === 'warning1_needed'
                  ? 'warning1'
                  : item.status === 'warning2_needed'
                  ? 'warning2'
                  : 'warning3';

              return (
                <div
                  key={item.student.id}
                  className={`rounded-xl bg-white border p-4 shadow-xs flex flex-col justify-between space-y-3 ${
                    isExpulsion ? 'border-purple-300 ring-1 ring-purple-400/30' : 'border-rose-200'
                  }`}
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        {item.student.name}
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          isExpulsion ? 'bg-purple-100 text-purple-800' : 'text-rose-700 bg-rose-100'
                        }`}
                      >
                        {warningStage}
                      </span>
                    </div>

                    <div className="text-slate-600 leading-normal">
                      {isExpulsion ? (
                        <p>
                          <strong>Amaran Integriti:</strong> Murid melepasi ambang tindakan Buang Sekolah{' '}
                          ({item.breakdown?.expulsion.count}/{item.breakdown?.expulsion.threshold} hari selepas Amaran 3).
                          Sila kemukakan kepada Jawatankuasa Disiplin Sekolah.
                        </p>
                      ) : (
                        <>
                          <p>
                            <strong>Sebab:</strong> Mencapai ambang had hari tidak hadir mengikut logik Anchor Date.
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            <strong>Tindakan:</strong> Sila jana <strong>{warningStage}</strong> di <strong>idMe / MOEIS</strong> dan rekodkan tarikh di sini.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {isExpulsion ? (
                      <button
                        type="button"
                        onClick={() => setInspectingStatus(item)}
                        className="flex-1 py-2 px-3 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>LIHAT PERINCIAN KES</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setRecordingTarget({
                            status: item,
                            type: warningType,
                          })
                        }
                        className="flex-1 py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>REKOD SURAT DIKELUARKAN</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setInspectingStatus(item)}
                      className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      title="Lihat Profil Murid"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5 Kad Statistik Guru Kelas (Requirement 8) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* 1. Jumlah Murid Kelas */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Jumlah Murid</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{myStudents.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Kelas {assignedClass}</div>
        </div>

        {/* 2. Murid Perlu Tindakan */}
        <div className="rounded-xl bg-rose-50/50 border border-rose-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase">Perlu Tindakan</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800">{actionRequiredStudents.length}</div>
          <div className="text-[10px] text-rose-600 font-medium mt-1">Segera dikeluarkan</div>
        </div>

        {/* 3. Amaran 1 Dikeluarkan */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Amaran 1</span>
            <FileCheck2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{w1Count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Telah direkodkan</div>
        </div>

        {/* 4. Amaran 2 Dikeluarkan */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Amaran 2</span>
            <FileCheck2 className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{w2Count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Telah direkodkan</div>
        </div>

        {/* 5. Amaran 3 Dikeluarkan */}
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Amaran 3</span>
            <FileCheck2 className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{w3Count}</div>
          <div className="text-[10px] text-slate-500 mt-1">Peringkat Terakhir</div>
        </div>
      </div>

      {/* Senarai Penuh Murid Kelas 3 AA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Senarai Murid Kelas {assignedClass} ({myStudents.length} Murid)
            </h3>
            <p className="text-xs text-slate-500">
              Status kumulatif ketidakhadiran dan rekod surat amaran semasa
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Bil</th>
                <th className="py-3 px-4">Nama Murid</th>
                <th className="py-3 px-4">Jumlah Tidak Hadir</th>
                <th className="py-3 px-4">Surat Doktor</th>
                <th className="py-3 px-4">Hari Dikira Amaran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myStatuses.map((item, idx) => {
                const needsAction =
                  item.status === 'warning1_needed' ||
                  item.status === 'warning2_needed' ||
                  item.status === 'warning3_needed';

                return (
                  <tr
                    key={item.student.id}
                    className={`hover:bg-slate-50 transition ${
                      needsAction ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.student.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.student.studentNumber || 'ID: ' + item.student.id.substring(0, 10)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {item.totalAbsences} hari
                    </td>
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
                        onClick={() => setInspectingStatus(item)}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 shadow-2xs inline-flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profil & Surat</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Profil Murid */}
      {inspectingStatus && (
        <StudentProfileModal
          isOpen={Boolean(inspectingStatus)}
          onClose={() => setInspectingStatus(null)}
          statusData={inspectingStatus}
          attendanceRecords={attendance}
          onDataChanged={onRefreshData}
        />
      )}

      {/* Modal Rekod Surat */}
      {recordingTarget && (
        <RecordWarningModal
          isOpen={Boolean(recordingTarget)}
          onClose={() => setRecordingTarget(null)}
          student={recordingTarget.status.student}
          warningType={recordingTarget.type}
          onSaved={onRefreshData}
        />
      )}
    </div>
  );
};
