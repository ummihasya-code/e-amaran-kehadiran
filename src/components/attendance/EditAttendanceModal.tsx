import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { AttendanceRecord } from '../../types';
import { dataService } from '../../services/dataService';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { Check, Edit2 } from 'lucide-react';

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onUpdated: () => void;
}

export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({
  isOpen,
  onClose,
  record,
  onUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [date, setDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [countsTowardsWarning, setCountsTowardsWarning] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (record) {
      setDate(record.date);
      setReason(record.reason);
      setCountsTowardsWarning(record.countsTowardsWarning);
    }
  }, [record, isOpen]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason.trim()) {
      showToast('Sila lengkapkan tarikh dan sebab.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.updateAttendanceRecord(
        record.id,
        {
          date,
          reason: reason.trim(),
          countsTowardsWarning,
        },
        user ? { id: user.id, name: user.name } : undefined
      );

      showToast('✅ Data berjaya dikemaskini.', 'success');
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('❌ Ralat mengemaskini rekod.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kemaskini Rekod Kehadiran"
      subtitle={`Murid: ${record.studentName || 'Murid'} (${record.className})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Tarikh Tidak Hadir *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Sebab Tidak Hadir *
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Semak & Betulkan Kiraan Amaran (Admin Rule 24) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
          <span className="text-xs font-semibold text-slate-700 block">
            Pengiraan Bagi Tindakan Amaran:
          </span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="countsTowardsWarning"
                checked={countsTowardsWarning === true}
                onChange={() => setCountsTowardsWarning(true)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-rose-700">🔴 Dikira Untuk Amaran</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="countsTowardsWarning"
                checked={countsTowardsWarning === false}
                onChange={() => setCountsTowardsWarning(false)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-emerald-700">🟢 Tidak Dikira (Surat Doktor/Dikecualikan)</span>
            </label>
          </div>
          <p className="text-[11px] text-slate-500">
            Perubahan ini akan direkodkan dalam Jejak Audit (Audit Trail).
          </p>
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
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kemaskini'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
