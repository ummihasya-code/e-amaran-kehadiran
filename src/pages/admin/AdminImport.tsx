import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ImportPreviewResult } from '../../types';
import {
  parseExcelOrCsvDetailed,
  generateImportPreview,
  commitImport,
  DetectedColumnsInfo,
} from '../../services/importEngine';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import { formatDateDisplay } from '../../utils/dateUtils';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Download,
  RefreshCw,
  FileText,
  Sliders,
} from 'lucide-react';

interface AdminImportProps {
  onImportComplete: () => void;
}

export const AdminImport: React.FC<AdminImportProps> = ({ onImportComplete }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumnsInfo | null>(null);
  const [selectedSebabCol, setSelectedSebabCol] = useState<number | undefined>(undefined);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [importReport, setImportReport] = useState<{
    added: number;
    updated: number;
    duplicate: number;
    existing: number;
    createdClassesCount: number;
    createdStudentsCount: number;
    createdClassNames: string[];
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFile(files[0]);
  };

  const processFile = async (file: File, overrideSebabColIdx?: number) => {
    setSelectedFile(file);
    setIsParsing(true);
    setPreview(null);
    setImportReport(null);

    try {
      const buffer = await file.arrayBuffer();
      setFileData(buffer);
      const parseResult = await parseExcelOrCsvDetailed(buffer, overrideSebabColIdx);
      if (parseResult.rows.length === 0) {
        showToast('Fail tidak mengandungi sebarang data murid atau ketidakhadiran.', 'warning');
        setIsParsing(false);
        return;
      }
      setDetectedColumns(parseResult.detectedColumns);
      setSelectedSebabCol(parseResult.detectedColumns.sebabColIndex);
      const previewRes = await generateImportPreview(parseResult.rows, parseResult.detectedColumns);
      setPreview(previewRes);
    } catch (err: any) {
      console.error(err);
      showToast('❌ Ralat membaca fail. Pastikan format adalah XLSX atau CSV.', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSebabColChange = async (colIndex: number) => {
    if (!fileData) return;
    setIsParsing(true);
    try {
      const parseResult = await parseExcelOrCsvDetailed(fileData, colIndex);
      setDetectedColumns(parseResult.detectedColumns);
      setSelectedSebabCol(colIndex);
      const previewRes = await generateImportPreview(parseResult.rows, parseResult.detectedColumns);
      setPreview(previewRes);
      const colName = parseResult.detectedColumns.rawHeaders[colIndex] || `Kolum ${colIndex + 1}`;
      showToast(`✅ Lajur Sebab Tidak Hadir ditetapkan kepada: "${colName}"`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Ralat mengemas kini lajur sebab.', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setIsCommitting(true);
    try {
      const res = await commitImport(
        preview,
        user ? { id: user.id, name: user.name } : undefined
      );

      setImportReport({
        added: res.addedCount,
        updated: res.updatedCount || 0,
        duplicate: res.duplicateCount,
        existing: res.existingCount,
        createdClassesCount: res.createdClassesCount,
        createdStudentsCount: res.createdStudentsCount,
        createdClassNames: res.createdClassNames,
      });

      let successMsg = `✅ Selesai: ${res.createdClassesCount} kelas baharu dicipta, ${res.createdStudentsCount} murid didaftarkan.`;
      if (res.addedCount > 0) {
        successMsg += ` (${res.addedCount} rekod ditambah)`;
      }
      if (res.updatedCount > 0) {
        successMsg += ` (${res.updatedCount} sebab kehadiran disegerakkan)`;
      }
      showToast(successMsg, 'success');
      onImportComplete();
    } catch (err: any) {
      console.error(err);
      showToast('❌ Import gagal. Tiada perubahan dibuat pada pangkalan data.', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileData(null);
    setDetectedColumns(null);
    setSelectedSebabCol(undefined);
    setPreview(null);
    setImportReport(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Muat turun templat rasmi XLSX
  const downloadTemplate = () => {
    const templateData = [
      {
        Bil: 1,
        Kelas: '3 AA',
        'Tarikh Tidak Hadir': '15/09/2026',
        Nama: 'DARSHAN KUMAR A/L VISHNU',
        'Sebab Tidak Hadir': 'MAKLUMAN IBU BAPA PENJAGA',
        'Surat Amaran 1': '',
        'Surat Amaran 2': '',
        'Surat Amaran 3': '',
      },
      {
        Bil: 2,
        Kelas: '4 AL-GHAZALI',
        'Tarikh Tidak Hadir': '16/09/2026',
        Nama: 'NUR ALIA BINTI MOHD ZAKI',
        'Sebab Tidak Hadir': 'SURAT CUTI SAKIT HOSPITAL/KLINIK',
        'Surat Amaran 1': '',
        'Surat Amaran 2': '',
        'Surat Amaran 3': '',
      },
      {
        Bil: 3,
        Kelas: '5 CEMERLANG',
        'Tarikh Tidak Hadir': '17/09/2026',
        Nama: 'SITI NURHALIZA BINTI ROSLAN',
        'Sebab Tidak Hadir': 'MENJAGA AHLI KELUARGA',
        'Surat Amaran 1': '',
        'Surat Amaran 2': '',
        'Surat Amaran 3': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Kehadiran');
    XLSX.writeFile(wb, 'Templat_Import_eAmaran_2026.xlsx');
    showToast('📥 Templat Excel berjaya dimuat turun.', 'info');
  };

  // Muat data sampel ujian cepat (Quick Test Dataset)
  const loadTestDataset = async () => {
    const testRows = [
      {
        kelas: '3 AA',
        tarikh: '10/09/2026',
        nama: 'DARSHAN KUMAR A/L VISHNU',
        sebab: 'MAKLUMAN IBU BAPA PENJAGA',
      },
      {
        kelas: '4 AL-GHAZALI', // Kelas baharu automatik dicipta
        tarikh: '11/09/2026',
        nama: 'MUHAMMAD HARITH BIN KAMAL',
        sebab: 'URUSAN KELUARGA',
      },
      {
        kelas: '5 CEMERLANG', // Kelas baharu automatik dicipta
        tarikh: '12/09/2026',
        nama: 'NUR AMIRAH BINTI ZULKIFLI',
        sebab: 'DEMAM SELESEMA',
      },
      {
        kelas: '3 AA',
        tarikh: '06/08/2026', // Duplicate untuk semak deduplikasi
        nama: 'DARSHAN KUMAR A/L VISHNU',
        sebab: 'MENJAGA/MENGURUSKAN AHLI KELUARGA',
      },
    ];

    setIsParsing(true);
    setSelectedFile(new File([''], 'Data_Ujian_Incremental_2026.xlsx'));
    const dummyDetectedCols: DetectedColumnsInfo = {
      bilColIndex: 0,
      namaColIndex: 1,
      kelasColIndex: 2,
      tarikhColIndex: 3,
      sebabColIndex: 4,
      namaHeader: 'Nama Murid',
      kelasHeader: 'Kelas',
      tarikhHeader: 'Tarikh Tidak Hadir',
      sebabHeader: 'Sebab Tidak Hadir',
      rawHeaders: ['Bil', 'Nama Murid', 'Kelas', 'Tarikh Tidak Hadir', 'Sebab Tidak Hadir'],
      headerRowIdx: 0,
    };
    setDetectedColumns(dummyDetectedCols);
    setSelectedSebabCol(4);
    const previewRes = await generateImportPreview(testRows, dummyDetectedCols);
    setPreview(previewRes);
    setIsParsing(false);
    showToast('🧪 Data simulasi (dengan pelbagai sebab ketidakhadiran & kelas baharu) sedia untuk pratonton.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header & Penerangan Peraturan Import */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Import Data Kehadiran (Excel / CSV)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem import pintar secara <span className="font-bold text-emerald-700">APPEND + MERGE + DEDUPLICATE</span> tanpa memadam rekod terdahulu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Muat Turun Templat</span>
          </button>
          <button
            onClick={loadTestDataset}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Muat Data Ujian Demonstrasi</span>
          </button>
        </div>
      </div>

      {/* Syarat & Perlindungan Data (Rules 10 & 19) */}
      <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 text-xs text-blue-900 space-y-1.5">
        <div className="font-bold flex items-center gap-1.5 text-blue-950">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>Jaminan Perlindungan Data Incremental (e-AMARAN Protection Engine):</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800 pl-1">
          <li><strong>Rekod sedia ada KEKAL:</strong> Import baharu tidak akan sesekali memadam atau mereset data sejarah.</li>
          <li><strong>Perlindungan Rekod Guru:</strong> Tarikh surat amaran yang telah direkodkan oleh guru kelas tidak akan dioverwrite kepada kosong sekiranya fail Excel baharu mengosongkannya.</li>
          <li><strong>Fingerprint Anti-Duplicate:</strong> Rekod murid + tarikh + sebab yang sama tidak akan digandakan.</li>
          <li><strong>Format Kolum yang Disokong:</strong> Bil, Kelas, Tarikh Tidak Hadir, Nama, Sebab Tidak Hadir, Surat Amaran 1, Surat Amaran 2, Surat Amaran 3.</li>
        </ul>
      </div>

      {/* Upload Box (Drag and Drop / Click) */}
      {!preview && !importReport && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isParsing ? 'Sedang Menganalisis Fail...' : 'Klik atau Seret Fail Ke Sini'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Menyokong fail Excel (.xlsx, .xls) dan CSV mengikut format kehadiran sekolah (idMe, APDM, atau tersuai).
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
              <span>📅</span>
              <span>Pengecaman Tarikh Pintar: <strong>DD/MM/YYYY</strong>, <strong>DD-MM-YYYY</strong>, <strong>DD.MM.YYYY</strong>, nombor siri Excel, atau nama bulan (cth: 16 Sep 2026).</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* PREVIEW IMPORT (Requirement 12) */}
      {preview && !importReport && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pratonton Hasil Import (Import Preview)
                </h3>
                <p className="text-xs text-slate-500">
                  Semakan analitik baris dalam fail sebelum dimasukkan ke dalam pangkalan data.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    isCommitting ||
                    (preview.newRecordsCount === 0 &&
                      preview.newClassesCount === 0 &&
                      preview.newStudentsCount === 0 &&
                      (preview.updatedRecordsCount || 0) === 0)
                  }
                  onClick={handleCommit}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isCommitting ? 'Sedang Mengimport...' : 'TERUSKAN IMPORT'}</span>
                </button>
              </div>
            </div>

            {/* Kotak Ringkasan Mengikut Format Wajib Soalan & Auto-Kelas (Requirement 12) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Jumlah Baris
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {preview.totalRowsInFile}
                </span>
              </div>

              <div className="rounded-xl bg-purple-50 border border-purple-200 p-3">
                <span className="text-[11px] font-semibold text-purple-700 uppercase block">
                  Kelas Auto-Daftar
                </span>
                <span className="text-2xl font-black text-purple-800">
                  {preview.newClassesCount}
                </span>
              </div>

              <div className="rounded-xl bg-teal-50 border border-teal-200 p-3">
                <span className="text-[11px] font-semibold text-teal-700 uppercase block">
                  Murid Baharu
                </span>
                <span className="text-2xl font-black text-teal-800">
                  {preview.newStudentsCount}
                </span>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase block">
                  Kehadiran Baharu
                </span>
                <span className="text-2xl font-black text-emerald-800">
                  {preview.newRecordsCount}
                </span>
              </div>

              <div className="rounded-xl bg-sky-50 border border-sky-200 p-3">
                <span className="text-[11px] font-semibold text-sky-700 uppercase block">
                  Segerak Sebab
                </span>
                <span className="text-2xl font-black text-sky-800">
                  {preview.updatedRecordsCount || 0}
                </span>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <span className="text-[11px] font-semibold text-blue-700 uppercase block">
                  Sedia Ada
                </span>
                <span className="text-2xl font-black text-blue-800">
                  {preview.existingRecordsCount}
                </span>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <span className="text-[11px] font-semibold text-amber-700 uppercase block">
                  Duplicate
                </span>
                <span className="text-2xl font-black text-amber-800">
                  {preview.duplicateCount}
                </span>
              </div>
            </div>

            {/* Sorotan Auto-Tambah Kelas Mengikut Murid */}
            {preview.newClassesCount > 0 && (
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-2">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">🏛️</span>
                    <span>Kelas Baharu Dikesan Mengikut Murid ({preview.newClassesCount} Kelas):</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                    Auto-Dicipta Semasa Import
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {preview.newClassNames.map((cName, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white border border-purple-300 font-bold text-purple-800 text-xs shadow-2xs"
                    >
                      {cName}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-purple-700">
                  ✨ Sistem akan menambah dan mendaftarkan kelas-kelas ini secara automatik ke dalam direktori sekolah mengikut nama murid yang diimport.
                </p>
              </div>
            )}

            {/* Senarai ralat baris jika ada */}
            {preview.errors.length > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Ralat Dikesan Pada Baris Fail:</span>
                </div>
                {preview.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-[11px] pl-5">• {err}</p>
                ))}
              </div>
            )}

            {/* Pengecaman Lajur Pintar & Pemilihan Lajur Sebab (Jika ada fail sebenar) */}
            {detectedColumns && detectedColumns.rawHeaders && detectedColumns.rawHeaders.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Analisis Pemetaan Lajur (Pengecaman Pintar APDM/Excel):</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Baris Tajuk Dikesan: <strong>Baris ke-{detectedColumns.headerRowIdx + 1}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Nama Murid</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {detectedColumns.namaHeader ? `✓ "${detectedColumns.namaHeader}"` : '⚠️ Tidak Ditemui'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Kelas</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {detectedColumns.kelasHeader ? `✓ "${detectedColumns.kelasHeader}"` : '⚠️ Tidak Ditemui'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tarikh Kehadiran</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {detectedColumns.tarikhHeader ? `✓ "${detectedColumns.tarikhHeader}"` : '⚠️ Tidak Ditemui'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-300 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">Sebab / Catatan Tidak Hadir</span>
                      <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">Lajur Pilihan</span>
                    </div>
                    {fileData ? (
                      <select
                        value={selectedSebabCol !== undefined ? selectedSebabCol : detectedColumns.sebabColIndex}
                        onChange={(e) => handleSebabColChange(Number(e.target.value))}
                        className="w-full text-xs font-semibold text-emerald-950 bg-white border border-emerald-300 rounded-lg p-1.5 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      >
                        {detectedColumns.rawHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>
                            {header ? `Lajur: "${header}"` : `Lajur ${idx + 1}`}
                            {idx === detectedColumns.sebabColIndex ? ' ★ (Padanan Sistem)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-semibold text-emerald-900 truncate block">
                        ✓ "{detectedColumns.sebabHeader || 'Sebab Tidak Hadir'}"
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  💡 Sekiranya fail anda mempunyai lajur sebab khusus (cth: "Catatan", "Alasan", "Status", dsb.), anda boleh menukarnya melalui menu di atas untuk memadankan data dengan serta-merta.
                </p>
              </div>
            )}

            {/* Jadual Baris Pratonton */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Senarai Rekod Yang Dianalisis ({preview.parsedRecords.length} Baris)
                </h4>
                <span className="text-[11px] text-slate-500">
                  Sebab tidak hadir dipaparkan mengikut maklumat fail import sebenar
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Status Import</th>
                      <th className="py-2.5 px-3">Murid</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3">Tarikh</th>
                      <th className="py-2.5 px-3">Sebab Ketidakhadiran</th>
                      <th className="py-2.5 px-3">Kiraan Amaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.parsedRecords.map((item, idx) => {
                      const { record, isDuplicate, isExisting, isReasonUpdated, previousReason } = item;
                      let badge = (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          ✨ Baharu
                        </span>
                      );
                      if (isDuplicate) {
                        badge = (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            ⚠️ Duplicate
                          </span>
                        );
                      } else if (isReasonUpdated) {
                        badge = (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
                            🔄 Segerak Sebab
                          </span>
                        );
                      } else if (isExisting) {
                        badge = (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            ℹ️ Sedia Ada
                          </span>
                        );
                      }

                      const isTiadaMakluman = record.reason === 'TIADA MAKLUMAN';

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3">{badge}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {record.studentName}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{record.className}</td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                            {formatDateDisplay(record.date)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                  isTiadaMakluman
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold'
                                }`}
                              >
                                {record.reason}
                              </span>
                              {isReasonUpdated && previousReason && (
                                <span className="text-[10px] text-slate-400">
                                  Sebelum ini: <span className="line-through">{previousReason}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {record.countsTowardsWarning ? (
                              <span className="text-[10px] font-bold text-rose-700">🔴 Dikira</span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700">
                                🟢 Dikecualikan
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Laporan Hasil Import Berjaya (Requirement 48) */}
      {importReport && (
        <div className="rounded-2xl bg-white border border-emerald-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Import Data Berjaya Diselesaikan!
              </h3>
              <p className="text-xs text-slate-500">
                Pangkalan data sekolah telah dikemaskini secara serentak (Atomic Batch).
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs text-slate-700 font-medium">
            {importReport.createdClassesCount > 0 ? (
              <div className="flex items-start gap-2 text-purple-900 font-semibold bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                <span className="text-base leading-none">🏛️</span>
                <div>
                  <span><strong>{importReport.createdClassesCount} Kelas baharu</strong> telah ditambah secara automatik ke dalam sistem:</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {importReport.createdClassNames.map((cn, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-purple-300 rounded text-purple-800 text-[11px] font-bold">
                        {cn}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-600">
                <span>🏛️</span>
                <span>Semua murid dipadankan dengan kelas yang sedia ada.</span>
              </div>
            )}

            {importReport.createdStudentsCount > 0 && (
              <div className="flex items-center gap-2 text-teal-800 font-semibold">
                <span>👨‍🎓</span>
                <span><strong>{importReport.createdStudentsCount} Murid baharu</strong> berjaya didaftarkan mengikut kelas masing-masing.</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <span>✅</span>
              <span><strong>{importReport.added} rekod kehadiran baharu</strong> berjaya ditambah.</span>
            </div>
            {importReport.updated > 0 && (
              <div className="flex items-center gap-2 text-sky-800 font-semibold">
                <span>🔄</span>
                <span><strong>{importReport.updated} rekod kehadiran</strong> telah disegerakkan dengan sebab ketidakhadiran yang tepat mengikut fail import.</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-blue-800">
              <span>ℹ️</span>
              <span><strong>{importReport.existing} rekod sedia ada</strong> dikekalkan tanpa perubahan.</span>
            </div>
            {importReport.duplicate > 0 && (
              <div className="flex items-center gap-2 text-amber-800">
                <span>⚠️</span>
                <span><strong>{importReport.duplicate} rekod duplicate</strong> dikesan dan tidak dimasukkan.</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
            >
              Import Fail Lain
            </button>
            <button
              onClick={() => onImportComplete()}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
            >
              Kembali Ke Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
