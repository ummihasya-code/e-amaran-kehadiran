import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { AttendanceRecord, StudentWarningStatus, WarningType, StageBreakdown } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { normalizeStudentName, normalizeClassName } from '../../utils/studentMatcher';
import { RecordWarningModal } from './RecordWarningModal';
import {
  buildSingleStudentExportData,
  generateCsvString,
  generateTsvString,
  downloadCsvFile,
  copyToClipboard,
  openNewGoogleSheet,
} from '../../utils/exportUtils';
import { useToast } from '../common/Toast';
import {
  Calendar,
  FileCheck2,
  AlertCircle,
  Clock,
  UserCheck,
  Stethoscope,
  ChevronRight,
  Edit3,
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  FileSpreadsheet,
  Download,
  Copy,
} from 'lucide-react';
import { isDateAfter } from '../../services/warningEngine';
import { DeleteStudentModal } from '../common/DeleteStudentModal';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusData: StudentWarningStatus | null;
  attendanceRecords: AttendanceRecord[];
  onDataChanged: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  statusData,
  attendanceRecords,
  onDataChanged,
}) => {
  const { showToast } = useToast();
  const [selectedWarningType, setSelectedWarningType] = useState<WarningType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  if (!statusData) return null;

  const { student, totalAbsences, doctorLetterCount, eligibleAbsences, warning1, warning2, warning3, breakdown } =
    statusData;

  // Filter attendance records specifically for this student with resilient matching & date deduplication
  const normStudentName = normalizeStudentName(student.name);
  const normStudentClass = normalizeClassName(student.className);

  const matchedRawRecords = attendanceRecords.filter((r) => {
    if (r.isDeleted) return false;
    if (r.studentId === student.id) return true;
    if (normStudentName && r.studentName && normalizeStudentName(r.studentName) === normStudentName) {
      if (!normStudentClass || !r.className || normalizeClassName(r.className) === normStudentClass) {
        return true;
      }
    }
    return false;
  });

  const dateMap = new Map<string, AttendanceRecord>();
  for (const rec of matchedRawRecords) {
    const existing = dateMap.get(rec.date);
    if (!existing) {
      dateMap.set(rec.date, rec);
    } else {
      const existingIsTiada = (existing.reason || '').trim().toUpperCase() === 'TIADA MAKLUMAN';
      const recIsTiada = (rec.reason || '').trim().toUpperCase() === 'TIADA MAKLUMAN';
      if (existingIsTiada && !recIsTiada) {
        dateMap.set(rec.date, rec);
      } else if (rec.updatedAt && (!existing.updatedAt || rec.updatedAt > existing.updatedAt)) {
        dateMap.set(rec.date, rec);
      }
    }
  }

  const studentRecords = Array.from(dateMap.values()).sort((a, b) => (a.date > b.date ? -1 : 1));

  // Anchor Dates helpers
  const w1Date = warning1?.issueDate && warning1.issueDate.trim() !== '' ? warning1.issueDate : null;
  const w2Date = warning2?.issueDate && warning2.issueDate.trim() !== '' ? warning2.issueDate : null;
  const w3Date = warning3?.issueDate && warning3.issueDate.trim() !== '' ? warning3.issueDate : null;

  // Render individual warning card with Anchor Date breakdown and progress bar
  const renderWarningCard = (
    title: string,
    warningType: WarningType,
    warningData: typeof warning1,
    stageInfo?: StageBreakdown
  ) => {
    const isIssued = Boolean(warningData && warningData.issueDate && warningData.issueDate.trim() !== '');
    const isWaiting = stageInfo?.isWaiting ?? false;
    const isThresholdReached = stageInfo?.isThresholdReached ?? false;
    const count = stageInfo?.count ?? 0;
    const threshold = stageInfo?.threshold ?? 10;
    const percentage = stageInfo?.percentage ?? 0;

    let cardBorder = 'border-slate-200 bg-white shadow-xs';
    if (isIssued) {
      cardBorder = 'border-emerald-300 bg-emerald-50/40';
    } else if (isThresholdReached) {
      cardBorder = 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-400/30';
    } else if (isWaiting) {
      cardBorder = 'border-slate-200 bg-slate-50/70 opacity-90';
    }

    return (
      <div className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${cardBorder}`}>
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{title}</h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                isIssued
                  ? 'bg-emerald-100 text-emerald-800'
                  : isThresholdReached
                  ? 'bg-rose-100 text-rose-700 animate-pulse'
                  : isWaiting
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isIssued
                ? '🟢 DIREKODKAN'
                : isThresholdReached
                ? '🔴 PERLU DIKELUARKAN'
                : isWaiting
                ? '⏳ MENUNGGU'
                : '🟡 DALAM PROSES'}
            </span>
          </div>

          {/* Anchor Date & Progress Breakdown */}
          <div className="my-2.5 p-2.5 rounded-lg bg-white/90 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Asas Kiraan (Anchor):</span>
              <span className="font-semibold text-slate-800">
                {stageInfo?.anchorDate ? formatDateDisplay(stageInfo.anchorDate) : stageInfo?.anchorName || 'Awal Tahun'}
              </span>
            </div>

            {isWaiting ? (
              <div className="p-2 rounded bg-amber-50 border border-amber-200/70 text-[11px] text-amber-800 leading-tight">
                <span className="font-semibold block mb-0.5">⏳ Menunggu Surat Terdahulu:</span>
                <span>{stageInfo?.waitingReason || 'Tarikh surat amaran terdahulu belum direkodkan. Kiraan belum bermula.'}</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="font-bold text-slate-700">
                    {warningType === 'warning1'
                      ? `Kiraan: ${count}/${threshold} hari`
                      : warningType === 'warning2'
                      ? `Selepas Amaran 1: ${count}/${threshold} hari`
                      : `Selepas Amaran 2: ${count}/${threshold} hari`}
                  </span>
                  <span className="font-bold text-slate-600">{percentage}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isIssued
                        ? 'bg-emerald-500'
                        : isThresholdReached
                        ? 'bg-rose-500'
                        : percentage >= 50
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Catatan Tarikh Rekod Surat Jika Telah Dikeluarkan */}
            {isIssued && warningData && (
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tarikh Surat:</span>
                  <span className="font-bold text-emerald-800">{formatDateDisplay(warningData.issueDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Direkod Oleh:</span>
                  <span className="text-slate-700">{warningData.recordedBy}</span>
                </div>
                {warningData.notes && (
                  <div className="text-[10.5px] text-slate-500 italic pt-0.5">"{warningData.notes}"</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Butang Tindakan */}
        <button
          type="button"
          onClick={() => setSelectedWarningType(warningType)}
          className={`w-full mt-2 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
            isIssued
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              : isThresholdReached
              ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs animate-pulse'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
          }`}
        >
          {isIssued ? (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              <span>EDIT TARIKH SURAT</span>
            </>
          ) : (
            <>
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>REKOD SURAT DIKELUARKAN</span>
            </>
          )}
        </button>
      </div>
    );
  };

  const expulsion = breakdown?.expulsion;

  const handleExportStudentCsv = () => {
    const exportData = buildSingleStudentExportData(statusData, studentRecords);
    const csv = generateCsvString(exportData.headers, exportData.rows);
    downloadCsvFile(exportData.filename, csv);
    showToast(`✅ Rekod ${student.name} berjaya dimuat turun sebagai CSV!`, 'success');
  };

  const handleExportStudentSheets = async () => {
    const exportData = buildSingleStudentExportData(statusData, studentRecords);
    const tsv = generateTsvString(exportData.headers, exportData.rows);
    await copyToClipboard(tsv);
    openNewGoogleSheet();
    showToast(`🚀 Google Sheets dibuka! Data ${student.name} telah disalin ke papan keratan (tekan Ctrl+V).`, 'success');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={student.name}
        subtitle={`Kelas: ${student.className} • No. Matrik: ${student.studentNumber || '-'}`}
        maxWidth="4xl"
      >
        <div className="space-y-6">
          {/* Bar Tindakan Profil Murid */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Status Murid: </span>
              {student.status === 'pindah' ? (
                <span className="text-amber-700 font-bold">Pindah Sekolah ({student.deletedReason})</span>
              ) : student.status === 'dibuang' ? (
                <span className="text-rose-700 font-bold">Dibuang Sekolah ({student.deletedReason})</span>
              ) : (
                <span className="text-emerald-700 font-bold">Aktif Dalam Sistem</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleExportStudentSheets}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Buka data murid ini di Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Buka di Sheets</span>
              </button>
              <button
                type="button"
                onClick={handleExportStudentCsv}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                title="Muat turun fail CSV profil dan rekod amaran murid ini"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Muat Turun CSV</span>
              </button>
              <button
                type="button"
                id="btn-profile-delete-student"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Padam murid atau tandakan sebagai pindah / dibuang sekolah"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Padam / Pindah</span>
              </button>
            </div>
          </div>

          {/* Ringkasan Statistik Murid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Ringkasan Rekod Ketidakhadiran
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">Jumlah Hari Tidak Hadir</span>
                  <span className="text-xl font-bold text-slate-900">{totalAbsences} hari</span>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-emerald-800 block">Surat Doktor (Dikecualikan)</span>
                  <span className="text-xl font-bold text-emerald-900">{doctorLetterCount} hari</span>
                </div>
              </div>

              <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3.5 flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-rose-800 block">Dikira Untuk Amaran</span>
                  <span className="text-xl font-bold text-rose-900">{eligibleAbsences} hari</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Amaran Tiga Kad (Konsep Anchor Date) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>Pecahan Kiraan Surat Amaran (Anchor Date)</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Kiraan setiap amaran HANYA bermula selepas tarikh surat terdahulu direkodkan.
                </span>
              </div>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                Mod: {breakdown?.activeRuleType === 'consecutive' ? 'Berturut-turut' : 'Berkala'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {renderWarningCard('SURAT AMARAN 1', 'warning1', warning1, breakdown?.stage1)}
              {renderWarningCard('SURAT AMARAN 2', 'warning2', warning2, breakdown?.stage2)}
              {renderWarningCard('SURAT AMARAN 3', 'warning3', warning3, breakdown?.stage3)}
            </div>
          </div>

          {/* Kad Status Tindakan Buang Sekolah (Alert Sahaja) */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              expulsion?.isThresholdReached
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/30'
                : expulsion?.isWaiting
                ? 'bg-slate-50 border-slate-200 opacity-80'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert
                    className={`w-4 h-4 ${
                      expulsion?.isThresholdReached ? 'text-purple-700 animate-pulse' : 'text-slate-500'
                    }`}
                  />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Peringkat Tindakan Buang Sekolah (Alert Sahaja)
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      expulsion?.isThresholdReached
                        ? 'bg-purple-200 text-purple-900 animate-pulse'
                        : expulsion?.isWaiting
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {expulsion?.isThresholdReached
                      ? '⚠️ AMARAN AMBANG DICAPAI'
                      : expulsion?.isWaiting
                      ? '⏳ MENUNGGU AMARAN 3'
                      : 'DALAM PEMANTAUAN'}
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-600 leading-normal">
                  {expulsion?.isWaiting ? (
                    <span>
                      Kiraan bagi peringkat tindakan buang sekolah hanya akan diaktifkan sekiranya Surat Amaran 3 telah
                      dikeluarkan dan tarikhnya direkodkan.
                    </span>
                  ) : (
                    <span>
                      Kiraan ketidakhadiran selepas Surat Amaran 3 ({formatDateDisplay(w3Date)}):{' '}
                      <strong>
                        {expulsion?.count} / {expulsion?.threshold} hari
                      </strong>{' '}
                      ({expulsion?.percentage}%).
                    </span>
                  )}
                </p>

                {expulsion?.isThresholdReached && (
                  <div className="p-2.5 rounded-lg bg-purple-100 border border-purple-200 text-[11.5px] text-purple-900 font-medium">
                    ⚠️ <strong>PERHATIAN PENTADBIR & GURU DISIPLIN:</strong> Murid ini telah melepasi ambang had hari tidak
                    hadir ({expulsion.count}/{expulsion.threshold} hari selepas Surat Amaran 3). Kes perlu dibawa ke
                    mesyuarat Jawatankuasa Disiplin Sekolah. <em>Sistem tidak mengeluarkan surat buang sekolah secara automatik.</em>
                  </div>
                )}
              </div>

              {!expulsion?.isWaiting && (
                <div className="w-32 shrink-0 text-right">
                  <div className="text-[11px] font-bold text-slate-700 mb-1">{expulsion?.percentage}%</div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full ${expulsion?.isThresholdReached ? 'bg-purple-600' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, expulsion?.percentage || 0)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Jadual Rekod Ketidakhadiran Murid & Hubungkait Anchor Date */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Sejarah Kehadiran Murid ({studentRecords.length} Rekod)
              </h4>
              <span className="text-[11px] text-slate-400">
                Diisih dari tarikh terkini ke terdahulu
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Bil</th>
                    <th className="py-2.5 px-3">Tarikh Tidak Hadir</th>
                    <th className="py-2.5 px-3">Sebab Ketidakhadiran</th>
                    <th className="py-2.5 px-3">Klasifikasi Fasa Anchor Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Tiada rekod ketidakhadiran ditemui.
                      </td>
                    </tr>
                  ) : (
                    studentRecords.map((rec, idx) => {
                      // Tentukan fasa pengiraan rekod ini mengikut tarikh surat amaran
                      let phaseBadge = (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          🟡 Fasa Amaran 1
                        </span>
                      );

                      if (!rec.countsTowardsWarning) {
                        phaseBadge = (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            🟢 Dikecualikan (Surat Doktor / MC)
                          </span>
                        );
                      } else if (w3Date && isDateAfter(rec.date, w3Date)) {
                        phaseBadge = (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            🟣 Fasa Tindakan Buang Sekolah (Selepas Amaran 3)
                          </span>
                        );
                      } else if (w2Date && isDateAfter(rec.date, w2Date)) {
                        phaseBadge = (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            🔴 Fasa Amaran 3 (Selepas Amaran 2)
                          </span>
                        );
                      } else if (w1Date && isDateAfter(rec.date, w1Date)) {
                        phaseBadge = (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            🟠 Fasa Amaran 2 (Selepas Amaran 1)
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={rec.id}
                          className={`hover:bg-slate-50/80 ${
                            !rec.countsTowardsWarning ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                            {formatDateDisplay(rec.date)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                rec.reason === 'TIADA MAKLUMAN'
                                  ? 'bg-slate-100 text-slate-600 font-normal'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200 font-semibold'
                              }`}
                            >
                              {rec.reason}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">{phaseBadge}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Merekod/Mengedit Tarikh Surat Amaran (Secara Manual) */}
      {selectedWarningType && (
        <RecordWarningModal
          isOpen={Boolean(selectedWarningType)}
          onClose={() => setSelectedWarningType(null)}
          student={student}
          warningType={selectedWarningType}
          existingWarning={
            selectedWarningType === 'warning1'
              ? warning1
              : selectedWarningType === 'warning2'
              ? warning2
              : warning3
          }
          onSaved={() => {
            onDataChanged();
          }}
        />
      )}

      {/* Modal Padam / Pindah / Buang Murid */}
      {isDeleteModalOpen && (
        <DeleteStudentModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          student={student}
          onDeleted={() => {
            setIsDeleteModalOpen(false);
            onClose();
            onDataChanged();
          }}
        />
      )}
    </>
  );
};
