/**
 * Utiliti pemadanan murid & kelas secara pintar bagi e-AMARAN KEHADIRAN.
 * Menangani variasi ejaan nama (A/L, AL, BIN, BINTI, tanda baca)
 * dan variasi kelas (3 AA, 3AA, 3-AA, Tingkatan 3 AA).
 */

import { Student } from '../types';

/**
 * Menormalkan nama murid untuk tujuan perbandingan tanpa mengira format tanda baca.
 * Contoh: "DARSHAN KUMAR A/L VISHNU" -> "DARSHANKUMARALVISHNU"
 *         "DARSHAN KUMAR AL VISHNU"  -> "DARSHANKUMARALVISHNU"
 *         "NUR AINA BINTI KAMAL"     -> "NURAINAAMAL" (selaras)
 */
export function normalizeStudentName(name?: string | null): string {
  if (!name) return '';
  let s = String(name).trim().toUpperCase();
  
  // Gantikan singkatan lazim di Malaysia
  s = s.replace(/\bANAK\s+LELAKI\b/g, 'AL');
  s = s.replace(/\bANAK\s+PEREMPUAN\b/g, 'AP');
  s = s.replace(/A\s*\/\s*L/g, 'AL');
  s = s.replace(/A\s*\/\s*P/g, 'AP');
  s = s.replace(/\bBINTI\b/g, 'BT');
  s = s.replace(/\bBTE\b/g, 'BT');
  s = s.replace(/\bBT\.\b/g, 'BT');
  s = s.replace(/\bBIN\b/g, 'B');
  s = s.replace(/\bB\.\b/g, 'B');
  
  // Buang semua aksara bukan alfanumerik
  return s.replace(/[^A-Z0-9]/g, '');
}

/**
 * Menormalkan nama kelas untuk perbandingan.
 * Contoh: "3 AA" -> "3AA", "3-AA" -> "3AA", "TINGKATAN 3 AA" -> "3AA", "TAHUN 3 AA" -> "3AA"
 */
export function normalizeClassName(className?: string | null): string {
  if (!className) return '';
  let c = String(className).trim().toUpperCase();
  c = c.replace(/\bTINGKATAN\b/g, '');
  c = c.replace(/\bTAHUN\b/g, '');
  c = c.replace(/\bDARJAH\b/g, '');
  c = c.replace(/\bKELAS\b/g, '');
  return c.replace(/[^A-Z0-9]/g, '');
}

/**
 * Menemui murid sedia ada dalam senarai berdasarkan pelbagai strategi pemadanan.
 */
export function findMatchingStudent(
  existingStudents: Student[],
  inputName: string,
  inputClassName: string,
  inputStudentNumber?: string
): Student | undefined {
  if (!inputName) return undefined;

  const rawUpperName = inputName.trim().toUpperCase();
  const rawUpperClass = inputClassName.trim().toUpperCase();
  const normName = normalizeStudentName(inputName);
  const normClass = normalizeClassName(inputClassName);
  const normNo = inputStudentNumber ? inputStudentNumber.trim().toUpperCase() : '';

  // 1. Padanan tepat No. Murid / IC jika ada
  if (normNo) {
    const byNo = existingStudents.find(
      (s) => s.studentNumber && s.studentNumber.trim().toUpperCase() === normNo
    );
    if (byNo) return byNo;
  }

  // 2. Padanan tepat Nama & Kelas
  const exact = existingStudents.find(
    (s) => s.name.trim().toUpperCase() === rawUpperName && s.className.trim().toUpperCase() === rawUpperClass
  );
  if (exact) return exact;

  // 3. Padanan nama & kelas dinormalkan
  const byNormBoth = existingStudents.find(
    (s) =>
      normalizeStudentName(s.name) === normName &&
      normalizeClassName(s.className) === normClass
  );
  if (byNormBoth) return byNormBoth;

  // 4. Padanan nama sahaja jika murid itu unik dalam pangkalan data
  const byNormNameMatches = existingStudents.filter(
    (s) => normalizeStudentName(s.name) === normName
  );
  if (byNormNameMatches.length === 1) {
    return byNormNameMatches[0];
  }

  return undefined;
}
