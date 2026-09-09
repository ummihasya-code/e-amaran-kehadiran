import * as XLSX from 'xlsx';
import { AttendanceRecord, ImportPreviewResult, SchoolClass, Student, WarningLetter } from '../types';
import { extractAllIsoDates, generateFingerprint, parseToIsoDate } from '../utils/dateUtils';
import { isVerifiedDoctorLetter } from '../utils/doctorLetter';
import { sortClassNames } from '../utils/classOrder';
import { findMatchingStudent, normalizeStudentName, normalizeClassName } from '../utils/studentMatcher';
import { dataService } from './dataService';

export interface ParsedExcelRow {
  bil?: string | number;
  kelas: string;
  tarikh?: any;
  nama: string;
  sebab?: string;
  amaran1?: any;
  amaran2?: any;
  amaran3?: any;
  noMurid?: string;
}

export interface CommitImportResult {
  addedCount: number;
  updatedCount: number;
  duplicateCount: number;
  existingCount: number;
  createdClassesCount: number;
  createdStudentsCount: number;
  createdClassNames: string[];
}

export interface DetectedColumnsInfo {
  bilColIndex: number;
  namaColIndex: number;
  kelasColIndex: number;
  tarikhColIndex: number;
  sebabColIndex: number;
  namaHeader?: string;
  kelasHeader?: string;
  tarikhHeader?: string;
  sebabHeader?: string;
  rawHeaders: string[];
  headerRowIdx: number;
}

export interface ParseExcelResult {
  rows: ParsedExcelRow[];
  detectedColumns: DetectedColumnsInfo;
  rawMatrix: any[][];
}

/**
 * Menormalkan sebab ketidakhadiran dari fail import.
 * Menukarkan kod piawai APDM kepada teks deskriptif penuh
 * dan mengekalkan sebarang catatan huraian sebenar daripada fail.
 */
export function normalizeAbsenceReason(rawVal: any): string {
  if (rawVal === undefined || rawVal === null) return 'TIADA MAKLUMAN';
  const str = String(rawVal).trim();
  if (
    !str ||
    str === '-' ||
    str === '--' ||
    str === '.' ||
    str === '0' ||
    str.toUpperCase() === 'NULL' ||
    str.toUpperCase() === 'N/A' ||
    str.toUpperCase() === 'NA'
  ) {
    return 'TIADA MAKLUMAN';
  }

  const upper = str.toUpperCase().replace(/\s+/g, ' ');

  // Kod ringkas lazim APDM / Sekolah Malaysia
  if (upper === 'P' || upper === 'TH' || upper === 'PONTENG' || upper === 'TIADA MAKLUMAN (PONTENG)') {
    return 'PONTENG';
  }
  if (upper === 'S' || upper === 'SAKIT') {
    return 'SAKIT';
  }
  if (upper === 'MC' || upper === 'SURAT DOKTOR' || upper === 'SIJIL SAKIT') {
    return 'SURAT CUTI SAKIT HOSPITAL/KLINIK';
  }
  if (upper === 'B' || upper === 'BERSEBAB') {
    return 'BERSEBAB';
  }
  if (upper === 'TM' || upper === 'TIADA MAKLUMAN' || upper === 'TANPA MAKLUMAN' || upper === 'TIADA ALASAN') {
    return 'TIADA MAKLUMAN';
  }
  if (upper === 'C' || upper === 'CUTI' || upper === 'CUTI PERISTIWA') {
    return 'CUTI';
  }
  if (upper === 'UK' || upper === 'URUSAN KELUARGA' || upper === 'MASALAH KELUARGA') {
    return 'URUSAN KELUARGA';
  }
  if (upper === 'K' || upper === 'KECEMASAN') {
    return 'KECEMASAN';
  }

  return upper;
}

