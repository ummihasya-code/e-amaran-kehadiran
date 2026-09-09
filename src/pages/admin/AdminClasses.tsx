import React, { useState } from 'react';
import { AttendanceRecord, SchoolClass, Student, User } from '../../types';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import {
  School,
  Plus,
  Edit2,
  Trash2,
  UserMinus,
  Users,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { sortSchoolClasses, STANDARD_SCHOOL_CLASSES, parseFormAndSuffix } from '../../utils/classOrder';

interface AdminClassesProps {
  classes: SchoolClass[];
  students: Student[];
  attendance: AttendanceRecord[];
  teachers: User[];
  onRefreshData: () => void;
  onNavigate?: (view: string) => void;
}

export const AdminClasses: React.FC<AdminClassesProps> = ({
  classes,
  students,
  attendance,
  teachers,
  onRefreshData,
  onNavigate,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [className, setClassName] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // States untuk padam kelas dan padam lantikan guru kelas
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [teacherToUnassign, setTeacherToUnassign] = useState<{
    classId: string;
    className: string;
    teacherName: string;
  } | null>(null);

  const activeTeachers = teachers.filter((t) => t.role === 'teacher' || t.role === 'admin');

  const handleOpenAdd = () => {
    setEditingClass(null);
    setClassName('');
    setSelectedTeacherId(activeTeachers[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setClassName(cls.className);
    setSelectedTeacherId(cls.teacherId || '');
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      showToast('Sila masukkan nama kelas.', 'error');
      return;
    }

    const assignedTeacher = activeTeachers.find((t) => t.id === selectedTeacherId);

    const clsData: SchoolClass = {
      id: editingClass ? editingClass.id : `class_${className.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      className: className.trim(),
      active: true,
    };

    if (assignedTeacher) {
      clsData.teacherId = assignedTeacher.id;
      clsData.teacherName = assignedTeacher.name;
    }

    try {
      await dataService.saveClass(
        clsData,
        user ? { id: user.id, name: user.name } : undefined
      );

      // Kemaskini juga assignedClasses bagi cikgu tersebut jika ada
      if (assignedTeacher) {
        const currentClasses = assignedTeacher.assignedClasses || [];
        if (!currentClasses.includes(clsData.className)) {
          await dataService.saveUser(
            {
              ...assignedTeacher,
              assignedClasses: [...currentClasses, clsData.className],
            },
            user ? { id: user.id, name: user.name } : undefined
          );
        }
      }

      showToast(
        editingClass ? '✅ Maklumat kelas dikemaskini.' : '✅ Kelas baharu berjaya ditambah.',
        'success'
      );
      setIsModalOpen(false);
      onRefreshData();
    } catch (err: any) {
      console.error('Ralat simpan kelas:', err);
      showToast('❌ Ralat menyimpan maklumat kelas. Sila cuba sebentar lagi.', 'error');
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await dataService.deleteClass(
        classToDelete.id,
        user ? { id: user.id, name: user.name } : undefined
      );
      showToast(`✅ Kelas ${classToDelete.className} berjaya dipadam.`, 'success');
      setClassToDelete(null);
      onRefreshData();
    } catch (err) {
      console.error('Ralat padam kelas:', err);
      showToast('❌ Ralat memadam kelas.', 'error');
    }
  };

  const handleConfirmUnassignTeacher = async () => {
    if (!teacherToUnassign) return;
    try {
      await dataService.unassignTeacherFromClass(
        teacherToUnassign.classId,
        user ? { id: user.id, name: user.name } : undefined
      );
      showToast(
        `✅ Lantikan guru kelas bagi ${teacherToUnassign.className} berjaya dipadam/dikosongkan.`,
        'success'
      );
      setTeacherToUnassign(null);
      onRefreshData();
    } catch (err) {
      console.error('Ralat padam guru kelas:', err);
      showToast('❌ Ralat memadam lantikan guru kelas.', 'error');
    }
  };

  const sortedClasses = sortSchoolClasses(classes);
  const existingNamesSet = new Set(classes.map((c) => c.className.trim().toUpperCase()));
  const missingCount = STANDARD_SCHOOL_CLASSES.filter(
    (name) => !existingNamesSet.has(name.toUpperCase())
  ).length;

  const handleSeedStandardClasses = async () => {
    try {
      const updated = await dataService.seedStandardClasses(
        user ? { id: user.id, name: user.name } : undefined
      );
      showToast(
        `✅ ${updated.length} buah kelas telah diselaraskan mengikut tertib rasmi sekolah.`,
        'success'
      );
      onRefreshData();
    } catch (err: any) {
      console.error('Ralat jana kelas standard:', err);
      showToast('❌ Ralat menyelaraskan kelas standard sekolah.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengurusan Kelas & Penetapan Guru
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Senarai kelas berdaftar, penetapan Guru Kelas dan ringkasan kehadiran mengikut tertib rasmi
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {missingCount > 0 && (
            <button
              onClick={handleSeedStandardClasses}
              className="px-3 py-2 text-xs font-semibold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs flex items-center gap-1.5 transition"
              title="Daftar semua 27 kelas standard Tingkatan 1 - 5 yang belum wujud"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Daftar {missingCount} Kelas Standard</span>
            </button>
          )}

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
            <span>+ Tambah Kelas Manual</span>
          </button>
        </div>
      </div>

      {/* Maklumat Tertib Susunan Kelas Sekolah */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Tertib Susunan Kelas Rasmi Sekolah</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Tingkatan 1, 2, 3:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['AF', 'AM', 'AK', 'AZ', 'AA'].map((code, idx) => (
                <span
                  key={code}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-mono font-semibold border border-emerald-200 text-[11px]"
                >
                  {idx + 1}. {code}
                </span>
              ))}
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Tingkatan 4, 5:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['IS', 'AR', 'IR', 'BAT', 'BAY', 'IDR'].map((code, idx) => (
                <span
                  key={code}
                  className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-mono font-semibold border border-blue-200 text-[11px]"
                >
                  {idx + 1}. {code}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedClasses.map((cls) => {
          const classStudents = students.filter((s) => s.className === cls.className);
          const classAttendance = attendance.filter(
            (a) => a.className === cls.className && !a.isDeleted
          );
          const counted = classAttendance.filter((a) => a.countsTowardsWarning).length;

          return (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{cls.className}</h3>
                      <span className="text-[11px] font-semibold text-emerald-700">Aktif</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-edit-class-${cls.id}`}
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition"
                      title="Kemaskini Kelas"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-class-${cls.id}`}
                      onClick={() => setClassToDelete(cls)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Padam Kelas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500">Guru Kelas:</span>
                    {cls.teacherName ? (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="font-semibold text-slate-800">{cls.teacherName}</span>
                        <button
                          type="button"
                          id={`btn-unassign-teacher-${cls.id}`}
                          onClick={() =>
                            setTeacherToUnassign({
                              classId: cls.id,
                              className: cls.className,
                              teacherName: cls.teacherName!,
                            })
                          }
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition"
                          title="Padam lantikan guru bagi kelas ini"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Padam Guru</span>
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-400 italic">Belum Ditetapkan</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500">Bilangan Murid:</span>
                    <span className="font-bold text-slate-800">
                      {classStudents.length} orang
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500">Rekod Ketidakhadiran:</span>
                    <span className="font-semibold text-rose-700">
                      {counted} hari dikira amaran
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenEdit(cls)}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition text-center"
              >
                Kemaskini Penetapan Guru
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah/Edit Kelas */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Kemaskini Kelas' : 'Tambah Kelas Baharu'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Kelas *
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Cth: 3 AA / 4 Melur"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Guru Kelas Bertanggungjawab
              </label>
              {selectedTeacherId && (
                <button
                  type="button"
                  onClick={() => setSelectedTeacherId('')}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 transition"
                  title="Padam lantikan guru bagi kelas ini"
                >
                  <UserMinus className="w-3 h-3" />
                  <span>Padam Guru Kelas</span>
                </button>
              )}
            </div>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Tiada Guru Kelas (Kosongkan) --</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Guru yang dipilih akan diberikan akses khas untuk melihat murid dan merekod surat kelas ini.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {editingClass ? (
              <button
                type="button"
                id="btn-modal-delete-class"
                onClick={() => {
                  const target = editingClass;
                  setIsModalOpen(false);
                  setClassToDelete(target);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center gap-1.5 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Padam Kelas</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
              >
                Simpan Kelas
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Dialog Pengesahan Padam Kelas */}
      <ConfirmationDialog
        isOpen={!!classToDelete}
        onClose={() => setClassToDelete(null)}
        onConfirm={handleConfirmDeleteClass}
        title={`Padam Kelas: ${classToDelete?.className || ''}`}
        message={`Adakah anda pasti mahu memadam kelas "${classToDelete?.className}"? Kelas ini mempunyai ${
          classToDelete ? students.filter((s) => s.className === classToDelete.className).length : 0
        } orang murid dan ${
          classToDelete
            ? attendance.filter((a) => a.className === classToDelete.className && !a.isDeleted).length
            : 0
        } rekod ketidakhadiran. Tindakan ini akan memadam rekod kelas daripada senarai.`}
        confirmLabel="Ya, Padam Kelas"
        isDestructive={true}
      />

      {/* Dialog Pengesahan Padam / Lucutkan Guru Kelas */}
      <ConfirmationDialog
        isOpen={!!teacherToUnassign}
        onClose={() => setTeacherToUnassign(null)}
        onConfirm={handleConfirmUnassignTeacher}
        title={`Padam Lantikan Guru Kelas: ${teacherToUnassign?.className || ''}`}
        message={`Adakah anda pasti mahu memadam atau melucutkan ${teacherToUnassign?.teacherName} daripada menjadi guru kelas bagi ${teacherToUnassign?.className}? Akaun guru tidak akan dipadam, hanya tugasannya untuk kelas ini dibatalkan.`}
        confirmLabel="Padam Guru Kelas"
        isDestructive={true}
      />
    </div>
  );
};
