import {
  AttendanceRecord,
  Student,
  StudentWarningStatus,
  WarningLetter,
} from '../types';
import { formatDateDisplay } from './dateUtils';

/**
 * Utiliti Eksport Data bagi e-AMARAN KEHADIRAN
 * Menyokong:
 * 1. Muat turun CSV (.csv) dengan UTF-8 BOM (keserasian 100% Microsoft Excel & Google Sheets)
 * 2. Eksport / Buka terus ke Google Sheets (Salin data berformat TSV ke papan keratan & buka sheets.new)
 */

export type ExportDatasetType =
  | 'student_warnings_master' // Semua maklumat murid & surat amaran 1, 2, 3 beserta catatan
  | 'warning_letters_log' // Log khusus semua surat amaran yang telah dikey-in oleh pengguna
  | 'attendance_records' // Semua rekod ketidakhadiran harian
  | 'pending_actions'; // Murid yang memerlukan tindakan surat amaran

/**
 * Membersihkan dan melepaskan aksara khas bagi format CSV (RFC 4180)
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // Sekiranya ada koma, tanda petik dua, atau baris baharu, bungkus dengan petik dua
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Menghasilkan fail teks CSV berpengekodan UTF-8 bersama BOM (\uFEFF)
 */
export function generateCsvString(
  headers: string[],
  rows: (string | number | undefined | null)[][]
): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsvCell).join(','));
  // UTF-8 BOM (\uFEFF) di hadapan supaya Excel dan Google Sheets tidak rosakkan tulisan teks Bahasa Melayu
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Menghasilkan teks TSV (Tab-Separated Values) untuk fungsi Salin & Tampal (Paste) terus ke Google Sheets
 */
export function generateTsvString(
  headers: string[],
  rows: (string | number | undefined | null)[][]
): string {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  };
  const headerLine = headers.map(sanitize).join('\t');
  const rowLines = rows.map((r) => r.map(sanitize).join('\t'));
  return [headerLine, ...rowLines].join('\n');
}

/**
 * Memuat turun rentetan CSV ke fail .csv pada komputer pengguna
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Salin teks TSV ke papan keratan (clipboard) untuk Google Sheets
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback untuk persekitaran bukan HTTPS
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Gagal menyalin ke clipboard:', err);
    return false;
  }
}

/**
 * Buka pautan baharu Google Sheets (sheets.new)
 */
