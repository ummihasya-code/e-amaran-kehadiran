import React, { useState } from 'react';
import {
  AttendanceRecord,
  SchoolClass,
  Student,
  StudentWarningStatus,
} from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StudentProfileModal } from '../../components/attendance/StudentProfileModal';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { sortSchoolClasses } from '../../utils/classOrder';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { DeleteStudentModal } from '../../components/common/DeleteStudentModal';
import {
  GraduationCap,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';

interface AdminStudentsProps {
  students: Student[];
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  studentStatuses: StudentWarningStatus[];
  onRefreshData: () => void;
  onNavigate?: (view: string) => void;
}

export const AdminStudents: React.FC<AdminStudentsProps> = ({
  students,
  classes,
  attendance,
  studentStatuses,
  onRefreshData,
  onNavigate,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [inspectingStatus, setInspectingStatus] = useState<StudentWarningStatus | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [name, setName] = useState<string>('');
  const [className, setClassName] = useState<string>('3 AA');
  const [studentNumber, setStudentNumber] = useState<string>('');

  const filteredStudents = students.filter((s) => {
    if (selectedClass !== 'ALL' && s.className !== selectedClass) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchClass = s.className.toLowerCase().includes(q);
      const matchNo = s.studentNumber?.toLowerCase().includes(q);
      if (!matchName && !matchClass && !matchNo) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setName('');
    setClassName(classes[0]?.className || '3 AA');
    setStudentNumber('');
    setIsStudentModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setClassName(student.className);
    setStudentNumber(student.studentNumber || '');
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !className) {
      showToast('Sila lengkapkan nama dan kelas.', 'error');
      return;
    }

    const targetClass = classes.find((c) => c.className === className);

    const studentData: Student = {
      id: editingStudent ? editingStudent.id : `student_${Date.now()}`,
      name: name.trim().toUpperCase(),
      classId: targetClass ? targetClass.id : `class_${className.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      className,
      createdAt: editingStudent?.createdAt || new Date().toISOString(),
    };

    if (studentNumber.trim()) {
      studentData.studentNumber = studentNumber.trim();
    }

    try {
      await dataService.saveStudent(
        studentData,
        user ? { id: user.id, name: user.name } : undefined
      );
      showToast(
        editingStudent ? '✅ Maklumat murid dikemaskini.' : '✅ Murid baharu didaftarkan.',
        'success'
      );
      setIsStudentModalOpen(false);
      onRefreshData();
    } catch (err: any) {
      console.error('Ralat simpan murid:', err);
      showToast('❌ Ralat menyimpan maklumat murid.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengurusan Data Murid
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Senarai murid berdaftar, kelas dan status kumulatif ketidakhadiran
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigate && (
            <button
              onClick={() => onNavigate('admin_import')}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 shadow-2xs flex items-center gap-1.5 transition"
            >
              <span>📥 Auto-Daftar Melalui Import</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Murid Manual</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari mengikut nama, no matrik atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Kelas ({classes.length})</option>
            {sortSchoolClasses(classes).map((c) => (
              <option key={c.id} value={c.className}>
                {c.className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Senarai Murid: Responsif Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tiada murid dijumpai.
            </div>
          ) : (
            filteredStudents.map((student, idx) => {
              const status = studentStatuses.find((s) => s.student.id === student.id);
              const totalAbsences = status?.totalAbsences || 0;
              const doctorLetters = status?.doctorLetterCount || 0;
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
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {student.className}
                          </span>
                          <span>{student.studentNumber || 'No: ' + student.id.substring(0, 8)}</span>
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
                      <div className="font-bold text-slate-800">{totalAbsences}h</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60">
                      <div className="text-[10px] text-emerald-700">Surat Dr</div>
                      <div className="font-bold text-emerald-700">{doctorLetters}h</div>
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
                      onClick={() => handleOpenEdit(student)}
                      title="Edit Murid"
                      className="p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition touch-manipulation"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      id={`btn-delete-student-m-${student.id}`}
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
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jumlah Tidak Hadir</th>
                <th className="py-3 px-4">Surat Doktor</th>
                <th className="py-3 px-4">Hari Dikira Amaran</th>
                <th className="py-3 px-4">Status Amaran</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tiada murid dijumpai.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const status = studentStatuses.find((s) => s.student.id === student.id);
                  const totalAbsences = status?.totalAbsences || 0;
                  const doctorLetters = status?.doctorLetterCount || 0;
                  const eligible = status?.eligibleAbsences || 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {student.studentNumber || 'No: ' + student.id.substring(0, 8)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{student.className}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{totalAbsences} hari</td>
                      <td className="py-3 px-4 font-medium text-emerald-700">
                        {doctorLetters} hari
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          {eligible} hari
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {status ? <StatusBadge status={status.status} /> : <StatusBadge variant="normal" />}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => status && setInspectingStatus(status)}
                            title="Lihat Profil & Surat"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(student)}
                            title="Edit Maklumat Murid"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            id={`btn-delete-student-${student.id}`}
                            onClick={() => setStudentToDelete(student)}
                            title="Padam Rekod Murid"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
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

      {/* Modal Tambah / Edit Murid */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title={editingStudent ? 'Kemaskini Maklumat Murid' : 'Daftar Murid Baharu'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Murid (Huruf Besar) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cth: DARSHAN KUMAR A/L VISHNU"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Kelas *
            </label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {sortSchoolClasses(classes).map((c) => (
                <option key={c.id} value={c.className}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              No. Pendaftaran / Matrik (Pilihan)
            </label>
            <input
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="Cth: M26301"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {editingStudent ? (
              <button
                type="button"
                id="btn-modal-delete-student"
                onClick={() => {
                  const target = editingStudent;
                  setIsStudentModalOpen(false);
                  setStudentToDelete(target);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center gap-1.5 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Padam Murid</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
              >
                Simpan Maklumat
              </button>
            </div>
          </div>
        </form>
      </Modal>

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
