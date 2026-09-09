import { AttendanceRecord, SchoolClass, Student, User } from '../types';
import { isVerifiedDoctorLetter } from '../utils/doctorLetter';
import { generateFingerprint, parseToIsoDate } from '../utils/dateUtils';
import { STANDARD_SCHOOL_CLASSES } from '../utils/classOrder';

export const INITIAL_CLASSES: SchoolClass[] = STANDARD_SCHOOL_CLASSES.map((name) => {
  const cleanId = 'class_' + name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (name === '3 AA') {
    return {
      id: cleanId,
      className: name,
      teacherId: 'user_cikgu_ahmad',
      teacherName: 'Cikgu Ahmad bin Razali',
      active: true,
    };
  }
  if (name === '1 AF') {
    return {
      id: cleanId,
      className: name,
      teacherId: 'user_cikgu_siti',
      teacherName: 'Cikgu Siti Aminah binti Yusof',
      active: true,
    };
  }
  return {
    id: cleanId,
    className: name,
    active: true,
  };
});

export const INITIAL_USERS: User[] = [
  {
    id: 'user_admin_default',
    name: 'Pentadbir Sistem (Admin)',
    email: 'admin@sekolah.edu.my',
    role: 'admin',
    assignedClasses: [],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_cikgu_ahmad',
    name: 'Cikgu Ahmad bin Razali',
    email: 'guru.3aa@sekolah.edu.my',
    role: 'teacher',
    assignedClasses: ['3 AA', 'class_3aa'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_cikgu_siti',
    name: 'Cikgu Siti Aminah binti Yusof',
    email: 'guru.3bb@sekolah.edu.my',
    role: 'teacher',
    assignedClasses: ['3 BB', 'class_3bb'],
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'student_darshan',
    name: 'DARSHAN KUMAR A/L VISHNU',
    classId: 'class_3aa',
    className: '3 AA',
    studentNumber: 'M26301',
    createdAt: '2026-01-02T08:00:00.000Z',
  },
  {
    id: 'student_hazim',
    name: 'HAZIM AZFAR BIN ZULKIFLI',
    classId: 'class_3aa',
    className: '3 AA',
    studentNumber: 'M26302',
    createdAt: '2026-01-02T08:00:00.000Z',
  },
  {
    id: 'student_aina',
    name: 'NUR AINA SOFEA BINTI KAMAL',
    classId: 'class_3aa',
    className: '3 AA',
    studentNumber: 'M26303',
    createdAt: '2026-01-02T08:00:00.000Z',
  },
  {
    id: 'student_farhan',
    name: 'MUHAMMAD FARHAN BIN ADNAN',
    classId: 'class_3bb',
    className: '3 BB',
    studentNumber: 'M26315',
    createdAt: '2026-01-02T08:00:00.000Z',
  },
];

// 17 rekod ketidakhadiran rasmi Darshan Kumar mengikut spesifikasi arahan
const rawDarshanAbsences = [
  { date: '06/08/2026', reason: 'MENJAGA/MENGURUSKAN AHLI KELUARGA' },
  { date: '27/04/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
  { date: '03/10/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
  { date: '05/07/2026', reason: 'MALAS KE SEKOLAH' },
  { date: '13/03/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
  { date: '26/01/2026', reason: 'MENGIKUT KELUARGA BERCUTI/BERKURSUS' },
  { date: '23/01/2026', reason: 'MENGIKUT KELUARGA BERCUTI/BERKURSUS' },
  { date: '05/08/2026', reason: 'MALAS KE SEKOLAH' },
  { date: '05/11/2026', reason: 'MENGIKUT KELUARGA BERCUTI/BERKURSUS' },
  { date: '26/02/2026', reason: 'MENGIKUT KELUARGA BERCUTI/BERKURSUS' },
  { date: '29/04/2026', reason: 'SURAT CUTI SAKIT HOSPITAL/KLINIK' },
  { date: '28/04/2026', reason: 'SURAT CUTI SAKIT HOSPITAL/KLINIK' },
  { date: '02/04/2026', reason: 'KEMATIAN AHLI KELUARGA TERDEKAT' },
  { date: '06/10/2026', reason: 'MENGIKUT KELUARGA BERCUTI/BERKURSUS' },
  { date: '02/10/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
  { date: '17/04/2026', reason: 'SURAT CUTI SAKIT HOSPITAL/KLINIK' },
  { date: '02/12/2026', reason: 'MENGIKUT KELUARGA BERCUTI/BERKURSUS' },
];

export function generateInitialAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  // Darshan Kumar
  for (const item of rawDarshanAbsences) {
    const isoDate = parseToIsoDate(item.date);
    const isDoc = isVerifiedDoctorLetter(item.reason);
    const id = generateFingerprint('student_darshan', isoDate, item.reason);
    records.push({
      id,
      studentId: 'student_darshan',
      studentName: 'DARSHAN KUMAR A/L VISHNU',
      classId: 'class_3aa',
      className: '3 AA',
      date: isoDate,
      reason: item.reason,
      countsTowardsWarning: !isDoc, // false for doctor letter, true otherwise
      createdAt: '2026-08-01T08:00:00.000Z',
      createdBy: 'system_import',
    });
  }

  // Hazim Azfar (8 rekod, 2 surat doktor, 6 dikira untuk amaran -> status: Pantau)
  const hazimAbsences = [
    { date: '15/01/2026', reason: 'SURAT CUTI SAKIT HOSPITAL/KLINIK' },
    { date: '16/01/2026', reason: 'SURAT CUTI SAKIT HOSPITAL/KLINIK' },
    { date: '10/02/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
    { date: '11/02/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
    { date: '05/03/2026', reason: 'URUSAN KELUARGA' },
    { date: '14/04/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
    { date: '20/05/2026', reason: 'MASALAH PENGANGKUTAN' },
    { date: '12/06/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
  ];

  for (const item of hazimAbsences) {
    const isoDate = parseToIsoDate(item.date);
    const isDoc = isVerifiedDoctorLetter(item.reason);
    const id = generateFingerprint('student_hazim', isoDate, item.reason);
    records.push({
      id,
      studentId: 'student_hazim',
      studentName: 'HAZIM AZFAR BIN ZULKIFLI',
      classId: 'class_3aa',
      className: '3 AA',
      date: isoDate,
      reason: item.reason,
      countsTowardsWarning: !isDoc,
      createdAt: '2026-08-01T08:00:00.000Z',
      createdBy: 'system_import',
    });
  }

  // Nur Aina (3 rekod normal)
  const ainaAbsences = [
    { date: '02/02/2026', reason: 'DEMAM' }, // note: bukan surat doktor!
    { date: '03/02/2026', reason: 'MAKLUMAN IBU BAPA PENJAGA' },
    { date: '18/03/2026', reason: 'MENZIARAHI NENEK SAKIT' },
  ];

  for (const item of ainaAbsences) {
    const isoDate = parseToIsoDate(item.date);
    const isDoc = isVerifiedDoctorLetter(item.reason);
    const id = generateFingerprint('student_aina', isoDate, item.reason);
    records.push({
      id,
      studentId: 'student_aina',
      studentName: 'NUR AINA SOFEA BINTI KAMAL',
      classId: 'class_3aa',
      className: '3 AA',
      date: isoDate,
      reason: item.reason,
      countsTowardsWarning: !isDoc, // 'DEMAM' counts towards warning because no doctor MC
      createdAt: '2026-08-01T08:00:00.000Z',
      createdBy: 'system_import',
    });
  }

  // Muhammad Farhan (3 BB - 11 rekod dikira -> Amaran 1 diperlukan)
  for (let i = 1; i <= 11; i++) {
    const d = `2026-03-${String(i).padStart(2, '0')}`;
    const id = generateFingerprint('student_farhan', d, 'TANPA SEBAB');
    records.push({
      id,
      studentId: 'student_farhan',
      studentName: 'MUHAMMAD FARHAN BIN ADNAN',
      classId: 'class_3bb',
      className: '3 BB',
      date: d,
      reason: 'TIADA MAKLUMAN',
      countsTowardsWarning: true,
      createdAt: '2026-08-01T08:00:00.000Z',
      createdBy: 'system_import',
    });
  }

  return records;
}