export async function parseExcelOrCsvDetailed(
  fileOrBuffer: File | ArrayBuffer,
  overrideSebabCol?: number
): Promise<ParseExcelResult> {
  const data = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: false,
  });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    return {
      rows: [],
      detectedColumns: {
        bilColIndex: -1,
        namaColIndex: -1,
        kelasColIndex: -1,
        tarikhColIndex: -1,
        sebabColIndex: -1,
        rawHeaders: [],
        headerRowIdx: 0,
      },
      rawMatrix: [],
    };
  }

  // 1. Kenal pasti baris Header (beberapa fail sekolah mempunyai banner tajuk pada baris 1-5)
  const scoreRow = (row: any[]): number => {
    if (!Array.isArray(row)) return 0;
    const filledCells = row.filter((c) => String(c ?? '').trim().length > 0).length;
    if (filledCells < 2) return 0; // Header jadual sebenar mesti mempunyai sekurang-kurangnya 2 lajur

    let score = 0;
    for (const cell of row) {
      const s = String(cell || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!s) continue;
      if (s.includes('nama') || s.includes('student') || s.includes('pelajar') || s.includes('murid')) score += 3;
      if (s.includes('kelas') || s.includes('tingkatan') || s.includes('darjah') || s.includes('class') || s.includes('tahun')) score += 3;
      if (s.includes('tarikh') || s.includes('date') || s.includes('tkh') || s.includes('ponteng') || s.includes('ketidakhadiran') || s.includes('hadir')) score += 4;
      if (s.includes('bil') || s === 'no' || s === 'nombor') score += 1;
      if (
        s.includes('sebab') ||
        s.includes('alasan') ||
        s.includes('catatan') ||
        s.includes('keterangan') ||
        s.includes('kenyataan') ||
        s.includes('justifikasi') ||
        s.includes('status') ||
        s.includes('reason') ||
        s.includes('remark')
      ) score += 3;
      if (s.includes('amaran') || s.includes('warning')) score += 2;
      if (s.includes('nokp') || s.includes('ic') || s.includes('mykid') || s.includes('kadpengenalan')) score += 2;
    }
    return score;
  };

  let headerRowIdx = 0;
  let bestScore = -1;
  const maxScanRows = Math.min(rawMatrix.length, 25);

  for (let r = 0; r < maxScanRows; r++) {
    const score = scoreRow(rawMatrix[r]);
    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = r;
    }
  }

  if (bestScore < 2) {
    headerRowIdx = 0;
  }

  const rawHeaders = (rawMatrix[headerRowIdx] || []).map((c) => String(c || '').trim());
  const dataRows = rawMatrix.slice(headerRowIdx + 1);

  // 2. Padankan lajur berdasarkan nama header secara fleksibel
  const normalizeKey = (k: string) => k.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  let bilCol = -1;
  let namaCol = -1;
  let kelasCol = -1;
  let tarikhCol = -1;
  let sebabCol = -1;
  let sebabPriority = 0; // 4: Sebab/Catatan/Alasan, 3: Keterangan/Kenyataan/Justifikasi/Remark, 2: Status
  let amaran1Col = -1;
  let amaran2Col = -1;
  let amaran3Col = -1;
  let noMuridCol = -1;

  const specificDateAliases = [
    'tarikhtidakhadir',
    'tarikhketidakhadiran',
    'tarikhponteng',
    'tarikhberlaku',
    'tarikhkejadian',
    'tarikhrekod',
    'tarikhbermula',
    'haritarikh',
    'tarikhhari',
    'tkhtidakhadir',
    'ttidakhadir',
    'tarikhabsent',
    'attendancedate',
    'dateofabsence',
    'absencedate',
    'tarikhddmmyyyy',
    'tarikhhbbtttt',
    'tarikhcuti',
  ];

  const generalDateAliases = ['tarikh', 'date', 'tkh'];

  for (let c = 0; c < rawHeaders.length; c++) {
    const rawH = rawHeaders[c];
    const norm = normalizeKey(rawH);
    if (!norm) continue;

    // Bil
    if (['bil', 'no', 'bilangan', 'nombor'].includes(norm) && bilCol === -1) {
      bilCol = c;
    }
    // Nama Murid
    else if (
      ['nama', 'namamurid', 'studentname', 'name', 'namapelajar', 'namapenuh', 'fullname'].includes(norm) ||
      ((norm.includes('nama') || norm.includes('student') || norm.includes('pelajar')) &&
        !norm.includes('kelas') &&
        !norm.includes('guru') &&
        !norm.includes('sekolah'))
    ) {
      if (namaCol === -1) namaCol = c;
    }
    // Kelas
    else if (
      ['kelas', 'class', 'tingkatan', 'darjah', 'namakelas', 'classname', 'tahun'].includes(norm) ||
      norm.includes('kelas') ||
      norm.includes('tingkatan') ||
      norm.includes('darjah')
    ) {
      if (kelasCol === -1) kelasCol = c;
    }
    // Tarikh Tidak Hadir (Spesifik)
    else if (specificDateAliases.includes(norm)) {
      tarikhCol = c;
    }
    // Tarikh Umum
    else if (generalDateAliases.includes(norm) && tarikhCol === -1) {
      tarikhCol = c;
    }
    // Tarikh melalui Substring (kecuali amaran/surat/lahir/daftar)
    else if (
      (norm.includes('tarikh') || norm.includes('date') || norm.includes('tkh')) &&
      !norm.includes('amaran') &&
      !norm.includes('warning') &&
      !norm.includes('surat') &&
      !norm.includes('lahir') &&
      !norm.includes('daftar') &&
      !norm.includes('cetak') &&
      !norm.includes('semak')
    ) {
      if (tarikhCol === -1) tarikhCol = c;
    }
    // Sebab / Catatan Tidak Hadir (Keutamaan 4 - Sangat Tinggi)
    else if (
      norm.includes('sebab') ||
      norm.includes('catatan') ||
      norm.includes('alasan') ||
      ['sebabtidakhadir', 'sebabketidakhadiran', 'sebabbidakhadir', 'sebab', 'catatan', 'catatantidakhadir', 'catatanketidakhadiran', 'catatansebab', 'sebabcatatan', 'alasan', 'alasantidakhadir'].includes(norm)
    ) {
      if (sebabPriority < 4) {
        sebabCol = c;
        sebabPriority = 4;
      }
    }
    // Keterangan / Kenyataan / Justifikasi / Remark (Keutamaan 3)
    else if (
      norm.includes('keterangan') ||
      norm.includes('kenyataan') ||
      norm.includes('justifikasi') ||
      norm.includes('remark') ||
      norm.includes('punca') ||
      norm.includes('perincian') ||
      norm.includes('jenisketidakhadiran') ||
      norm.includes('kodsebab') ||
      ['kategori', 'kategoriketidakhadiran', 'reason', 'reasons', 'nota', 'notes'].includes(norm)
    ) {
      if (sebabPriority < 3) {
        sebabCol = c;
        sebabPriority = 3;
      }
    }
    // Status Kehadiran (Keutamaan 2 - Rendah, jika tiada lajur catatan)
    else if (
      (norm.includes('status') || norm.includes('kehadiran')) &&
      !norm.includes('surat') &&
      !norm.includes('amaran')
    ) {
      if (sebabPriority < 2) {
        sebabCol = c;
        sebabPriority = 2;
      }
    }
    // Surat Amaran 1, 2, 3
    else if (norm.includes('amaran1') || norm.includes('suratamaran1') || norm.includes('warning1')) {
      amaran1Col = c;
    } else if (norm.includes('amaran2') || norm.includes('suratamaran2') || norm.includes('warning2')) {
      amaran2Col = c;
    } else if (norm.includes('amaran3') || norm.includes('suratamaran3') || norm.includes('warning3')) {
      amaran3Col = c;
    }
    // No KP / IC / No Murid
    else if (
      ['nomurid', 'nokp', 'icno', 'kadpengenalan', 'idmurid', 'mykid', 'studentnumber', 'noic', 'nokadpengenalan'].includes(norm) ||
      norm.includes('nokp') ||
      norm.includes('mykid') ||
      norm.includes('kadpengenalan')
    ) {
      if (noMuridCol === -1) noMuridCol = c;
    }
  }

  // Pengguna secara manual memilih lajur Sebab jika diberikan override
  if (overrideSebabCol !== undefined && overrideSebabCol >= 0 && overrideSebabCol < rawHeaders.length) {
    sebabCol = overrideSebabCol;
    sebabPriority = 5;
  }

  // 3. Fallback Tarikh: Imbas sel jika tarikhCol masih belum ditemui
  const numCols = rawHeaders.length || (dataRows[0] ? dataRows[0].length : 0);
  const sampleRows = dataRows.slice(0, 20);

  if (tarikhCol === -1 && dataRows.length > 0) {
    let bestDateCol = -1;
    let maxValidDates = 0;

    for (let c = 0; c < numCols; c++) {
      if (c === namaCol || c === kelasCol || c === sebabCol || c === bilCol) continue;
      let validDateCount = 0;
      for (const row of sampleRows) {
        const val = row[c];
        if (val) {
          const iso = parseToIsoDate(val);
          if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            validDateCount++;
          }
        }
      }
      if (validDateCount > maxValidDates) {
        maxValidDates = validDateCount;
        bestDateCol = c;
      }
    }

    if (maxValidDates >= 2 && bestDateCol !== -1) {
      tarikhCol = bestDateCol;
    }
  }

  // 4. Fallback Sebab / Catatan: Imbas sel secara Heuristik jika sebabCol masih belum ditemui atau hanya sekadar 'Status'
  if ((sebabCol === -1 || sebabPriority <= 2) && dataRows.length > 0 && overrideSebabCol === undefined) {
    const reasonKeywords = [
      'sakit',
      'demam',
      'ponteng',
      'bersebab',
      'doktor',
      'mc',
      'hospital',
      'klinik',
      'rawatan',
      'cuti',
      'kecemasan',
      'kematian',
      'kenduri',
      'kemalangan',
      'keluarga',
      'makluman',
      'banjir',
      'bencana',
      'covid',
      'kuarantin',
      'tiada makluman',
      'tanpa makluman',
      'malas',
      'lewat',
      'urus',
      'ziarah',
    ];
    const reasonCodes = ['p', 's', 'b', 'c', 'th', 'tm', 'uk', 'mc'];

    let bestReasonCol = -1;
    let maxReasonScore = 0;

    for (let c = 0; c < numCols; c++) {
      if (c === namaCol || c === kelasCol || c === tarikhCol || c === bilCol || c === amaran1Col || c === amaran2Col || c === amaran3Col || c === noMuridCol) {
        continue;
      }

      let matchCount = 0;
      for (const row of sampleRows) {
        const raw = String(row[c] || '').trim().toLowerCase();
        if (!raw) continue;
        const normVal = raw.replace(/[^a-z0-9]/g, '');

        if (reasonKeywords.some((kw) => raw.includes(kw))) {
          matchCount += 2;
        } else if (reasonCodes.includes(normVal)) {
          matchCount += 1;
        }
      }

      if (matchCount > maxReasonScore) {
        maxReasonScore = matchCount;
        bestReasonCol = c;
      }
    }

    if (maxReasonScore >= 2 && bestReasonCol !== -1) {
      sebabCol = bestReasonCol;
    }
  }

  const parsed: ParsedExcelRow[] = [];

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (!row || !Array.isArray(row)) continue;

    const bil = bilCol !== -1 ? row[bilCol] : r + 1;
    const nama = namaCol !== -1 ? String(row[namaCol] || '').trim().toUpperCase() : '';
    const kelas = kelasCol !== -1 ? String(row[kelasCol] || '').trim() : '';

    let tarikhVal: any = tarikhCol !== -1 ? row[tarikhCol] : '';
    if ((tarikhVal === '' || tarikhVal === undefined) && tarikhCol !== -1) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIdx + 1 + r, c: tarikhCol });
      const cell = worksheet[cellAddress];
      if (cell) {
        tarikhVal = cell.w || cell.v || '';
      }
    }

    let rawSebabVal: any = sebabCol !== -1 ? row[sebabCol] : '';
    if ((rawSebabVal === '' || rawSebabVal === undefined || rawSebabVal === null) && sebabCol !== -1) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIdx + 1 + r, c: sebabCol });
      const cell = worksheet[cellAddress];
      if (cell) {
        rawSebabVal = cell.w || cell.v || '';
      }
    }

    const sebab = normalizeAbsenceReason(rawSebabVal);
    const amaran1 = amaran1Col !== -1 ? row[amaran1Col] : undefined;
    const amaran2 = amaran2Col !== -1 ? row[amaran2Col] : undefined;
    const amaran3 = amaran3Col !== -1 ? row[amaran3Col] : undefined;
    const noMurid = noMuridCol !== -1 ? String(row[noMuridCol] || '').trim() : undefined;

    // Abaikan baris kosong
    if (!nama && !kelas && !tarikhVal) continue;

    parsed.push({
      bil,
      kelas,
      tarikh: tarikhVal !== undefined && tarikhVal !== null && tarikhVal !== '' ? tarikhVal : undefined,
      nama,
      sebab,
      amaran1: amaran1 || undefined,
      amaran2: amaran2 || undefined,
      amaran3: amaran3 || undefined,
      noMurid: noMurid || undefined,
    });
  }

  const detectedColumns: DetectedColumnsInfo = {
    bilColIndex: bilCol,
    namaColIndex: namaCol,
    kelasColIndex: kelasCol,
    tarikhColIndex: tarikhCol,
    sebabColIndex: sebabCol,
    namaHeader: namaCol !== -1 ? rawHeaders[namaCol] : undefined,
    kelasHeader: kelasCol !== -1 ? rawHeaders[kelasCol] : undefined,
    tarikhHeader: tarikhCol !== -1 ? rawHeaders[tarikhCol] : undefined,
    sebabHeader: sebabCol !== -1 ? rawHeaders[sebabCol] : undefined,
    rawHeaders,
    headerRowIdx,
  };

  return {
    rows: parsed,
    detectedColumns,
    rawMatrix,
  };
}

