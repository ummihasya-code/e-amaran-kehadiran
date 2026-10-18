import {
  AttendanceRecord,
  AttendanceSettings,
  StageBreakdown,
  Student,
  StudentWarningStatus,
  WarningLetter,
  WarningType,
} from '../types';
import { normalizeStudentName, normalizeClassName } from '../utils/studentMatcher';

export const DEFAULT_SETTINGS: AttendanceSettings = {
  id: 'rules',
  // Ponteng Berkala (Tidak Berturut-turut - Konsep Anchor Date mengikut SPI Bil. 7/2003)
  warning1Threshold: 10,
  warning2Threshold: 10, // 10 hari selepas Surat Amaran 1
  warning3Threshold: 20, // 20 hari selepas Surat Amaran 2
  expulsionThreshold: 20, // 20 hari selepas Surat Amaran 3

  // Ponteng Berterusan (Berturut-turut - Konsep Anchor Date mengikut SPI Bil. 7/2003)
  consecutiveW1: 3, // 3 hari berturut-turut
  consecutiveW2: 7, // 7 hari selepas Surat Amaran 1
  consecutiveW3: 7, // 7 hari selepas Surat Amaran 2
  consecutiveExpulsion: 14, // 14 hari selepas Surat Amaran 3

  calculationMethod: 'cumulative',
  unit: 'Hari',
  period: 'Tahunan (Anchor Date)',
  isActive: true,
  notes:
    'Berdasarkan Surat Pekeliling Ikhtisas KPM Bil. 7/2003 dengan pengiraan Anchor Date (Tarikh Surat Terdahulu).',
  referenceSource: 'Surat Pekeliling Ikhtisas KPM Bil. 7/2003 & Panduan Pengurusan Disiplin Murid',
  showAuditTrailMenu: false, // Disembunyikan daripada menu navigasi utama secara lalai
  updatedAt: new Date().toISOString(),
  updatedBy: 'Pentadbir Sistem',
};

/**
 * Semak sama ada tarikh rekod kehadiran berlaku SELEPAS tarikh anchor (attendance.date > anchorDate).
 * Format tarikh: YYYY-MM-DD
 */
export function isDateAfter(recordDate?: string, anchorDate?: string | null): boolean {
  if (!recordDate || !anchorDate) return false;
  const r = recordDate.trim().split('T')[0];
  const a = anchorDate.trim().split('T')[0];
  return r > a;
}

/**
 * Mengira bilangan hari ketidakhadiran berturut-turut (consecutive school days).
 * Mengambil kira jurang hujung minggu (Jumaat ke Isnin = hari persekolahan berturut-turut).
 */
export function countConsecutiveDays(records: AttendanceRecord[]): number {
  if (!records || records.length === 0) return 0;

  // Pastikan rekod diisih secara kronologi menaik
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  let maxStreak = 0;
  let currentStreak = 0;
  let prevTime: number | null = null;
  let prevDayOfWeek: number | null = null;

  for (const rec of sorted) {
    const parts = rec.date.split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0])) continue;
    const currDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const currTime = currDate.getTime();
    const currDayOfWeek = currDate.getDay();

    if (prevTime === null) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24));
      // Hujung minggu: Jumaat (5) ke Isnin (1) jurang <= 3 hari
      const isWeekendGap = diffDays <= 3 && prevDayOfWeek === 5 && currDayOfWeek === 1;

      if (diffDays === 1 || isWeekendGap) {
        currentStreak += 1;
      } else if (diffDays === 0) {
        // Tarikh pendua, jangan tambah atau reset
      } else {
        currentStreak = 1;
      }
    }

    prevTime = currTime;
    prevDayOfWeek = currDayOfWeek;
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
  }

  return maxStreak;
}

/**
 * Mengira status amaran bagi setiap murid berdasarkan logik ANCHOR DATE:
 * 1. Amaran 1: Kiraan dari awal tahun.
 * 2. Amaran 2: HANYA mengira rekod selepas tarikh Surat Amaran 1 (date > warning1.issueDate).
 * 3. Amaran 3: HANYA mengira rekod selepas tarikh Surat Amaran 2 (date > warning2.issueDate).
 * 4. Buang Sekolah: HANYA mengira rekod selepas tarikh Surat Amaran 3 (date > warning3.issueDate) - Alert sahaja.
 * 5. Surat doktor (countsTowardsWarning === false) TIDAK dikira sama sekali.
 * 6. Jika tarikh surat terdahulu belum direkodkan, status peringkat seterusnya adalah menunggu (0 hari).
 */
