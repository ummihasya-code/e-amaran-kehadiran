import React, { useState } from 'react';
import { SchoolClass, User, UserRole } from '../../types';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Users, Plus, Edit2, Trash2, Shield, School, Mail, CheckCircle2 } from 'lucide-react';
import { sortSchoolClasses } from '../../utils/classOrder';

interface AdminTeachersProps {
  teachers: User[];
  classes: SchoolClass[];
  onRefreshData: () => void;
}

export const AdminTeachers: React.FC<AdminTeachersProps> = ({
  teachers,
  classes,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [assignedClass, setAssignedClass] = useState<string>('3 AA');

  // State untuk padam guru
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('teacher');
    setAssignedClass(classes[0]?.className || '3 AA');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setAssignedClass(u.assignedClasses[0] || classes[0]?.className || '3 AA');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Sila lengkapkan nama dan emel guru.', 'error');
      return;
    }

    const userData: User = {
      id: editingUser ? editingUser.id : `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      assignedClasses: role === 'teacher' ? [assignedClass] : [],
      active: true,
      createdAt: editingUser?.createdAt || new Date().toISOString(),
    };

    try {
      await dataService.saveUser(
        userData,
        user ? { id: user.id, name: user.name } : undefined
      );

      showToast(
        editingUser ? '✅ Maklumat pengguna dikemaskini.' : '✅ Pengguna baharu didaftarkan.',
        'success'
      );
      setIsModalOpen(false);
      onRefreshData();
    } catch {
      showToast('❌ Ralat menyimpan maklumat pengguna.', 'error');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await dataService.deleteUser(
        userToDelete.id,
        user ? { id: user.id, name: user.name } : undefined
      );
      showToast(`✅ Akaun guru ${userToDelete.name} berjaya dipadam.`, 'success');
      setUserToDelete(null);
      onRefreshData();
    } catch (err) {
      console.error('Ralat padam guru:', err);
      showToast('❌ Ralat memadam akaun guru.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengurusan Guru & Hak Akses Pengguna
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pendaftaran pentadbir sekolah, guru kelas dan kawalan kebenaran akses mengikut kelas
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Pengguna / Guru</span>
        </button>
      </div>

      {/* Senarai Guru / Pengguna */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Nama Penuh</th>
                <th className="py-3 px-4">Emel Rasmi / ID</th>
                <th className="py-3 px-4">Peranan (Role)</th>
                <th className="py-3 px-4">Kelas Bertanggungjawab</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{u.name}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{u.email}</td>
                  <td className="py-3 px-4">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                        <Shield className="w-3 h-3" />
                        <span>Admin (Akses Penuh)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                        <School className="w-3 h-3" />
                        <span>Guru Kelas</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.role === 'admin' ? (
                      <span className="text-slate-400 italic">Semua Kelas</span>
                    ) : u.assignedClasses.length > 0 ? (
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {u.assignedClasses.join(', ')}
                      </span>
                    ) : (
                      <span className="text-rose-600 text-[11px]">Belum Ditetapkan</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Aktif</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        id={`btn-edit-teacher-${u.id}`}
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition"
                        title="Kemaskini Profil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== user?.id ? (
                        <button
                          id={`btn-delete-teacher-${u.id}`}
                          onClick={() => setUserToDelete(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Padam Guru / Pengguna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span
                          className="p-1.5 text-slate-300 cursor-not-allowed inline-flex"
                          title="Akaun anda sendiri tidak boleh dipadam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit Guru */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Kemaskini Maklumat Guru / Pentadbir' : 'Daftar Guru / Pentadbir Baharu'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Penuh *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cth: Cikgu Ahmad bin Razali"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Emel Rasmi Sekolah *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Cth: guru.3aa@sekolah.edu.my"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Peranan *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  role === 'teacher'
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>Guru Kelas</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  role === 'admin'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Pentadbir (Admin)</span>
              </button>
            </div>
          </div>

          {role === 'teacher' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Kelas Bertanggungjawab *
              </label>
              <select
                value={assignedClass}
                onChange={(e) => setAssignedClass(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sortSchoolClasses(classes).map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {editingUser && editingUser.id !== user?.id ? (
              <button
                type="button"
                id="btn-modal-delete-teacher"
                onClick={() => {
                  const target = editingUser;
                  setIsModalOpen(false);
                  setUserToDelete(target);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center gap-1.5 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Padam Guru</span>
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
                Simpan Maklumat
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Dialog Pengesahan Padam Guru */}
      <ConfirmationDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDeleteUser}
        title={`Padam Guru: ${userToDelete?.name || ''}`}
        message={`Adakah anda pasti mahu memadam akaun guru "${userToDelete?.name}" (${userToDelete?.email})? Lantikan guru bagi kelas yang diselia (${
          userToDelete?.assignedClasses && userToDelete.assignedClasses.length > 0
            ? userToDelete.assignedClasses.join(', ')
            : 'Tiada'
        }) akan dikosongkan.`}
        confirmLabel="Ya, Padam Guru"
        isDestructive={true}
      />
    </div>
  );
};