export async function parseExcelOrCsvFile(
  file: File,
  overrideSebabCol?: number
): Promise<ParsedExcelRow[]> {
  const result = await parseExcelOrCsvDetailed(file, overrideSebabCol);
  return result.rows;
}

/**
 * Memproses teks kehadiran yang disalin terus (copy & paste) dari idMe / jadual web / hamparan.
 * Menyokong format lazim idMe:
 * Format 4 kolum: Bil | Tarikh | Nama Murid | Sebab
 * Format 5 kolum: Bil | Tarikh | Nama Murid | Kelas | Sebab
 * Format 3 kolum: Tarikh | Nama Murid | Sebab
 * Menyokong pemisah tab, pipe, titik bertindih, atau 2+ ruang kosong,
 * sama ada dengan baris tajuk (header) atau tanpa baris tajuk.
 */
export function parsePastedIdmeText(
  rawText: string,
  defaultClassName?: string
): ParseExcelResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      rows: [],
      detectedColumns: {
        bilColIndex: -1,
        namaColIndex: -1,
        kelasColIndex: -1,
        tarikhColIndex: -1,
        sebabColIndex: -1,
        rawHeaders: [],
        headerRowIdx: 0,
      },
      rawMatrix: [],
    };
  }

  // Pisahkan baris kepada sel (matriks)
  const rawMatrix: string[][] = lines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim());
    }
    if (line.includes('|')) {
      return line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }
    if (
      line.includes(';') ||
      (line.includes(',') && !line.toUpperCase().includes('BIN') && !line.toUpperCase().includes('BINTI'))
    ) {
      return line.split(/[;,]/).map((c) => c.trim());
    }
    return line.split(/\s{2,}|\t/).map((c) => c.trim()).filter(Boolean);
  });

  // Semak jika baris pertama adalah baris tajuk (header)
  const firstRow = rawMatrix[0];
  const isHeaderWord = (s: string) => {
    const l = s.toLowerCase();
    return (
      l.includes('tarikh') ||
      l.includes('date') ||
      l.includes('tkh') ||
      l.includes('nama') ||
      l.includes('murid') ||
      l.includes('student') ||
      l.includes('pelajar') ||
      l.includes('sebab') ||
      l.includes('alasan') ||
      l.includes('catatan') ||
      l.includes('kelas') ||
      l.includes('keterangan') ||
      l === 'bil' ||
      l === 'bil.' ||
      l === 'no' ||
      l === 'no.'
    );
  };

  const headerMatches = firstRow.filter(isHeaderWord).length;
  const hasHeaderRow = headerMatches >= 2;
  const headerRowIdx = hasHeaderRow ? 0 : -1;
  const dataRows = hasHeaderRow ? rawMatrix.slice(1) : rawMatrix;

  const numCols = Math.max(...rawMatrix.map((r) => r.length));
  let bilCol = -1;
  let tarikhCol = -1;
  let kelasCol = -1;
  let namaCol = -1;
  let sebabCol = -1;
  let rawHeaders: string[] = hasHeaderRow ? [...firstRow] : [];

  if (hasHeaderRow) {
    for (let c = 0; c < firstRow.length; c++) {
      const h = firstRow[c].toLowerCase();
      if ((h.includes('bil') || h === 'no' || h === 'no.') && bilCol === -1) {
        bilCol = c;
      } else if ((h.includes('tarikh') || h.includes('date') || h.includes('tkh')) && tarikhCol === -1) {
        tarikhCol = c;
      } else if ((h.includes('nama') || h.includes('murid') || h.includes('pelajar') || h.includes('student')) && namaCol === -1) {
        namaCol = c;
      } else if ((h.includes('kelas') || h.includes('tingkatan') || h.includes('darjah') || h.includes('class')) && kelasCol === -1) {
        kelasCol = c;
      } else if (
        (h.includes('sebab') ||
          h.includes('catatan') ||
          h.includes('alasan') ||
          h.includes('keterangan') ||
          h.includes('status')) &&
        sebabCol === -1
      ) {
        sebabCol = c;
      }
    }
  }

  // Pengesanan pintar berdasarkan corak data jika tiada header atau belum lengkap
  const isDateCell = (s: string) => {
    if (!s) return false;
    const str = s.trim();
    return (
      /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str) ||
      /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(str)
    );
  };

  const isBilCell = (s: string) => {
    if (!s) return false;
    return /^\d{1,4}\.?$/.test(s.trim());
  };

  const isClassCell = (s: string) => {
    if (!s) return false;
    const str = s.trim().toUpperCase();
    return (
      /^([1-6]|TINGKATAN\s*[1-6]|TAHUN\s*[1-6]|PERALIHAN)\s*[\w\-]+$/i.test(str) ||
      ['3 AA', '3 BB', '3 CC', '3 DD', '3 EE', '4 AL-GHAZALI', '5 CEMERLANG'].includes(str)
    );
  };

  const isReasonCell = (s: string) => {
    if (!s) return false;
    const u = s.trim().toUpperCase();
    return (
      u.includes('MASALAH') ||
      u.includes('MAKLUMAN') ||
      u.includes('TEMUJANJI') ||
      u.includes('PONTENG') ||
      u.includes('SAKIT') ||
      u.includes('CUTI') ||
      u.includes('HOSPITAL') ||
      u.includes('KLINIK') ||
      u.includes('URUSAN') ||
      u.includes('KECEMASAN') ||
      u.includes('TIADA') ||
      u.includes('BERSEBAB') ||
      u.includes('DOKTOR') ||
      u.includes('KELUARGA') ||
      u.includes('PENGANGKUTAN') ||
      u.includes('IBU BAPA')
    );
  };

  for (let c = 0; c < numCols; c++) {
    const colVals = dataRows.map((r) => r[c] || '').filter(Boolean);
    if (colVals.length === 0) continue;

    // Tarikh
    if (tarikhCol === -1) {
      const dateCount = colVals.filter(isDateCell).length;
      if (dateCount / colVals.length >= 0.4) {
        tarikhCol = c;
        continue;
      }
    }

    // Bil
    if (bilCol === -1) {
      const bilCount = colVals.filter(isBilCell).length;
      if (bilCount / colVals.length >= 0.7) {
        bilCol = c;
        continue;
      }
    }

    // Kelas
    if (kelasCol === -1) {
      const classCount = colVals.filter(isClassCell).length;
      if (classCount / colVals.length >= 0.5) {
        kelasCol = c;
        continue;
      }
    }
  }

  // Tentukan namaCol dan sebabCol dari lajur yang berbaki
  const remaining: number[] = [];
  for (let c = 0; c < numCols; c++) {
    if (c !== bilCol && c !== tarikhCol && c !== kelasCol) {
      remaining.push(c);
    }
  }

  if (namaCol === -1 || sebabCol === -1) {
    if (remaining.length >= 2) {
      const r0Reasons = dataRows.map((r) => r[remaining[0]] || '').filter(isReasonCell).length;
      const r1Reasons = dataRows.map((r) => r[remaining[1]] || '').filter(isReasonCell).length;
      if (r1Reasons > r0Reasons) {
        if (namaCol === -1) namaCol = remaining[0];
        if (sebabCol === -1) sebabCol = remaining[1];
      } else if (r0Reasons > r1Reasons) {
        if (sebabCol === -1) sebabCol = remaining[0];
        if (namaCol === -1) namaCol = remaining[1];
      } else {
        // Lazimnya nama murid berada sebelum sebab tidak hadir
        if (namaCol === -1) namaCol = remaining[0];
        if (sebabCol === -1) sebabCol = remaining[1];
      }
    } else if (remaining.length === 1) {
      if (namaCol === -1) namaCol = remaining[0];
    }
  }

  // Tetapkan rawHeaders jika tiada
  if (!hasHeaderRow) {
    rawHeaders = [];
    for (let c = 0; c < numCols; c++) {
      if (c === bilCol) rawHeaders.push('Bil');
      else if (c === tarikhCol) rawHeaders.push('Tarikh');
      else if (c === namaCol) rawHeaders.push('Nama Murid');
      else if (c === kelasCol) rawHeaders.push('Kelas');
      else if (c === sebabCol) rawHeaders.push('Sebab Tidak Hadir');
      else rawHeaders.push(`Kolum ${c + 1}`);
    }
  }

  const rows: ParsedExcelRow[] = [];
  for (const r of dataRows) {
    const rawNama = namaCol !== -1 ? r[namaCol] || '' : '';
    const rawTarikh = tarikhCol !== -1 ? r[tarikhCol] || '' : '';
    const rawSebab = sebabCol !== -1 ? r[sebabCol] || '' : '';
    const rawKelas = kelasCol !== -1 ? r[kelasCol] || '' : defaultClassName || '';
    const rawBil = bilCol !== -1 ? r[bilCol] : undefined;

    if (!rawNama && !rawTarikh) continue;

    rows.push({
      bil: rawBil,
      nama: rawNama.trim(),
      tarikh: rawTarikh.trim(),
      sebab: normalizeAbsenceReason(rawSebab),
      kelas: rawKelas.trim(),
    });
  }

  return {
    rows,
    detectedColumns: {
      bilColIndex: bilCol,
      namaColIndex: namaCol,
      kelasColIndex: kelasCol,
      tarikhColIndex: tarikhCol,
      sebabColIndex: sebabCol,
      namaHeader: rawHeaders[namaCol] || 'Nama Murid',
      kelasHeader: kelasCol !== -1 ? rawHeaders[kelasCol] || 'Kelas' : 'Kelas',
      tarikhHeader: rawHeaders[tarikhCol] || 'Tarikh',
      sebabHeader: rawHeaders[sebabCol] || 'Sebab Tidak Hadir',
      rawHeaders,
      headerRowIdx: headerRowIdx >= 0 ? headerRowIdx : 0,
    },
    rawMatrix,
  };
}

