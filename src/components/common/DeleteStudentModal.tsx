import React, { useState } from 'react';
import { Modal } from './Modal';
import { Student } from '../../types';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { UserMinus, Trash2, School, ShieldAlert, AlertTriangle } from 'lucide-react';

interface DeleteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onDeleted: () => void;
}

export type StudentRemovalAction = 'pindah' | 'dibuang' | 'delete';

export const DeleteStudentModal: React.FC<DeleteStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onDeleted,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [action, setAction] = useState<StudentRemovalAction>('pindah');
  const [reason, setReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!student) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const finalReason =
        reason.trim() ||
        (action === 'pindah'
          ? 'Pindah Sekolah'
          : action === 'dibuang'
          ? 'Tindakan Disiplin (Buang Sekolah)'
          : 'Padam Rekod');

      await dataService.deleteStudent(
        student.id,
        {
          action,
          reason: finalReason,
          deleteAllAttendance: true,
        },
        user ? { id: user.id, name: user.name } : undefined
      );

      const actionText =
        action === 'pindah'
          ? 'ditandakan sebagai Pindah Sekolah'
          : action === 'dibuang'
          ? 'ditandakan sebagai Dibuang Sekolah'
          : 'berjaya dipadam';

      showToast(`✅ Murid ${student.name} telah ${actionText}.`, 'success');
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Ralat padam murid:', err);
      showToast('❌ Ralat memproses pemadaman murid.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Padam / Keluarkan Murid Daripada Sistem"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Info Murid */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs text-slate-500">Murid Terpilih:</div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">{student.name}</div>
          <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3">
            <span>Kelas: <strong className="text-slate-800">{student.className}</strong></span>
            {student.studentNumber && (
              <span>No. Murid / IC: <strong className="text-slate-800">{student.studentNumber}</strong></span>
            )}
          </div>
        </div>

        {/* Pilihan Tindakan */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Pilih Sebab Tindakan:
          </label>

          {/* Option 1: Pindah Sekolah */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
              action === 'pindah'
                ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="removalAction"
              value="pindah"
              checked={action === 'pindah'}
              onChange={() => setAction('pindah')}
              className="mt-1 text-amber-600 focus:ring-amber-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                <School className="w-3.5 h-3.5 text-amber-600" />
                <span>Pindah Sekolah</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold ml-auto">
                  Disyorkan
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Murid telah berpindah ke sekolah lain. Rekod kehadiran ditutup dan murid tidak akan direkodkan lagi.
              </p>
            </div>
          </label>

          {/* Option 2: Dibuang Sekolah */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
              action === 'dibuang'
                ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-400'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="removalAction"
              value="dibuang"
              checked={action === 'dibuang'}
              onChange={() => setAction('dibuang')}
              className="mt-1 text-rose-600 focus:ring-rose-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Dibuang Sekolah</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Tindakan disiplin buang sekolah telah diambil. Rekod surat amaran & kehadiran ditutup, murid tidak akan direkodkan lagi.
              </p>
            </div>
          </label>

          {/* Option 3: Padam Terus */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
              action === 'delete'
                ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="removalAction"
              value="delete"
              checked={action === 'delete'}
              onChange={() => setAction('delete')}
              className="mt-1 text-slate-600 focus:ring-slate-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                <Trash2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Padam Rekod Sepenuhnya</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Padam maklumat murid sepenuhnya daripada pangkalan data dan arkibkan.
              </p>
            </div>
          </label>
        </div>

        {/* Input Catatan Tambahan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan / Nama Sekolah Baru / No. Rujukan Surat (Pilihan):
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              action === 'pindah'
                ? 'Contoh: Berpindah ke SMK Bukit Mertajam'
                : action === 'dibuang'
                ? 'Contoh: Keputusan Mesyuarat Disiplin Bil 2/2026'
                : 'Catatan pemadaman...'
            }
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Notis Jaminan Perlindungan Import Semula & Pemulihan */}
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Jaminan Keselamatan Data:</span> Rekod murid ini akan diarkibkan dengan selamat dan tidak akan dipadam kekal serta-merta. Sekiranya anda <span className="font-semibold underline">tersalah padam</span>, anda boleh memulihkan (restore) murid ini pada bila-bila masa melalui tab <strong>"Arkib & Pulihkan"</strong> di halaman Pengurusan Murid.
          </div>
        </div>

        {/* Butang Tindakan */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-delete-student"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition shadow-xs flex items-center gap-1.5 ${
              action === 'pindah'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {action === 'pindah' ? (
              <School className="w-4 h-4" />
            ) : action === 'dibuang' ? (
              <UserMinus className="w-4 h-4" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>
              {isProcessing
                ? 'Memproses...'
                : action === 'pindah'
                ? 'Sahkan Pindah Sekolah'
                : action === 'dibuang'
                ? 'Sahkan Dibuang Sekolah'
                : 'Sahkan Padam Murid'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
