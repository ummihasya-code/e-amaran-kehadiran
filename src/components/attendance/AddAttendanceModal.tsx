import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { AttendanceRecord, Student } from '../../types';
import { dataService } from '../../services/dataService';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { generateFingerprint, getTodayIsoDate } from '../../utils/dateUtils';
import { isVerifiedDoctorLetter } from '../../utils/doctorLetter';
import { compareClassNames } from '../../utils/classOrder';
import { Plus, AlertCircle, Check } from 'lucide-react';

interface AddAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  preselectedStudentId?: string;
}

const COMMON_REASONS = [
  'MAKLUMAN IBU BAPA PENJAGA',
  'SURAT CUTI SAKIT HOSPITAL/KLINIK',
  'MALAS KE SEKOLAH',
  'MENJAGA/MENGURUSKAN AHLI KELUARGA',
  'MENGIKUT KELUARGA BERCUTI/BERKURSUS',
  'KEMATIAN AHLI KELUARGA TERDEKAT',
  'MASALAH PENGANGKUTAN',
  'URUSAN KELUARGA',
  'TIADA MAKLUMAN',
  'DEMAM',
  'SAKIT PERUT',
];

export const AddAttendanceModal: React.FC<AddAttendanceModalProps> = ({
  isOpen,
  onClose,
  onAdded,
  preselectedStudentId,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [reason, setReason] = useState<string>('MAKLUMAN IBU BAPA PENJAGA');
  const [customReason, setCustomReason] = useState<string>('');
  const [countsTowardsWarning, setCountsTowardsWarning] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      dataService.getStudents().then((res) => {
        setStudents(res);
        if (preselectedStudentId) {
          setSelectedStudentId(preselectedStudentId);
        } else if (res.length > 0 && !selectedStudentId) {
          setSelectedStudentId(res[0].id);
        }
      });
      setDate(getTodayIsoDate());
      setReason('MAKLUMAN IBU BAPA PENJAGA');
      setCustomReason('');
    }
  }, [isOpen, preselectedStudentId]);

  // Auto-detect doctor letter
  useEffect(() => {
    const activeReason = reason === 'LAIN-LAIN' ? customReason : reason;
    const isDoc = isVerifiedDoctorLetter(activeReason);
    setCountsTowardsWarning(!isDoc);
  }, [reason, customReason]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const filteredStudents = students
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const classCmp = compareClassNames(a.className, b.className);
      if (classCmp !== 0) return classCmp;
      return a.name.localeCompare(b.name);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Sila pilih murid.', 'error');
      return;
    }
    if (!date) {
      showToast('❌ Format tarikh tidak sah.', 'error');
      return;
    }

    const finalReason = (reason === 'LAIN-LAIN' ? customReason : reason).trim();
    if (!finalReason) {
      showToast('Sila nyatakan sebab ketidakhadiran.', 'error');
      return;
    }

    const fingerprint = generateFingerprint(selectedStudent.id, date, finalReason);

    const record: AttendanceRecord = {
      id: fingerprint,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      classId: selectedStudent.classId,
      className: selectedStudent.className,
      date,
      reason: finalReason,
      countsTowardsWarning,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Admin',
    };

    setIsSubmitting(true);
    try {
      const res = await dataService.addAttendanceRecord(
        record,
        user ? { id: user.id, name: user.name } : undefined
      );

      if (res.duplicate) {
        showToast('⚠️ Rekod sudah wujud (duplicate dikesan untuk tarikh dan sebab ini).', 'warning');
        return;
      }

      showToast('✅ Data berjaya ditambah.', 'success');
      onAdded();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('❌ Ralat menambah rekod.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="+ Tambah Rekod Kehadiran"
      subtitle="Kemasukan rekod ketidakhadiran manual oleh Admin"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pilih Murid */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Nama Murid *
          </label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Cari murid mengikut nama atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kelas (Auto) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Kelas (Auto)
          </label>
          <input
            type="text"
            readOnly
            value={selectedStudent?.className || '-'}
            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 font-semibold cursor-not-allowed"
          />
        </div>

        {/* Tarikh Tidak Hadir */}
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

        {/* Sebab Tidak Hadir */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Sebab Tidak Hadir *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
          >
            {COMMON_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="LAIN-LAIN">Lain-lain (Nyatakan)...</option>
          </select>

          {reason === 'LAIN-LAIN' && (
            <input
              type="text"
              required
              placeholder="Masukkan sebab ketidakhadiran..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}
        </div>

        {/* Kira Untuk Amaran (Auto & Override) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Kira Untuk Tindakan Amaran:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                countsTowardsWarning
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {countsTowardsWarning ? '🔴 Dikira' : '🟢 Tidak Dikira (Surat Doktor)'}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Sistem secara automatik mengecualikan ketidakhadiran yang disahkan sebagai Surat Cuti Sakit Hospital/Klinik/MC.
            Perkataan umum seperti 'demam' atau 'sakit' tanpa pengesahan sijil sakit hospital/klinik tetap dikira.
          </p>

          <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={countsTowardsWarning}
              onChange={(e) => setCountsTowardsWarning(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>Tandakan jika rekod ini <strong>DIKIRA</strong> untuk tindakan amaran.</span>
          </label>
        </div>

        {/* Actions */}
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
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Rekod'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