/**
 * Menjana Preview Import dan memeriksa duplicate serta mengira statistik.
 * Mengenal pasti kelas-kelas baharu yang perlu ditambah secara auto mengikut murid.
 */
export async function generateImportPreview(
  parsedRows: ParsedExcelRow[],
  detectedColumnsInfo?: DetectedColumnsInfo,
  defaultClassName?: string
): Promise<ImportPreviewResult> {
  const existingStudents = await dataService.getStudents();
  const existingClasses = await dataService.getClasses();
  const existingAttendance = await dataService.getAttendance();
  const existingWarnings = await dataService.getWarningLetters();

  // Peta kelas sedia ada: normalizedClassName -> SchoolClass
  const existingClassMap = new Map<string, SchoolClass>();
  for (const c of existingClasses) {
    existingClassMap.set(c.className.trim().toUpperCase(), c);
  }

  // Peta murid sedia ada: normalizedName_normalizedClass -> Student
  const studentMap = new Map<string, Student>();
  for (const s of existingStudents) {
    const key = `${s.name.trim().toUpperCase()}__${s.className.trim().toUpperCase()}`;
    studentMap.set(key, s);
  }

  // Peta attendance sedia ada mengikut studentId & tarikh untuk semak duplicate & kemaskini sebab
  const existingAttendanceByStudentAndDate = new Map<string, AttendanceRecord>();
  const existingAttendanceByNameAndDate = new Map<string, AttendanceRecord>();

  for (const a of existingAttendance) {
    if (!a.isDeleted) {
      existingAttendanceByStudentAndDate.set(`${a.studentId}__${a.date}`, a);
      if (a.studentName) {
        const normN = normalizeStudentName(a.studentName);
        const normC = normalizeClassName(a.className);
        existingAttendanceByNameAndDate.set(`${normN}__${normC}__${a.date}`, a);
        existingAttendanceByNameAndDate.set(`${normN}__${a.date}`, a);
      }
    }
  }

  // Peta surat amaran sedia ada: studentId_warningType -> WarningLetter
  const warningMap = new Map<string, WarningLetter>();
  for (const w of existingWarnings) {
    warningMap.set(w.id, w);
  }

  const result: ImportPreviewResult = {
    totalRowsInFile: parsedRows.length,
    newRecordsCount: 0,
    updatedRecordsCount: 0,
    existingRecordsCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
    newStudentsCount: 0,
    newClassesCount: 0,
    newClassNames: [],
    detectedColumns: detectedColumnsInfo
      ? {
          nama: detectedColumnsInfo.namaHeader,
          kelas: detectedColumnsInfo.kelasHeader,
          tarikh: detectedColumnsInfo.tarikhHeader,
          sebab: detectedColumnsInfo.sebabHeader,
          rawHeaders: detectedColumnsInfo.rawHeaders,
          sebabColIndex: detectedColumnsInfo.sebabColIndex,
        }
      : undefined,
    detectedStudents: [],
    parsedRecords: [],
    errors: [],
  };

  // Jejak kelas baharu yang dikesan dalam fail
  const newClassesDetected = new Map<string, string>(); // upperKey -> cleanName
  // Jejak murid baru yang belum ada dalam database
  const seenStudentsInFile = new Set<string>();
  // Jejak rekod dalam batch ini untuk semak duplicate intra-file
  const seenInCurrentFile = new Set<string>();

  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const rowNum = i + 1;

    // Jika kelas tidak dinyatakan dalam baris fail / teks, semak jika murid telah wujud dalam pangkalan data
    // atau gunakan kelas sasaran / lalai
    if (!row.kelas && row.nama) {
      const matched = findMatchingStudent(existingStudents, row.nama, '');
      if (matched && matched.className) {
        row.kelas = matched.className;
      } else if (defaultClassName) {
        row.kelas = defaultClassName;
      } else if (existingClasses.length > 0) {
        row.kelas = existingClasses[0].className;
      }
    }

    // Nama dan Kelas adalah wajib untuk mendaftar murid & kelas
    if (!row.nama || !row.kelas) {
      result.invalidCount++;
      result.errors.push(`Baris ${rowNum}: Maklumat tidak lengkap (Nama Murid atau Kelas tiada).`);
      continue;
    }

    // Perlindungan: Murid yang telah dipadam / dibuang / pindah sekolah TIDAK DIREKODKAN LAGI
    if (dataService.isStudentRemoved(row.nama, row.noMurid)) {
      continue;
    }

    const cleanClassName = row.kelas.trim().replace(/\s+/g, ' ');
    const classKey = cleanClassName.toUpperCase();

    // Semak sama ada kelas ini baharu (belum wujud dalam database)
    if (!existingClassMap.has(classKey) && !newClassesDetected.has(classKey)) {
      newClassesDetected.set(classKey, cleanClassName);
    }

    // Semak atau sediakan murid dengan pencarian pintar
    const matchedStudent = findMatchingStudent(existingStudents, row.nama, cleanClassName, row.noMurid);
    const studentKey = `${row.nama.trim().toUpperCase()}__${classKey}`;
    const isNewStudent = !matchedStudent && !seenStudentsInFile.has(studentKey);

    if (isNewStudent) {
      seenStudentsInFile.add(studentKey);
      result.newStudentsCount++;
    }

    const existingOrComputedClassId =
      matchedStudent?.classId ||
      existingClassMap.get(classKey)?.id ||
      `class_${cleanClassName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const studentId =
      matchedStudent?.id ||
      `student_${row.nama.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${existingOrComputedClassId}`;

    const resolvedStudentName = matchedStudent?.name || row.nama;
    const resolvedClassName = matchedStudent?.className || cleanClassName;

    result.detectedStudents.push({
      name: resolvedStudentName,
      className: resolvedClassName,
      studentNumber: matchedStudent?.studentNumber || row.noMurid,
      isNew: isNewStudent,
    });

    // Jika baris ini mengandungi tarikh kehadiran, proses rekod kehadiran
    if (row.tarikh !== undefined && row.tarikh !== null && String(row.tarikh).trim() !== '') {
      const dates = extractAllIsoDates(row.tarikh);
      if (dates.length === 0) {
        result.invalidCount++;
        result.errors.push(`Baris ${rowNum} (${row.nama}): Format tarikh '${row.tarikh}' tidak dapat dibaca dengan tepat.`);
        continue;
      }

      for (const isoDate of dates) {
        const isDoc = isVerifiedDoctorLetter(row.sebab || '');
        const fingerprint = generateFingerprint(studentId, isoDate, row.sebab || 'TIADA MAKLUMAN');

        const record: AttendanceRecord = {
          id: fingerprint,
          studentId,
          studentName: resolvedStudentName,
          classId: existingOrComputedClassId,
          className: resolvedClassName,
          date: isoDate,
          reason: row.sebab || 'TIADA MAKLUMAN',
          countsTowardsWarning: !isDoc,
          createdAt: new Date().toISOString(),
          createdBy: 'excel_import',
        };

        // Semak duplicate intra-file
        const fileKey = `${studentId}__${isoDate}`;
        if (seenInCurrentFile.has(fileKey)) {
          result.duplicateCount++;
          result.parsedRecords.push({
            record,
            isDuplicate: true,
            isExisting: false,
          });
          continue;
        }
        seenInCurrentFile.add(fileKey);

        // Semak sama ada sudah wujud rekod kehadiran bagi murid & tarikh ini
        const nameDateKey = `${normalizeStudentName(resolvedStudentName)}__${normalizeClassName(resolvedClassName)}__${isoDate}`;
        const nameOnlyDateKey = `${normalizeStudentName(resolvedStudentName)}__${isoDate}`;
        const existingRec =
          existingAttendanceByStudentAndDate.get(fileKey) ||
          existingAttendanceByNameAndDate.get(nameDateKey) ||
          existingAttendanceByNameAndDate.get(nameOnlyDateKey);

        if (existingRec) {
          const currentReason = (existingRec.reason || '').trim().toUpperCase();
          const newReason = (row.sebab || 'TIADA MAKLUMAN').trim().toUpperCase();

          // Jika sebab berbeza (contoh: dari TIADA MAKLUMAN ke DEMAM), segerakkan sebab!
          if (currentReason !== newReason && newReason !== '') {
            result.updatedRecordsCount++;
            result.parsedRecords.push({
              record: {
                ...record,
                id: existingRec.id,
              },
              isDuplicate: false,
              isExisting: false,
              isReasonUpdated: true,
              previousReason: existingRec.reason,
              existingRecordId: existingRec.id,
              warning1Date: row.amaran1 ? parseToIsoDate(row.amaran1) : undefined,
              warning2Date: row.amaran2 ? parseToIsoDate(row.amaran2) : undefined,
              warning3Date: row.amaran3 ? parseToIsoDate(row.amaran3) : undefined,
            });
            continue;
          }

          // Jika sudah wujud dan sebabnya sama persis
          result.existingRecordsCount++;
          result.parsedRecords.push({
            record,
            isDuplicate: false,
            isExisting: true,
          });
          continue;
        }

        // Rekod baharu yang sah
        result.newRecordsCount++;
        result.parsedRecords.push({
          record,
          isDuplicate: false,
          isExisting: false,
          isReasonUpdated: false,
          warning1Date: row.amaran1 ? parseToIsoDate(row.amaran1) : undefined,
          warning2Date: row.amaran2 ? parseToIsoDate(row.amaran2) : undefined,
          warning3Date: row.amaran3 ? parseToIsoDate(row.amaran3) : undefined,
        });
      }
    }
  }

  result.newClassesCount = newClassesDetected.size;
  result.newClassNames = sortClassNames(Array.from(newClassesDetected.values()));

  return result;
}

/**
 * Melaksanakan proses APPEND + MERGE + DEDUPLICATE.
 * Memastikan:
 * 1. Kelas ditambah secara AUTO mengikut nama murid yang diimport.
 * 2. Murid didaftarkan secara AUTO mengikut kelas masing-masing.
 * 3. Rekod kehadiran baharu disimpan tanpa menimpa data lama.
 * 4. Tarikh surat sedia ada TIDAK dioverwrite.
 */
export async function commitImport(
  preview: ImportPreviewResult,
  user?: { id: string; name?: string }
): Promise<CommitImportResult> {
  const existingStudents = await dataService.getStudents();
  const existingClasses = await dataService.getClasses();
  const existingWarnings = await dataService.getWarningLetters();

  // 1. Kumpul peta kelas sedia ada
  const classMap = new Map<string, SchoolClass>();
  for (const c of existingClasses) {
    classMap.set(c.className.trim().toUpperCase(), c);
  }

  // 2. Kumpul peta murid sedia ada
  const studentMap = new Map<string, Student>();
  for (const s of existingStudents) {
    const key = `${s.name.trim().toUpperCase()}__${s.className.trim().toUpperCase()}`;
    studentMap.set(key, s);
  }

  // 3. Amaran sedia ada
  const warningMap = new Map<string, WarningLetter>();
  for (const w of existingWarnings) {
    warningMap.set(w.id, w);
  }

  let createdClassesCount = 0;
  const createdClassNames: string[] = [];
  let createdStudentsCount = 0;
  let addedAttendanceCount = 0;
  let updatedAttendanceCount = 0;

  // =========================================================================
  // LANGKAH A: AUTO-TAMBAH KELAS MENGIKUT NAMA MURID YANG DIIMPORT
  // =========================================================================
  // Kumpul semua kelas daripada murid yang diimport
  const allClassesFromImport = new Set<string>();
  for (const std of preview.detectedStudents) {
    if (std.className) {
      allClassesFromImport.add(std.className.trim().replace(/\s+/g, ' '));
    }
  }
  for (const item of preview.parsedRecords) {
    if (item.record.className) {
      allClassesFromImport.add(item.record.className.trim().replace(/\s+/g, ' '));
    }
  }

  for (const clsName of allClassesFromImport) {
    const classKey = clsName.trim().toUpperCase();
    let cls = classMap.get(classKey);

    if (!cls) {
      const classId = `class_${clsName.toLowerCase().replace(/[^a-z0-9]/g, '') || String(Date.now())}`;
      cls = {
        id: classId,
        className: clsName,
        active: true,
      };
      await dataService.saveClass(cls, user);
      classMap.set(classKey, cls);
      createdClassesCount++;
      createdClassNames.push(clsName);
    }
  }

  // =========================================================================
  // LANGKAH B: AUTO-DAFTAR / KEMASKINI MURID KE DALAM KELAS
  // =========================================================================
  for (const std of preview.detectedStudents) {
    // Jangan proses atau daftar semula murid yang telah dipadam / dibuang / pindah sekolah!
    if (dataService.isStudentRemoved(std.name, std.studentNumber)) {
      continue;
    }

    const classKey = std.className.trim().toUpperCase();
    const cls = classMap.get(classKey);
    const matched = findMatchingStudent(existingStudents, std.name, std.className, std.studentNumber);

    if (!matched) {
      const studentKey = `${std.name.trim().toUpperCase()}__${classKey}`;
      let student = studentMap.get(studentKey);

      if (!student) {
        const studentId = `student_${std.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${cls ? cls.id : ''}`;
        student = {
          id: studentId,
          name: std.name.trim().toUpperCase(),
          classId: cls ? cls.id : `class_${std.className.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          className: cls ? cls.className : std.className,
          studentNumber: std.studentNumber,
          createdAt: new Date().toISOString(),
        };
        await dataService.saveStudent(student, user);
        studentMap.set(studentKey, student);
        existingStudents.push(student);
        createdStudentsCount++;
      }
    }
  }

  // =========================================================================
  // LANGKAH C: TAMBAH & SEGERAK REKOD KEHADIRAN (JIKA ADA)
  // =========================================================================
  for (const item of preview.parsedRecords) {
    if (item.isDuplicate) continue;

    const { record, warning1Date, warning2Date, warning3Date, isReasonUpdated, existingRecordId } = item;

    // Pastikan murid yang telah dipadam/dibuang/pindah tidak direkodkan kehadirannya lagi
    if (dataService.isStudentRemoved(record.studentName, undefined, record.studentId)) {
      continue;
    }

    // Pastikan classId dan studentId selaras dengan database melalui pencarian pintar
    const matched = findMatchingStudent(existingStudents, record.studentName || '', record.className);
    if (matched) {
      record.studentId = matched.id;
      record.studentName = matched.name;
      record.classId = matched.classId;
      record.className = matched.className;
    } else {
      const classKey = record.className.trim().toUpperCase();
      const cls = classMap.get(classKey);
      if (cls) {
        record.classId = cls.id;
        record.className = cls.className;
      }
    }

    if (isReasonUpdated && existingRecordId) {
      // Segerak sebab ke rekod sedia ada
      await dataService.updateAttendanceRecord(
        existingRecordId,
        {
          reason: record.reason,
          countsTowardsWarning: record.countsTowardsWarning,
          className: record.className,
          studentName: record.studentName,
          classId: record.classId,
          date: record.date,
        },
        user
      );
      updatedAttendanceCount++;
    } else {
      const res = await dataService.syncOrAddAttendanceRecord(record, user);
      if (res.updated) {
        updatedAttendanceCount++;
      } else if (res.success && !res.duplicate) {
        addedAttendanceCount++;
      }
    }

    // Perlindungan Tarikh Surat Amaran (JANGAN OVERWRITE DATA LAMA)
    if (warning1Date) {
      const wId = `${record.studentId}_warning1`;
      if (!warningMap.has(wId)) {
        await dataService.saveWarningLetter(
          record.studentId,
          'warning1',
          warning1Date,
          'Diimport daripada fail kehadiran',
          user
        );
      }
    }
    if (warning2Date) {
      const wId = `${record.studentId}_warning2`;
      if (!warningMap.has(wId)) {
        await dataService.saveWarningLetter(
          record.studentId,
          'warning2',
          warning2Date,
          'Diimport daripada fail kehadiran',
          user
        );
      }
    }
    if (warning3Date) {
      const wId = `${record.studentId}_warning3`;
      if (!warningMap.has(wId)) {
        await dataService.saveWarningLetter(
          record.studentId,
          'warning3',
          warning3Date,
          'Diimport daripada fail kehadiran',
          user
        );
      }
    }
  }

  // Catat jejak audit import keseluruhan
  const sortedCreatedClassNames = sortClassNames(createdClassNames);

  await dataService.addAuditLog(
    'Import Data Excel/CSV (Auto-Tambah Kelas & Murid & Segerak Sebab)',
    'attendance',
    'batch_import',
    {
      totalRows: preview.totalRowsInFile,
      newClassesAutoCreated: createdClassesCount,
      createdClassNames: sortedCreatedClassNames,
      newStudentsCreated: createdStudentsCount,
      newAttendanceRecordsAdded: addedAttendanceCount,
      attendanceReasonsUpdated: updatedAttendanceCount,
      existingAttendanceKept: preview.existingRecordsCount,
      duplicatesIgnored: preview.duplicateCount,
    },
    user
  );

  return {
    addedCount: addedAttendanceCount,
    updatedCount: updatedAttendanceCount,
    duplicateCount: preview.duplicateCount,
    existingCount: preview.existingRecordsCount,
    createdClassesCount,
    createdStudentsCount,
    createdClassNames: sortedCreatedClassNames,
  };
}