export function calculateStudentWarningStatus(
  student: Student,
  attendanceRecords: AttendanceRecord[],
  warningLetters: WarningLetter[],
  settings: AttendanceSettings = DEFAULT_SETTINGS
): StudentWarningStatus {
  const normName = normalizeStudentName(student.name);
  const normClass = normalizeClassName(student.className);

  // Padanan rekod milik murid ini yang tidak dipadam
  const matchedRecords = attendanceRecords.filter((r) => {
    if (r.isDeleted) return false;
    if (r.studentId === student.id) return true;
    if (normName && r.studentName && normalizeStudentName(r.studentName) === normName) {
      if (!normClass || !r.className || normalizeClassName(r.className) === normClass) {
        return true;
      }
    }
    return false;
  });

  // Nyah-duplikasi mengikut tarikh (utamakan rekod dengan sebab berbanding 'TIADA MAKLUMAN')
  const dateMap = new Map<string, AttendanceRecord>();
  for (const r of matchedRecords) {
    const existing = dateMap.get(r.date);
    if (!existing) {
      dateMap.set(r.date, r);
    } else {
      const existingIsTiada = (existing.reason || '').trim().toUpperCase() === 'TIADA MAKLUMAN';
      const rIsTiada = (r.reason || '').trim().toUpperCase() === 'TIADA MAKLUMAN';
      if (existingIsTiada && !rIsTiada) {
        dateMap.set(r.date, r);
      }
    }
  }

  const studentRecords = Array.from(dateMap.values());
  const totalAbsences = studentRecords.length;

  // Doktor letter: countsTowardsWarning === false (TIDAK DIKIRA DALAM SEBARANG AMARAN)
  const doctorLetterCount = studentRecords.filter((r) => !r.countsTowardsWarning).length;

  // Rekod yang sah dikira (countsTowardsWarning === true), diisih kronologi
  const sortedEligible = studentRecords
    .filter((r) => r.countsTowardsWarning)
    .sort((a, b) => a.date.localeCompare(b.date));

  const eligibleAbsences = sortedEligible.length;

  // Cari surat amaran sedia ada murid ini
  const warning1 = warningLetters.find(
    (w) => w.studentId === student.id && w.warningType === 'warning1'
  );
  const warning2 = warningLetters.find(
    (w) => w.studentId === student.id && w.warningType === 'warning2'
  );
  const warning3 = warningLetters.find(
    (w) => w.studentId === student.id && w.warningType === 'warning3'
  );

  // Tarikh anchor sah (hanya sah jika guru kelas telah memasukkan tarikh secara manual)
  const hasWarning1Issued = Boolean(warning1 && warning1.issueDate && warning1.issueDate.trim() !== '');
  const hasWarning2Issued = Boolean(warning2 && warning2.issueDate && warning2.issueDate.trim() !== '');
  const hasWarning3Issued = Boolean(warning3 && warning3.issueDate && warning3.issueDate.trim() !== '');

  const isConsecutive = settings.calculationMethod === 'consecutive';

  // Ambang Had (Thresholds)
  const t1 = isConsecutive ? (settings.consecutiveW1 ?? 3) : (settings.warning1Threshold ?? 10);
  const t2 = isConsecutive ? (settings.consecutiveW2 ?? 7) : (settings.warning2Threshold ?? 10);
  const t3 = isConsecutive ? (settings.consecutiveW3 ?? 7) : (settings.warning3Threshold ?? 20);
  const tExp = isConsecutive
    ? (settings.consecutiveExpulsion ?? 14)
    : (settings.expulsionThreshold ?? 20);

  // ==========================================
  // PERINGKAT 1: AMARAN 1 (Dari Awal Tahun)
  // ==========================================
  const stage1Records = sortedEligible;
  const stage1Count = isConsecutive
    ? countConsecutiveDays(stage1Records)
    : stage1Records.length;
  const stage1ThresholdReached = stage1Count >= t1;

  const stage1Breakdown: StageBreakdown = {
    stage: 'warning1',
    stageName: 'Surat Amaran 1',
    anchorDate: null,
    anchorName: 'Awal Sesi Persekolahan',
    count: stage1Count,
    threshold: t1,
    isWaiting: false,
    isCompleted: hasWarning1Issued,
    isThresholdReached: stage1ThresholdReached,
    percentage: Math.min(100, Math.round((stage1Count / t1) * 100)),
    countedDates: stage1Records.map((r) => r.date),
  };

  // ==========================================
  // PERINGKAT 2: AMARAN 2 (Anchor: Tarikh Surat Amaran 1)
  // Rekod sebelum atau pada tarikh Surat Amaran 1 TIDAK DIKIRA
  // ==========================================
  const stage2AnchorDate = hasWarning1Issued ? warning1!.issueDate : null;
  const stage2Waiting = !hasWarning1Issued;
  const stage2Records = hasWarning1Issued
    ? sortedEligible.filter((r) => isDateAfter(r.date, stage2AnchorDate))
    : [];
  const stage2Count = hasWarning1Issued
    ? (isConsecutive ? countConsecutiveDays(stage2Records) : stage2Records.length)
    : 0;
  const stage2ThresholdReached = hasWarning1Issued && stage2Count >= t2;

  const stage2Breakdown: StageBreakdown = {
    stage: 'warning2',
    stageName: 'Surat Amaran 2',
    anchorDate: stage2AnchorDate,
    anchorName: 'Tarikh Surat Amaran 1',
    count: stage2Count,
    threshold: t2,
    isWaiting: stage2Waiting,
    waitingReason: stage2Waiting
      ? 'Menunggu Surat Amaran 1 dikeluarkan dan tarikh direkodkan oleh guru kelas'
      : undefined,
    isCompleted: hasWarning2Issued,
    isThresholdReached: stage2ThresholdReached,
    percentage: hasWarning1Issued ? Math.min(100, Math.round((stage2Count / t2) * 100)) : 0,
    countedDates: stage2Records.map((r) => r.date),
  };

  // ==========================================
  // PERINGKAT 3: AMARAN 3 (Anchor: Tarikh Surat Amaran 2)
  // Rekod sebelum atau pada tarikh Surat Amaran 2 TIDAK DIKIRA
  // ==========================================
  const stage3AnchorDate = hasWarning2Issued ? warning2!.issueDate : null;
  const stage3Waiting = !hasWarning2Issued;
  const stage3Records = hasWarning2Issued
    ? sortedEligible.filter((r) => isDateAfter(r.date, stage3AnchorDate))
    : [];
  const stage3Count = hasWarning2Issued
    ? (isConsecutive ? countConsecutiveDays(stage3Records) : stage3Records.length)
    : 0;
  const stage3ThresholdReached = hasWarning2Issued && stage3Count >= t3;

  const stage3Breakdown: StageBreakdown = {
    stage: 'warning3',
    stageName: 'Surat Amaran 3 (Terakhir)',
    anchorDate: stage3AnchorDate,
    anchorName: 'Tarikh Surat Amaran 2',
    count: stage3Count,
    threshold: t3,
    isWaiting: stage3Waiting,
    waitingReason: stage3Waiting
      ? !hasWarning1Issued
        ? 'Menunggu Surat Amaran 1 & 2 dikeluarkan terlebih dahulu'
        : 'Menunggu Surat Amaran 2 dikeluarkan dan tarikh direkodkan oleh guru kelas'
      : undefined,
    isCompleted: hasWarning3Issued,
    isThresholdReached: stage3ThresholdReached,
    percentage: hasWarning2Issued ? Math.min(100, Math.round((stage3Count / t3) * 100)) : 0,
    countedDates: stage3Records.map((r) => r.date),
  };

  // ==========================================
  // PERINGKAT 4: BUANG SEKOLAH (Anchor: Tarikh Surat Amaran 3)
  // Alert Sahaja - Jangan jana surat secara automatik
  // ==========================================
  const expulsionAnchorDate = hasWarning3Issued ? warning3!.issueDate : null;
  const expulsionWaiting = !hasWarning3Issued;
  const expulsionRecords = hasWarning3Issued
    ? sortedEligible.filter((r) => isDateAfter(r.date, expulsionAnchorDate))
    : [];
  const expulsionCount = hasWarning3Issued
    ? (isConsecutive ? countConsecutiveDays(expulsionRecords) : expulsionRecords.length)
    : 0;
  const expulsionThresholdReached = hasWarning3Issued && expulsionCount >= tExp;

  const expulsionBreakdown: StageBreakdown = {
    stage: 'expulsion',
    stageName: 'Tindakan Buang Sekolah',
    anchorDate: expulsionAnchorDate,
    anchorName: 'Tarikh Surat Amaran 3',
    count: expulsionCount,
    threshold: tExp,
    isWaiting: expulsionWaiting,
    waitingReason: expulsionWaiting
      ? 'Menunggu Surat Amaran 3 dikeluarkan terlebih dahulu'
      : undefined,
    isCompleted: false, // Tidak jana surat automatik
    isThresholdReached: expulsionThresholdReached,
    percentage: hasWarning3Issued ? Math.min(100, Math.round((expulsionCount / tExp) * 100)) : 0,
    countedDates: expulsionRecords.map((r) => r.date),
  };

  // ==========================================
  // PENENTUAN STATUS AKHIR SECARA HIERARKI
  // ==========================================
  let status: StudentWarningStatus['status'] = 'normal';
  let statusLabel = 'Normal';
  let statusColor: StudentWarningStatus['statusColor'] = 'green';
  let nextActionRequired: WarningType | undefined = undefined;

  if (expulsionThresholdReached) {
    status = 'expulsion_needed';
    statusLabel = 'Amaran Tindakan Buang Sekolah';
    statusColor = 'red';
    nextActionRequired = undefined; // Alert sahaja, tiada surat buang sekolah automatik
  } else if (hasWarning3Issued) {
    status = 'warning3_issued';
    statusLabel = 'Amaran 3 Telah Direkodkan';
    statusColor = 'green';
  } else if (hasWarning2Issued && stage3ThresholdReached) {
    status = 'warning3_needed';
    statusLabel = 'Amaran 3 Diperlukan';
    statusColor = 'red';
    nextActionRequired = 'warning3';
  } else if (hasWarning2Issued) {
    status = 'warning2_issued';
    statusLabel = 'Amaran 2 Telah Direkodkan';
    statusColor = 'green';
  } else if (hasWarning1Issued && stage2ThresholdReached) {
    status = 'warning2_needed';
    statusLabel = 'Amaran 2 Diperlukan';
    statusColor = 'red';
    nextActionRequired = 'warning2';
  } else if (hasWarning1Issued) {
    status = 'warning1_issued';
    statusLabel = 'Amaran 1 Telah Direkodkan';
    statusColor = 'green';
  } else if (stage1ThresholdReached) {
    status = 'warning1_needed';
    statusLabel = 'Amaran 1 Diperlukan';
    statusColor = 'red';
    nextActionRequired = 'warning1';
  } else if (stage1Count >= Math.floor(t1 * 0.6)) {
    status = 'monitor';
    statusLabel = 'Dalam Pemantauan';
    statusColor = 'yellow';
  } else {
    status = 'normal';
    statusLabel = 'Normal';
    statusColor = 'green';
  }

  return {
    student,
    totalAbsences,
    doctorLetterCount,
    eligibleAbsences,
    warning1,
    warning2,
    warning3,
    status,
    statusLabel,
    statusColor,
    nextActionRequired,
    breakdown: {
      stage1: stage1Breakdown,
      stage2: stage2Breakdown,
      stage3: stage3Breakdown,
      expulsion: expulsionBreakdown,
      activeRuleType: settings.calculationMethod,
      consecutiveStreak: countConsecutiveDays(sortedEligible),
    },
  };
}

/**
 * Mengira status amaran bagi senarai murid.
 */
export function calculateStudentStatuses(
  students: Student[],
  attendanceRecords: AttendanceRecord[],
  warningLetters: WarningLetter[],
  settings: AttendanceSettings = DEFAULT_SETTINGS
): StudentWarningStatus[] {
  return students.map((student) =>
    calculateStudentWarningStatus(student, attendanceRecords, warningLetters, settings)
  );
}
