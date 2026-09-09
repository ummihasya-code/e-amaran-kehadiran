import React, { useState } from 'react';
import {
  AttendanceRecord,
  Student,
  StudentWarningStatus,
} from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StudentProfileModal } from '../../components/attendance/StudentProfileModal';
import { DeleteStudentModal } from '../../components/common/DeleteStudentModal';
import { dataService } from '../../services/dataService';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Trash2 } from 'lucide-react';

interface TeacherStudentsProps {
  students: Student[];
  attendance: AttendanceRecord[];
  studentStatuses: StudentWarningStatus[];
  onRefreshData: () => void;
}

export const TeacherStudents: React.FC<TeacherStudentsProps> = ({
  students,
  attendance,
  studentStatuses,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const assignedClass = user?.assignedClasses[0] || '3 AA';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectingStatus, setInspectingStatus] = useState<StudentWarningStatus | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Penapisan data: Hanya murid kelas guru ini
  const myStudents = students.filter((s) => s.className === assignedClass);

  const filtered = myStudents.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.studentNumber && s.studentNumber.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-1">
          <span>Kelas {assignedClass}</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Senarai Murid Kelas {assignedClass}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Senarai rasmi murid kelas anda beserta status kumulatif amaran
        </p>
      </div>

      {/* Carian */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama murid atau no matrik..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Senarai Murid Kelas: Responsif Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile Card List (skrin telefon & tablet kecil) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Tiada murid ditemui.
            </div>
          ) : (
            filtered.map((student, idx) => {
              const status = studentStatuses.find((s) => s.student.id === student.id);
              const total = status?.totalAbsences || 0;
              const doc = status?.doctorLetterCount || 0;
              const eligible = status?.eligibleAbsences || 0;

              return (
                <div key={student.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {student.studentNumber || 'ID: ' + student.id.substring(0, 8)}
                        </div>
                      </div>
                    </div>
                    <div>
                      {status ? <StatusBadge status={status.status} /> : <StatusBadge variant="normal" />}
                    </div>
                  </div>

                  {/* Stat pills */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] text-slate-500">Jumlah TH</div>
                      <div className="font-bold text-slate-800">{total}h</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60">
                      <div className="text-[10px] text-emerald-700">Surat Dr</div>
                      <div className="font-bold text-emerald-700">{doc}h</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200">
                      <div className="text-[10px] text-rose-600 font-medium">Kiraan</div>
                      <div className="font-black text-rose-700">{eligible}h</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => status && setInspectingStatus(status)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1.5 transition touch-manipulation"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Profil & Surat</span>
                    </button>
                    <button
                      type="button"
                      id={`btn-teacher-delete-student-m-${student.id}`}
                      onClick={() => setStudentToDelete(student)}
                      title="Padam Murid"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition touch-manipulation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Bil</th>
                <th className="py-3 px-4">Nama Murid</th>
                <th className="py-3 px-4">Jumlah Tidak Hadir</th>
                <th className="py-3 px-4">Surat Doktor</th>
                <th className="py-3 px-4">Hari Dikira Amaran</th>
                <th className="py-3 px-4">Status Amaran</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tiada murid ditemui.
                  </td>
                </tr>
              ) : (
                filtered.map((student, idx) => {
                  const status = studentStatuses.find((s) => s.student.id === student.id);
                  const total = status?.totalAbsences || 0;
                  const doc = status?.doctorLetterCount || 0;
                  const eligible = status?.eligibleAbsences || 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {student.studentNumber || 'ID: ' + student.id.substring(0, 8)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{total} hari</td>
                      <td className="py-3 px-4 font-medium text-emerald-700">{doc} hari</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          {eligible} hari
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {status ? <StatusBadge status={status.status} /> : <StatusBadge variant="normal" />}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => status && setInspectingStatus(status)}
                            className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 shadow-2xs inline-flex items-center gap-1.5 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Profil & Surat</span>
                          </button>
                          <button
                            type="button"
                            id={`btn-teacher-delete-student-${student.id}`}
                            onClick={() => setStudentToDelete(student)}
                            title="Padam Rekod Murid"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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

      {/* Modal Padam / Buang / Pindah Murid */}
      <DeleteStudentModal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        student={studentToDelete}
        onDeleted={() => {
          setStudentToDelete(null);
          onRefreshData();
        }}
      />
    </div>
  );
};