export function openNewGoogleSheet(): void {
  try {
    window.open('https://sheets.new', '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = 'https://sheets.new';
  }
}

// ==========================================
// DATASET BUILDERS
// ==========================================

export interface ExportTableData {
  title: string;
  filename: string;
  description: string;
  headers: string[];
  rows: (string | number | undefined | null)[][];
  totalRecords: number;
}

/**
 * 1. Dataset Ringkasan Lengkap Murid & Status Surat Amaran 1, 2, 3 (Termasuk Catatan Pengguna)
 */
export function buildStudentWarningMasterData(
  studentStatuses: StudentWarningStatus[],
  filterClass?: string
): ExportTableData {
  const filtered = filterClass && filterClass !== 'ALL'
    ? studentStatuses.filter((s) => s.student.className === filterClass)
    : studentStatuses;

  const headers = [
    'Bil',
    'Nama Murid',
    'No. Matrik / KP',
    'Kelas',
    'Status Murid',
    'Jumlah Tidak Hadir Keseluruhan (Hari)',
    'Hari Sijil Sakit / Doktor',
    'Hari Dikira Amaran Ponteng',
    'Status Tindakan Amaran Terkini',
    'Tindakan Seterusnya',
    // Surat Amaran 1
    'Amaran 1: Tarikh Surat Keluar',
    'Amaran 1: Tarikh Direkod',
    'Amaran 1: Direkod Oleh',
    'Amaran 1: Catatan / Nota Pengguna',
    // Surat Amaran 2
    'Amaran 2: Tarikh Surat Keluar',
    'Amaran 2: Tarikh Direkod',
    'Amaran 2: Direkod Oleh',
    'Amaran 2: Catatan / Nota Pengguna',
    // Surat Amaran 3
    'Amaran 3: Tarikh Surat Keluar',
    'Amaran 3: Tarikh Direkod',
    'Amaran 3: Direkod Oleh',
    'Amaran 3: Catatan / Nota Pengguna',
  ];

  const rows = filtered.map((s, index) => {
    const w1 = s.warning1;
    const w2 = s.warning2;
    const w3 = s.warning3;

    return [
      index + 1,
      s.student.name,
      s.student.studentNumber || '-',
      s.student.className,
      s.student.status === 'pindah'
        ? 'Pindah Sekolah'
        : s.student.status === 'dibuang'
        ? 'Dibuang Sekolah'
        : 'Aktif',
      s.totalAbsences,
      s.doctorLetterCount,
      s.eligibleAbsences,
      s.statusLabel,
      s.nextActionRequired
        ? s.nextActionRequired === 'warning1'
          ? 'Perlu Surat Amaran 1'
          : s.nextActionRequired === 'warning2'
          ? 'Perlu Surat Amaran 2'
          : 'Perlu Surat Amaran 3'
        : s.status === 'expulsion_needed'
        ? 'Tindakan Gantung / Buang Sekolah'
        : 'Tiada',
      // W1
      w1 ? formatDateDisplay(w1.issueDate) : '-',
      w1?.recordedAt ? new Date(w1.recordedAt).toLocaleDateString('ms-MY') : '-',
      w1?.recordedBy || '-',
      w1?.notes || '-',
      // W2
      w2 ? formatDateDisplay(w2.issueDate) : '-',
      w2?.recordedAt ? new Date(w2.recordedAt).toLocaleDateString('ms-MY') : '-',
      w2?.recordedBy || '-',
      w2?.notes || '-',
      // W3
      w3 ? formatDateDisplay(w3.issueDate) : '-',
      w3?.recordedAt ? new Date(w3.recordedAt).toLocaleDateString('ms-MY') : '-',
      w3?.recordedBy || '-',
      w3?.notes || '-',
    ];
  });

  const today = new Date().toISOString().split('T')[0];
  const classSuffix = filterClass && filterClass !== 'ALL' ? `_${filterClass.replace(/\s+/g, '_')}` : '';

  return {
    title: 'Ringkasan Murid & Rekod Surat Amaran (Termasuk Catatan)',
    filename: `eAmaran_Data_Murid_Dan_Surat_Amaran${classSuffix}_${today}`,
    description: 'Data lengkap semua murid, pecahan ketidakhadiran, status amaran, tarikh keluaran surat amaran 1-3 berserta catatan pengguna yang dimasukkan ke sistem.',
    headers,
    rows,
    totalRecords: rows.length,
  };
}

/**
 * 2. Dataset Khusus Surat Amaran Yang Telah Dikeluarkan (Warning Letters Log)
 */
export function buildWarningLettersLogData(
  warnings: WarningLetter[],
  students: Student[],
  filterClass?: string
): ExportTableData {
  const studentMap = new Map<string, Student>();
  students.forEach((st) => studentMap.set(st.id, st));

  // Tapis mengikut kelas jika dipilih
  const enriched = warnings
    .map((w) => {
      const student = studentMap.get(w.studentId);
      return {
        warning: w,
        student,
      };
    })
    .filter((item) => {
      if (!item.student) return true;
      if (filterClass && filterClass !== 'ALL') {
        return item.student.className === filterClass;
      }
      return true;
    });

  // Susun mengikut tarikh surat dikeluarkan terkini
  enriched.sort((a, b) => (b.warning.issueDate || '').localeCompare(a.warning.issueDate || ''));

  const headers = [
    'Bil',
    'Nama Murid',
    'No. Matrik / KP',
    'Kelas',
    'Peringkat Surat Amaran',
    'Tarikh Surat Dikeluarkan (idMe/Surat Rasmi)',
    'Tarikh Direkod ke Sistem',
    'Direkod Oleh',
    'Terakhir Dikemaskini',
    'Dikemaskini Oleh',
    'Catatan / Nota Pengguna (Key-in)',
  ];

  const rows = enriched.map((item, index) => {
    const w = item.warning;
    const st = item.student;
    const typeLabel =
      w.warningType === 'warning1'
        ? 'Surat Amaran 1'
        : w.warningType === 'warning2'
        ? 'Surat Amaran 2'
        : 'Surat Amaran 3 (Terakhir)';

    return [
      index + 1,
      st?.name || `Murid ID: ${w.studentId}`,
      st?.studentNumber || '-',
      st?.className || '-',
      typeLabel,
      formatDateDisplay(w.issueDate),
      w.recordedAt ? new Date(w.recordedAt).toLocaleString('ms-MY') : '-',
      w.recordedBy || 'Guru / Pentadbir',
      w.updatedAt ? new Date(w.updatedAt).toLocaleString('ms-MY') : '-',
      w.updatedBy || '-',
      w.notes || '(Tiada Catatan)',
    ];
  });

  const today = new Date().toISOString().split('T')[0];
  const classSuffix = filterClass && filterClass !== 'ALL' ? `_${filterClass.replace(/\s+/g, '_')}` : '';

  return {
    title: 'Log Rekod Surat Amaran Yang Telah Dikey-In',
    filename: `eAmaran_Log_Surat_Amaran${classSuffix}_${today}`,
    description: 'Senarai semua surat amaran yang telah dimasukkan oleh guru dan pentadbir lengkap dengan tarikh rasmi, catatan, dan individu yang merekodkannya.',
    headers,
    rows,
    totalRecords: rows.length,
  };
}

/**
 * 3. Dataset Semua Rekod Ketidakhadiran Harian (Attendance Records)
 */
export function buildAttendanceRecordsData(
  attendance: AttendanceRecord[],
  filterClass?: string
): ExportTableData {
  const filtered = attendance.filter((a) => {
    if (a.isDeleted) return false;
    if (filterClass && filterClass !== 'ALL' && a.className !== filterClass) return false;
    return true;
  });

  // Susun mengikut tarikh ketidakhadiran menurun
  filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const headers = [
    'Bil',
    'Tarikh Tidak Hadir',
    'Nama Murid',
    'Kelas',
    'Sebab / Alasan Ketidakhadiran',
    'Kategori Amaran',
    'Tarikh Rekod Dicipta',
    'Direkod Oleh',
  ];

  const rows = filtered.map((a, index) => [
    index + 1,
    formatDateDisplay(a.date),
    a.studentName || '-',
    a.className,
    a.reason || 'TIADA MAKLUMAN',
    a.countsTowardsWarning ? 'Dikira Amaran Ponteng' : 'Dikecualikan (Sijil Sakit / Doktor)',
    a.createdAt ? new Date(a.createdAt).toLocaleDateString('ms-MY') : '-',
    a.createdBy || 'Sistem / Import APDM',
  ]);

  const today = new Date().toISOString().split('T')[0];
  const classSuffix = filterClass && filterClass !== 'ALL' ? `_${filterClass.replace(/\s+/g, '_')}` : '';

  return {
    title: 'Rekod Penuh Ketidakhadiran Harian',
    filename: `eAmaran_Rekod_Kehadiran${classSuffix}_${today}`,
    description: 'Senarai setiap ketidakhadiran murid dengan tarikh, sebab, status pengiraan amaran, dan rekod pengguna.',
    headers,
    rows,
    totalRecords: rows.length,
  };
}

/**
 * 4. Dataset Murid Menunggu Tindakan Amaran (Pending Action Students)
 */
export function buildPendingActionsData(
  studentStatuses: StudentWarningStatus[],
  filterClass?: string
): ExportTableData {
  const filtered = studentStatuses.filter((s) => {
    if (filterClass && filterClass !== 'ALL' && s.student.className !== filterClass) return false;
    return (
      s.status === 'warning1_needed' ||
      s.status === 'warning2_needed' ||
      s.status === 'warning3_needed' ||
      s.status === 'expulsion_needed'
    );
  });

  const headers = [
    'Bil',
    'Nama Murid',
    'No. Matrik',
    'Kelas',
    'Jumlah Hari Ponteng',
    'Status Tindakan Diperlukan',
    'Tindakan Seterusnya',
    'Had Ambang Peringkat (Hari)',
    'Tarikh Surat Amaran Terdahulu',
    'Catatan Sistem',
  ];

  const rows = filtered.map((s, index) => {
    let prevLetterDate = '-';
    let thresholdInfo = '-';
    if (s.breakdown) {
      if (s.status === 'warning1_needed') {
        thresholdInfo = `${s.breakdown.stage1.threshold} hari ponteng`;
      } else if (s.status === 'warning2_needed') {
        thresholdInfo = `${s.breakdown.stage2.threshold} hari selepas Amaran 1`;
        prevLetterDate = s.warning1 ? formatDateDisplay(s.warning1.issueDate) : '-';
      } else if (s.status === 'warning3_needed') {
        thresholdInfo = `${s.breakdown.stage3.threshold} hari selepas Amaran 2`;
        prevLetterDate = s.warning2 ? formatDateDisplay(s.warning2.issueDate) : '-';
      } else if (s.status === 'expulsion_needed') {
        thresholdInfo = `${s.breakdown.expulsion.threshold} hari selepas Amaran 3`;
        prevLetterDate = s.warning3 ? formatDateDisplay(s.warning3.issueDate) : '-';
      }
    }

    return [
      index + 1,
      s.student.name,
      s.student.studentNumber || '-',
      s.student.className,
      s.eligibleAbsences,
      s.statusLabel,
      s.nextActionRequired ? `Keluarkan ${s.nextActionRequired === 'warning1' ? 'Amaran 1' : s.nextActionRequired === 'warning2' ? 'Amaran 2' : 'Amaran 3'}` : 'Gantung / Buang Sekolah',
      thresholdInfo,
      prevLetterDate,
      'Sedia untuk jana surat di idMe/KPM & rekodkan tarikh dalam sistem',
    ];
  });

  const today = new Date().toISOString().split('T')[0];
  const classSuffix = filterClass && filterClass !== 'ALL' ? `_${filterClass.replace(/\s+/g, '_')}` : '';

  return {
    title: 'Senarai Murid Perlu Tindakan Surat Amaran',
    filename: `eAmaran_Murid_Perlu_Tindakan${classSuffix}_${today}`,
    description: 'Senarai murid yang telah mencukupi had ambang hari ketidakhadiran dan sedia untuk pengeluaran surat amaran.',
    headers,
    rows,
    totalRecords: rows.length,
  };
}

/**
 * 5. Dataset Khusus Seorang Murid (Untuk cetakan profil individu & mesyuarat)
 */
export function buildSingleStudentExportData(
  statusData: StudentWarningStatus,
  studentRecords: AttendanceRecord[]
): ExportTableData {
  const { student, totalAbsences, doctorLetterCount, eligibleAbsences, warning1, warning2, warning3 } =
    statusData;

  const headers = ['Kategori', 'Perkara / Parameter', 'Nilai / Maklumat', 'Catatan Tambahan'];

  const rows: (string | number | undefined | null)[][] = [
    ['MAKLUMAT MURID', 'Nama Penuh', student.name, ''],
    ['MAKLUMAT MURID', 'No. Matrik / KP', student.studentNumber || '-', ''],
    ['MAKLUMAT MURID', 'Kelas', student.className, ''],
    [
      'MAKLUMAT MURID',
      'Status Murid',
      student.status === 'pindah'
        ? 'Pindah Sekolah'
        : student.status === 'dibuang'
        ? 'Dibuang Sekolah'
        : 'Aktif',
      student.deletedReason || '',
    ],
    ['STATISTIK KEHADIRAN', 'Jumlah Hari Tidak Hadir', totalAbsences, 'Semua sebab'],
    ['STATISTIK KEHADIRAN', 'Hari Sijil Sakit / Doktor', doctorLetterCount, 'Dikecualikan daripada kiraan amaran'],
    ['STATISTIK KEHADIRAN', 'Hari Dikira Amaran Ponteng', eligibleAbsences, 'Tertakluk kepada tindakan surat amaran'],
    ['STATUS AMARAN', 'Status Semasa', statusData.statusLabel, ''],
    // Surat Amaran 1
    [
      'SURAT AMARAN 1',
      'Tarikh Surat Dikeluarkan',
      warning1 ? formatDateDisplay(warning1.issueDate) : 'Belum dikeluarkan',
      '',
    ],
    [
      'SURAT AMARAN 1',
      'Tarikh Direkod ke Sistem',
      warning1?.recordedAt ? new Date(warning1.recordedAt).toLocaleString('ms-MY') : '-',
      '',
    ],
    ['SURAT AMARAN 1', 'Direkod Oleh', warning1?.recordedBy || '-', ''],
    ['SURAT AMARAN 1', 'Catatan / Nota Pengguna', warning1?.notes || '(Tiada)', ''],
    // Surat Amaran 2
    [
      'SURAT AMARAN 2',
      'Tarikh Surat Dikeluarkan',
      warning2 ? formatDateDisplay(warning2.issueDate) : 'Belum dikeluarkan',
      '',
    ],
    [
      'SURAT AMARAN 2',
      'Tarikh Direkod ke Sistem',
      warning2?.recordedAt ? new Date(warning2.recordedAt).toLocaleString('ms-MY') : '-',
      '',
    ],
    ['SURAT AMARAN 2', 'Direkod Oleh', warning2?.recordedBy || '-', ''],
    ['SURAT AMARAN 2', 'Catatan / Nota Pengguna', warning2?.notes || '(Tiada)', ''],
    // Surat Amaran 3
    [
      'SURAT AMARAN 3',
      'Tarikh Surat Dikeluarkan',
      warning3 ? formatDateDisplay(warning3.issueDate) : 'Belum dikeluarkan',
      '',
    ],
    [
      'SURAT AMARAN 3',
      'Tarikh Direkod ke Sistem',
      warning3?.recordedAt ? new Date(warning3.recordedAt).toLocaleString('ms-MY') : '-',
      '',
    ],
    ['SURAT AMARAN 3', 'Direkod Oleh', warning3?.recordedBy || '-', ''],
    ['SURAT AMARAN 3', 'Catatan / Nota Pengguna', warning3?.notes || '(Tiada)', ''],
  ];

  // Tambah rekod ketidakhadiran murid ke dalam senarai
  studentRecords.forEach((rec, idx) => {
    rows.push([
      'SEJARAH KETIDAKHADIRAN',
      `Hari #${idx + 1} (${formatDateDisplay(rec.date)})`,
      rec.reason || 'TIADA MAKLUMAN',
      rec.countsTowardsWarning ? 'Dikira Amaran Ponteng' : 'Dikecualikan (Surat Doktor)',
    ]);
  });

  const today = new Date().toISOString().split('T')[0];
  const safeName = student.name.replace(/[^a-zA-Z0-9]/g, '_');

  return {
    title: `Laporan & Rekod Surat Amaran Murid: ${student.name}`,
    filename: `eAmaran_${safeName}_${today}`,
    description: `Profil penuh murid ${student.name} (${student.className}), tarikh & catatan surat amaran 1-3, dan senarai lengkap sejarah ketidakhadiran.`,
    headers,
    rows,
    totalRecords: rows.length,
  };
}
