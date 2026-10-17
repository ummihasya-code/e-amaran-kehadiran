import React, { useState } from 'react';
import { Modal } from './Modal';
import {
  AttendanceRecord,
  SchoolClass,
  Student,
  StudentWarningStatus,
  WarningLetter,
} from '../../types';
import {
  ExportDatasetType,
  ExportTableData,
  buildStudentWarningMasterData,
  buildWarningLettersLogData,
  buildAttendanceRecordsData,
  buildPendingActionsData,
  generateCsvString,
  generateTsvString,
  downloadCsvFile,
  copyToClipboard,
  openNewGoogleSheet,
} from '../../utils/exportUtils';
import { sortSchoolClasses } from '../../utils/classOrder';
import { useToast } from './Toast';
import {
  FileSpreadsheet,
  Download,
  Copy,
  ExternalLink,
  CheckCircle2,
  Table,
  Filter,
  Info,
  Layers,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  studentStatuses: StudentWarningStatus[];
  attendance: AttendanceRecord[];
  warnings: WarningLetter[];
  classes: SchoolClass[];
  initialDataset?: ExportDatasetType;
  defaultClass?: string;
  lockClass?: boolean; // If true (e.g. for teacher), cannot change class
}

export const DataExportModal: React.FC<DataExportModalProps> = ({
  isOpen,
  onClose,
  students,
  studentStatuses,
  attendance,
  warnings,
  classes,
  initialDataset = 'student_warnings_master',
  defaultClass = 'ALL',
  lockClass = false,
}) => {
  const { showToast } = useToast();
  const [datasetType, setDatasetType] = useState<ExportDatasetType>(initialDataset);
  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showSheetsGuide, setShowSheetsGuide] = useState<boolean>(false);

  // Jana data jadual berdasarkan pilihan semasa
  let currentExportData: ExportTableData;
  switch (datasetType) {
    case 'student_warnings_master':
      currentExportData = buildStudentWarningMasterData(studentStatuses, selectedClass);
      break;
    case 'warning_letters_log':
      currentExportData = buildWarningLettersLogData(warnings, students, selectedClass);
      break;
    case 'attendance_records':
      currentExportData = buildAttendanceRecordsData(attendance, selectedClass);
      break;
    case 'pending_actions':
      currentExportData = buildPendingActionsData(studentStatuses, selectedClass);
      break;
    default:
      currentExportData = buildStudentWarningMasterData(studentStatuses, selectedClass);
  }

  // Muat turun fail CSV
  const handleDownloadCsv = () => {
    try {
      const csv = generateCsvString(currentExportData.headers, currentExportData.rows);
      downloadCsvFile(currentExportData.filename, csv);
      showToast(`✅ Fail CSV "${currentExportData.filename}.csv" berjaya dimuat turun!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Ralat semasa memuat turun fail CSV.', 'error');
    }
  };

  // Salin data ke Clipboard untuk Google Sheets
  const handleCopyForGoogleSheets = async () => {
    try {
      const tsv = generateTsvString(currentExportData.headers, currentExportData.rows);
      const success = await copyToClipboard(tsv);
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
        showToast('📋 Data jadual disalin ke papan keratan! Buka Google Sheets dan tekan Paste (Ctrl+V).', 'success');
      } else {
        showToast('❌ Gagal menyalin ke papan keratan.', 'error');
      }
    } catch {
      showToast('❌ Ralat menyalin data.', 'error');
    }
  };

  // Buka Google Sheets dan salin data secara automatik
  const handleOpenGoogleSheets = async () => {
    try {
      const tsv = generateTsvString(currentExportData.headers, currentExportData.rows);
      await copyToClipboard(tsv);
      setIsCopied(true);
      setShowSheetsGuide(true);
      openNewGoogleSheet();
      showToast('🚀 Tab Google Sheets baharu dibuka! Data telah disalin — tekan Ctrl+V pada helaian.', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Ralat membuka Google Sheets.', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eksport Data Sistem (CSV & Google Sheets)"
      subtitle="Eksport rekod murid, data kehadiran harian dan surat amaran yang dikey-in oleh pengguna"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Pilihan Dataset & Penapis Kelas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Pilih Jenis Data Untuk Dieksport
            </label>
            <select
              value={datasetType}
              onChange={(e) => {
                setDatasetType(e.target.value as ExportDatasetType);
                setShowSheetsGuide(false);
              }}
              className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="student_warnings_master">
                1. Data Murid & Status Surat Amaran (Lengkap dengan Catatan Pengguna)
              </option>
              <option value="warning_letters_log">
                2. Log Terperinci Surat Amaran Dikey-In (Tarikh, Pengguna & Nota)
              </option>
              <option value="attendance_records">
                3. Semua Rekod Ketidakhadiran Harian (Penuh)
              </option>
              <option value="pending_actions">
                4. Senarai Murid Menunggu Tindakan Surat Amaran
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Penapis Kelas
            </label>
            <select
              disabled={lockClass}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="ALL">Semua Kelas ({classes.length})</option>
              {sortSchoolClasses(classes).map((c) => (
                <option key={c.id} value={c.className}>
                  Kelas {c.className}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Penerangan Dataset Terpilih */}
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-emerald-900 flex items-center gap-2">
              <span>{currentExportData.title}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-200 text-emerald-900">
                {currentExportData.totalRecords} Rekod Dijumpai
              </span>
            </div>
            <p className="text-emerald-800/90 leading-relaxed text-[11px]">
              {currentExportData.description}
            </p>
          </div>
        </div>

        {/* Panduan Google Sheets jika pengguna tekan buka sheets */}
        {showSheetsGuide && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Panduan Menampal ke Google Sheets:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-blue-900/90 pl-1 text-[11px] leading-relaxed">
              <li>Tab Google Sheets baharu telah dibuka secara automatik.</li>
              <li>
                Klik pada sel pertama (<strong>A1</strong>) di Google Sheets tersebut.
              </li>
              <li>
                Tekan kekunci pintas <strong>Ctrl + V</strong> (atau <strong>Cmd + V</strong> di Mac) untuk menampal semua data. Semua lajur dan tajuk akan tersusun dengan kemas.
              </li>
              <li>
                Alternatif: Anda juga boleh memuat turun fail <strong>.CSV</strong> di bawah dan muat naik melalui menu <em>Fail &gt; Import &gt; Muat Naik</em> di Google Sheets.
              </li>
            </ol>
          </div>
        )}

        {/* Pratonton Data Ringkas (Preview 5 baris pertama) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-0.5">
            <span className="flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-slate-400" />
              Pratonton Data ({Math.min(currentExportData.rows.length, 5)} daripada {currentExportData.totalRecords} baris):
            </span>
            <span>{currentExportData.headers.length} Lajur</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-48 overflow-y-auto overflow-x-auto text-left">
            <table className="w-full text-[11px] border-collapse min-w-[700px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  {currentExportData.headers.slice(0, 7).map((h, i) => (
                    <th key={i} className="py-2 px-2.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  {currentExportData.headers.length > 7 && (
                    <th className="py-2 px-2.5 text-slate-400 whitespace-nowrap italic">
                      +{currentExportData.headers.length - 7} lajur lagi...
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentExportData.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-xs text-slate-400 italic"
                    >
                      Tiada rekod data dijumpai bagi kriteria pilihan ini.
                    </td>
                  </tr>
                ) : (
                  currentExportData.rows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 transition">
                      {row.slice(0, 7).map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="py-1.5 px-2.5 whitespace-nowrap text-slate-800"
                        >
                          {String(cell || '-')}
                        </td>
                      ))}
                      {row.length > 7 && (
                        <td className="py-1.5 px-2.5 text-slate-400 italic whitespace-nowrap">
                          ...
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Butang Tindakan Eksport: CSV & Google Sheets */}
        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Format CSV UTF-8 BOM disokong 100% oleh Excel & Google Sheets.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Butang Salin ke Clipboard */}
            <button
              type="button"
              id="btn-copy-export-data"
              onClick={handleCopyForGoogleSheets}
              disabled={currentExportData.rows.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Salin data terus ke papan keratan"
            >
              <Copy className="w-3.5 h-3.5 text-slate-600" />
              <span>{isCopied ? 'Telah Disalin!' : 'Salin Data'}</span>
            </button>

            {/* Butang Buka & Eksport ke Google Sheets */}
            <button
              type="button"
              id="btn-open-google-sheets"
              onClick={handleOpenGoogleSheets}
              disabled={currentExportData.rows.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Buka di Google Sheets</span>
              <ExternalLink className="w-3 h-3 text-emerald-700 ml-0.5" />
            </button>

            {/* Butang Muat Turun CSV Utama */}
            <button
              type="button"
              id="btn-download-csv-data"
              onClick={handleDownloadCsv}
              disabled={currentExportData.rows.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Muat Turun Fail CSV (.csv)</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
