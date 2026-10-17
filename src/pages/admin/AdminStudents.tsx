import React, { useState, useEffect, useCallback } from 'react';
import {
  ArchivedStudentItem,
  AttendanceRecord,
  SchoolClass,
  Student,
  StudentWarningStatus,
  WarningLetter,
} from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StudentProfileModal } from '../../components/attendance/StudentProfileModal';
import { DataExportModal } from '../../components/common/DataExportModal';
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
  RotateCcw,
  RefreshCw,
  Archive,
  School,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface AdminStudentsProps {
  students: Student[];
  classes: SchoolClass[];
  attendance: AttendanceRecord[];
  studentStatuses: StudentWarningStatus[];
  warnings?: WarningLetter[];
  onRefreshData: () => void;
  onNavigate?: (view: string) => void;
}

export const AdminStudents: React.FC<AdminStudentsProps> = ({
  students,
  classes,
  attendance,
  studentStatuses,
  warnings = [],
  onRefreshData,
  onNavigate,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [inspectingStatus, setInspectingStatus] = useState<StudentWarningStatus | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [name, setName] = useState<string>('');
  const [className, setClassName] = useState<string>('3 AA');
  const [studentNumber, setStudentNumber] = useState<string>('');

  // States Arkib & Pulihkan (Restore)
  const [archivedList, setArchivedList] = useState<ArchivedStudentItem[]>([]);
  const [isArchivedLoading, setIsArchivedLoading] = useState<boolean>(false);
  const [itemToRestore, setItemToRestore] = useState<ArchivedStudentItem | null>(null);
  const [itemToPurge, setItemToPurge] = useState<ArchivedStudentItem | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);

  const loadArchived = useCallback(async () => {
    setIsArchivedLoading(true);
    try {
      const items = await dataService.getArchivedStudents();
      setArchivedList(items);
    } catch (e) {
      console.error('Ralat membaca data arkib murid:', e);
    } finally {
      setIsArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchived();
  }, [loadArchived, students]);

  const handleConfirmRestore = async () => {
    if (!itemToRestore) return;
    setIsRestoring(true);
    try {
      await dataService.restoreStudent(
        itemToRestore.student.id,
        itemToRestore.student,
        user ? { id: user.id, name: user.name } : undefined
      );
      showToast(
        `✅ Rekod murid ${itemToRestore.student.name} berjaya dipulihkan kembali ke kelas ${itemToRestore.student.className}!`,
        'success'
      );
      setItemToRestore(null);
      await loadArchived();
      onRefreshData();
      setActiveTab('active');
    } catch (err: any) {
      console.error('Ralat memulihkan murid:', err);
      showToast('❌ Ralat memulihkan rekod murid: ' + (err.message || 'Sila cuba lagi.'), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmPurge = async () => {
    if (!itemToPurge) return;
    setIsPurging(true);
    try {
      await dataService.purgeStudent(
        itemToPurge.student.id,
        user ? { id: user.id, name: user.name } : undefined
      );
      showToast(`Rekod ${itemToPurge.student.name} telah dipadam secara kekal.`, 'info');
      setItemToPurge(null);
      await loadArchived();
    } catch (err: any) {
      console.error('Ralat hapus kekal:', err);
      showToast('❌ Ralat menghapuskan rekod.', 'error');
    } finally {
      setIsPurging(false);
    }
  };

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

  const filteredArchived = archivedList.filter((item) => {
    if (selectedClass !== 'ALL' && item.student.className !== selectedClass) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.student.name.toLowerCase().includes(q);
      const matchClass = item.student.className.toLowerCase().includes(q);
      const matchNo = item.student.studentNumber?.toLowerCase().includes(q);
      const matchReason = item.deletedReason?.toLowerCase().includes(q);
      if (!matchName && !matchClass && !matchNo && !matchReason) return false;
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
            Senarai murid berdaftar, status kehadiran, dan arkib pemulihan murid pindah/padam
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onNavigate && (
            <button
              onClick={() => onNavigate('admin_import')}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 shadow-2xs flex items-center gap-1.5 transition"
            >
              <span>📥 Auto-Daftar Melalui Import</span>
            </button>
          )}

          <button
            type="button"
            id="btn-open-export-students"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Eksport (CSV / Sheets)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Murid Manual</span>
          </button>
        </div>
      </div>

      {/* Tab Navigasi: Murid Aktif vs Arkib & Pulihkan */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition relative flex items-center gap-2 ${
            activeTab === 'active'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Murid Aktif</span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'active'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {students.length}
          </span>
        </button>

        <button
          type="button"
          id="btn-tab-archived"
          onClick={() => {
            setActiveTab('archived');
            loadArchived();
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition relative flex items-center gap-2 ${
            activeTab === 'archived'
              ? 'text-amber-700 border-b-2 border-amber-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Arkib & Pulihkan Murid (Restore)</span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'archived'
                ? 'bg-amber-100 text-amber-900'
                : archivedList.length > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {archivedList.length}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={
              activeTab === 'active'
                ? 'Cari mengikut nama murid, no matrik atau kelas...'
                : 'Cari dalam arkib mengikut nama, sebab pemadaman atau kelas...'
            }
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

      {/* VIEW 1: SENARAI MURID AKTIF */}
      {activeTab === 'active' && (
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
      )}

      {/* VIEW 2: ARKIB & PUSAT PEMULIHAN (RESTORE CENTER) */}
      {activeTab === 'archived' && (
        <div className="space-y-4">
          {/* Banner Penerangan Pemulihan */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pusat Pemulihan Data Murid (Restore Center)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
                  Murid yang ditandakan Pindah Sekolah, Dibuang Sekolah, atau dipadam disimpan di sini secara selamat. Jika anda <strong>tersalah padam murid</strong>, klik butang <strong>"Pulihkan (Restore)"</strong> untuk mengembalikan murid dan rekod kehadiran mereka semula ke senarai aktif.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadArchived}
              className="self-start sm:self-center px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/60 shadow-2xs flex items-center gap-1.5 transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isArchivedLoading ? 'animate-spin' : ''}`} />
              <span>Muat Semula Arkib</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Mobile View Arkib */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredArchived.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {isArchivedLoading ? 'Sedang memuat data arkib...' : 'Tiada rekod murid dalam arkib.'}
                </div>
              ) : (
                filteredArchived.map((item, idx) => (
                  <div key={item.student.id + idx} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{item.student.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {item.student.className}
                          </span>
                          {item.student.studentNumber && (
                            <span>{item.student.studentNumber}</span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.student.status === 'pindah' || item.deletedReason?.toLowerCase().includes('pindah')
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : item.student.status === 'dibuang' || item.deletedReason?.toLowerCase().includes('buang')
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.deletedReason || 'Dipadam Rekod'}
                      </span>
                    </div>

                    {item.deletedAt && (
                      <div className="text-[11px] text-slate-500">
                        Tarikh Dikeluarkan:{' '}
                        <span className="font-mono text-slate-700 font-medium">
                          {new Date(item.deletedAt).toLocaleString('ms-MY', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setItemToPurge(item)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition text-xs flex items-center gap-1"
                        title="Hapus Kekal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Kekal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemToRestore(item)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Pulihkan (Restore)</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View Arkib */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Bil</th>
                    <th className="py-3 px-4">Nama Murid</th>
                    <th className="py-3 px-4">Kelas Terakhir</th>
                    <th className="py-3 px-4">Tarikh & Masa Tindakan</th>
                    <th className="py-3 px-4">Sebab / Status Arkib</th>
                    <th className="py-3 px-4">Punca Rekod</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredArchived.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        {isArchivedLoading
                          ? 'Sedang membaca data arkib...'
                          : 'Tiada rekod murid dalam arkib pemulihan.'}
                      </td>
                    </tr>
                  ) : (
                    filteredArchived.map((item, idx) => {
                      const isPindah =
                        item.student.status === 'pindah' ||
                        item.deletedReason?.toLowerCase().includes('pindah');
                      const isBuang =
                        item.student.status === 'dibuang' ||
                        item.deletedReason?.toLowerCase().includes('buang');

                      return (
                        <tr key={item.student.id + idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.student.name}</div>
                            {item.student.studentNumber && (
                              <div className="text-[11px] text-slate-400">
                                {item.student.studentNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                              {item.student.className}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {item.deletedAt
                              ? new Date(item.deletedAt).toLocaleString('ms-MY', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-1 rounded-full ${
                                isPindah
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : isBuang
                                  ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {isPindah && <School className="w-3 h-3 text-amber-700" />}
                              {isBuang && <ShieldAlert className="w-3 h-3 text-rose-700" />}
                              <span>{item.deletedReason || 'Dipadam'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {item.source === 'audit_log' ? (
                              <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                                Jejak Audit
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                Pangkalan Data
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                id={`btn-restore-student-${item.student.id}`}
                                onClick={() => setItemToRestore(item)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition inline-flex items-center gap-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Pulihkan (Restore)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToPurge(item)}
                                title="Hapus Kekal dari Pangkalan Data"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
        </div>
      )}

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
          loadArchived();
        }}
      />

      {/* Modal Pengesahan Pulihkan Murid (Restore) */}
      <Modal
        isOpen={Boolean(itemToRestore)}
        onClose={() => !isRestoring && setItemToRestore(null)}
        title="Pulihkan Rekod Murid (Restore)"
        maxWidth="md"
      >
        {itemToRestore && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Maklumat Murid Dipulihkan
              </div>
              <div className="text-base font-bold text-slate-900 mt-1">
                {itemToRestore.student.name}
              </div>
              <div className="text-xs text-emerald-900 mt-1 flex flex-wrap items-center gap-3">
                <span>
                  Kelas: <strong>{itemToRestore.student.className}</strong>
                </span>
                {itemToRestore.student.studentNumber && (
                  <span>
                    No. Matrik: <strong>{itemToRestore.student.studentNumber}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Status / Sebab Sebelum Ini:</span>
                <span className="font-semibold text-slate-800">
                  {itemToRestore.deletedReason || 'Pindah / Dipadam Rekod'}
                </span>
              </div>
              {itemToRestore.deletedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tarikh Tindakan:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(itemToRestore.deletedAt).toLocaleString('ms-MY', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Kesan Pemulihan:</span> Murid ini akan dikembalikan ke senarai murid aktif kelas <strong>{itemToRestore.student.className}</strong>. Semua rekod kehadiran murid sebelum ini akan diaktifkan semula dan nama murid tidak lagi disekat semasa sesi import kehadiran masa hadapan.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setItemToRestore(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-restore-student"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Sedang Memulihkan...' : 'Ya, Pulihkan Murid Sekarang'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Pengesahan Hapus Kekal */}
      <Modal
        isOpen={Boolean(itemToPurge)}
        onClose={() => !isPurging && setItemToPurge(null)}
        title="Hapus Rekod Secara Kekal"
        maxWidth="md"
      >
        {itemToPurge && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-1.5">
              <div className="font-bold text-sm text-rose-900">{itemToPurge.student.name}</div>
              <p className="leading-relaxed">
                Adakah anda pasti ingin memadam rekod ini secara kekal daripada sistem dan pangkalan data? Tindakan ini <strong>tidak boleh dipulihkan semula</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={isPurging}
                onClick={() => setItemToPurge(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-purge-student"
                disabled={isPurging}
                onClick={handleConfirmPurge}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
                <span>{isPurging ? 'Memadam...' : 'Hapus Kekal'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Eksport Data Murid & Amaran */}
      <DataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        studentStatuses={studentStatuses}
        attendance={attendance}
        warnings={warnings}
        classes={classes}
        initialDataset="student_warnings_master"
        defaultClass={selectedClass}
      />
    </div>
  );
};
