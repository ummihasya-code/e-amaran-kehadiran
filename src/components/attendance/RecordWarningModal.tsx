import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Student, WarningLetter, WarningType } from '../../types';
import { dataService } from '../../services/dataService';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { getTodayIsoDate } from '../../utils/dateUtils';
import { Info, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface RecordWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  warningType: WarningType;
  existingWarning?: WarningLetter;
  onSaved: () => void;
}

export const RecordWarningModal: React.FC<RecordWarningModalProps> = ({
  isOpen,
  onClose,
  student,
  warningType,
  existingWarning,
  onSaved,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [issueDate, setIssueDate] = useState<string>(getTodayIsoDate());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const warningLabel =
    warningType === 'warning1'
      ? 'Surat Amaran 1'
      : warningType === 'warning2'
      ? 'Surat Amaran 2'
      : 'Surat Amaran 3 (Terakhir)';

  const isEdit = Boolean(existingWarning);

  useEffect(() => {
    if (existingWarning) {
      setIssueDate(existingWarning.issueDate);
      setNotes(existingWarning.notes || '');
    } else {
      setIssueDate(getTodayIsoDate());
      setNotes('');
    }
  }, [existingWarning, isOpen]);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDate) {
      showToast('❌ Format tarikh tidak sah atau kosong.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.saveWarningLetter(
        student.id,
        warningType,
        issueDate,
        notes,
        user ? { id: user.id, name: user.name } : undefined
      );

      showToast(
        isEdit
          ? `✅ Tarikh ${warningLabel} berjaya dikemaskini.`
          : `✅ Tarikh ${warningLabel} berjaya direkodkan.`,
        'success'
      );
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal menyimpan rekod surat amaran.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Kemaskini Tarikh ${warningLabel}` : `Rekod ${warningLabel} Telah Dikeluarkan`}
      subtitle={`Murid: ${student.name} (${student.className})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Notis Sumber Rasmi Surat (Syarat Wajib) */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5">Peringatan Prosedur Sekolah:</strong>
            Surat amaran sebenar dikeluarkan melalui sistem/prosedur rasmi sekolah seperti{' '}
            <span className="font-bold underline">idMe</span> atau{' '}
            <span className="font-bold underline">MOEIS</span>. Aplikasi e-AMARAN hanya digunakan
            untuk pemantauan ketidakhadiran dan merekod tarikh surat rasmi yang telah dikeluarkan
            oleh Guru Kelas/Pihak Sekolah.
          </div>
        </div>

        {isEdit && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Tarikh asal rekod: <strong className="font-mono">{existingWarning?.issueDate}</strong>{' '}
              (Direkod oleh: {existingWarning?.recordedBy})
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Tarikh Surat Dikeluarkan (idMe / MOEIS) *
          </label>
          <input
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Pilih tarikh rasmi surat tersebut dijana di sistem idMe/MOEIS atau dihantar kepada ibu bapa.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Catatan Tambahan (Pilihan)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cth: Dihantar pos berdaftar / Diserahkan semasa pertemuan ibu bapa"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Rekod'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
