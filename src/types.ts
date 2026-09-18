export type UserRole = 'admin' | 'teacher';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedClasses: string[]; // classIds or classNames (e.g. ['3 AA'])
  active: boolean;
  createdAt: string;
  password?: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  studentNumber?: string;
  status?: 'active' | 'pindah' | 'dibuang';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedReason?: string; // 'Pindah Sekolah' | 'Dibuang Sekolah' | 'Padam Rekod'
  createdAt: string;
  updatedAt?: string;
}

export interface ArchivedStudentItem {
  student: Student;
  deletedAt?: string;
  deletedReason?: string;
  source: 'database' | 'audit_log';
}

export interface SchoolClass {
  id: string;
  className: string;
  teacherId?: string;
  teacherName?: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string; // fingerprint studentId_date_reason
  studentId: string;
  studentName?: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  reason: string;
  countsTowardsWarning: boolean; // false for verified MC/Doctor letters, true for regular unexcused
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}

export type WarningType = 'warning1' | 'warning2' | 'warning3';

export interface WarningLetter {
  id: string; // studentId_warningType
  studentId: string;
  warningType: WarningType;
  issueDate: string; // YYYY-MM-DD
  recordedAt: string;
  recordedBy: string;
  updatedAt?: string;
  updatedBy?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AttendanceSettings {
  id: string;
  // Ponteng Berkala (Tidak Berturut-turut - Konsep Anchor Date)
  warning1Threshold: number; // default: 10
  warning2Threshold: number; // default: 10 (selepas Amaran 1)
  warning3Threshold: number; // default: 20 (selepas Amaran 2)
  expulsionThreshold?: number; // default: 20 (selepas Amaran 3)

  // Ponteng Berterusan (Berturut-turut - Konsep Anchor Date)
  consecutiveW1?: number; // default: 3
  consecutiveW2?: number; // default: 7 (selepas Amaran 1)
  consecutiveW3?: number; // default: 7 (selepas Amaran 2)
  consecutiveExpulsion?: number; // default: 14 (selepas Amaran 3)

  calculationMethod: 'cumulative' | 'consecutive';
  unit: string; // e.g. "Hari"
  period: string; // e.g. "Tahunan (Anchor Date)"
  isActive: boolean;
  notes: string;
  referenceSource: string;
  updatedAt: string;
  updatedBy: string;
}

export interface StageBreakdown {
  stage: 'warning1' | 'warning2' | 'warning3' | 'expulsion';
  stageName: string;
  anchorDate: string | null; // e.g. Tarikh Surat Terdahulu
  anchorName: string | null; // e.g. "Surat Amaran 1"
  count: number; // Hari dikira selepas Anchor Date
  threshold: number; // Had ambang hari
  isWaiting: boolean; // Menunggu tarikh surat terdahulu diisi
  waitingReason?: string;
  isCompleted: boolean; // Surat telah dikeluarkan dan tarikh direkodkan
  isThresholdReached: boolean;
  percentage: number; // 0 - 100%
  countedDates: string[]; // Senarai tarikh tidak hadir yang dikira dalam peringkat ini
}

export interface StudentWarningStatus {
  student: Student;
  totalAbsences: number;
  doctorLetterCount: number;
  eligibleAbsences: number; // countsTowardsWarning === true
  warning1?: WarningLetter;
  warning2?: WarningLetter;
  warning3?: WarningLetter;
  status:
    | 'normal'
    | 'monitor'
    | 'warning1_needed'
    | 'warning1_issued'
    | 'warning2_needed'
    | 'warning2_issued'
    | 'warning3_needed'
    | 'warning3_issued'
    | 'expulsion_needed';
  statusLabel: string;
  statusColor: 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  nextActionRequired?: WarningType;

  // Pecahan Pengiraan Anchor Date
  breakdown?: {
    stage1: StageBreakdown;
    stage2: StageBreakdown;
    stage3: StageBreakdown;
    expulsion: StageBreakdown;
    activeRuleType: 'cumulative' | 'consecutive';
    consecutiveStreak: number;
  };
}

export interface ImportRow {
  bil?: number | string;
  kelas: string;
  tarikhTidakHadir: string;
  nama: string;
  sebabTidakHadir: string;
  suratAmaran1?: string;
  suratAmaran2?: string;
  suratAmaran3?: string;
}

export interface ImportPreviewResult {
  totalRowsInFile: number;
  newRecordsCount: number;
  updatedRecordsCount: number;
  existingRecordsCount: number;
  duplicateCount: number;
  invalidCount: number;
  newStudentsCount: number;
  newClassesCount: number;
  newClassNames: string[];
  detectedColumns?: {
    nama?: string;
    kelas?: string;
    tarikh?: string;
    sebab?: string;
    rawHeaders: string[];
    sebabColIndex?: number;
  };
  detectedStudents: {
    name: string;
    className: string;
    studentNumber?: string;
    isNew: boolean;
  }[];
  parsedRecords: {
    record: AttendanceRecord;
    isDuplicate: boolean;
    isExisting: boolean;
    isReasonUpdated?: boolean;
    previousReason?: string;
    existingRecordId?: string;
    warning1Date?: string;
    warning2Date?: string;
    warning3Date?: string;
  }[];
  errors: string[];
}
