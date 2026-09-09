import { SchoolClass } from '../types';

/**
 * TERTIB KELAS RASMI SEKOLAH:
 *
 * Tingkatan 1, 2, 3:
 * 1. AF
 * 2. AM
 * 3. AK
 * 4. AZ
 * 5. AA
 *
 * Tingkatan 4, 5:
 * 1. IS
 * 2. AR
 * 3. IR
 * 4. BAT
 * 5. BAY
 * 6. IDR
 */

export const FORM_1_3_SUFFIXES = ['AF', 'AM', 'AK', 'AZ', 'AA'] as const;
export const FORM_4_5_SUFFIXES = ['IS', 'AR', 'IR', 'BAT', 'BAY', 'IDR'] as const;

export const STANDARD_SCHOOL_CLASSES: string[] = [
  // Tingkatan 1
  '1 AF', '1 AM', '1 AK', '1 AZ', '1 AA',
  // Tingkatan 2
  '2 AF', '2 AM', '2 AK', '2 AZ', '2 AA',
  // Tingkatan 3
  '3 AF', '3 AM', '3 AK', '3 AZ', '3 AA',
  // Tingkatan 4
  '4 IS', '4 AR', '4 IR', '4 BAT', '4 BAY', '4 IDR',
  // Tingkatan 5
  '5 IS', '5 AR', '5 IR', '5 BAT', '5 BAY', '5 IDR',
];

export interface ParsedClassInfo {
  form: number;
  suffix: string;
  raw: string;
}

/**
 * Memecahkan nama kelas kepada nombor Tingkatan dan akhiran (suffix)
 * Menyokong pelbagai format seperti "1 AF", "1AF", "Tingkatan 1 AF", "T1-AF", "4 IS", "5 BAY", dll.
 */
export function parseFormAndSuffix(name?: string | null): ParsedClassInfo {
  const raw = String(name || '').trim();
  if (!raw) {
    return { form: 999, suffix: '', raw: '' };
  }

  // Jika Peralihan
  if (/^peralihan/i.test(raw)) {
    return { form: 0, suffix: raw.toUpperCase(), raw };
  }

  // Padankan "Tingkatan 1 AF", "T1 AF", "1 AF", "1-AF", "1AF"
  const formMatch = raw.match(
    /^(?:tingkatan|ting|darjah|tahun|kelas|form|t|f)?\s*([0-9]+)\s*[-/_\s]*(.*)$/i
  );

  if (formMatch) {
    const form = parseInt(formMatch[1], 10);
    const suffix = formMatch[2].trim().toUpperCase();
    return { form, suffix, raw };
  }

  return { form: 999, suffix: raw.toUpperCase(), raw };
}

/**
 * Mendapatkan skor kedudukan / rank akhiran kelas mengikut ketetapan sekolah
 */
export function getSuffixRank(form: number, suffix: string): number {
  const cleanSuffix = suffix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (form >= 1 && form <= 3) {
    const idx = FORM_1_3_SUFFIXES.findIndex(
      (s) => cleanSuffix === s || cleanSuffix.startsWith(s)
    );
    if (idx !== -1) return idx;
    return 100; // Kelas tambahan luar tertib standard
  }

  if (form === 4 || form === 5) {
    const idx = FORM_4_5_SUFFIXES.findIndex(
      (s) => cleanSuffix === s || cleanSuffix.startsWith(s)
    );
    if (idx !== -1) return idx;
    return 100;
  }

  return 100;
}

/**
 * Pembanding (Comparator) untuk menyusun nama kelas mengikut tertib rasmi:
 * - Tingkatan 1 -> 2 -> 3 -> 4 -> 5
 * - Tingkatan 1, 2, 3 disusun: AF -> AM -> AK -> AZ -> AA
 * - Tingkatan 4, 5 disusun: IS -> AR -> IR -> BAT -> BAY -> IDR
 */
export function compareClassNames(nameA?: string | null, nameB?: string | null): number {
  if (!nameA && !nameB) return 0;
  if (!nameA) return 1;
  if (!nameB) return -1;

  const parsedA = parseFormAndSuffix(nameA);
  const parsedB = parseFormAndSuffix(nameB);

  // 1. Bandingkan nombor tingkatan dahulu (1 -> 2 -> 3 -> 4 -> 5)
  if (parsedA.form !== parsedB.form) {
    return parsedA.form - parsedB.form;
  }

  // 2. Jika sama tingkatan, bandingkan tertib rasmi suffix
  const rankA = getSuffixRank(parsedA.form, parsedA.suffix);
  const rankB = getSuffixRank(parsedB.form, parsedB.suffix);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // 3. Jika kedudukan sama (contoh unlisted), susun mengikut abjad
  return parsedA.raw.localeCompare(parsedB.raw, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Menyusun tatasusunan objek SchoolClass mengikut tertib rasmi
 */
export function sortSchoolClasses(classList: SchoolClass[]): SchoolClass[];
export function sortSchoolClasses<T extends { className: string }>(classList: T[]): T[];
export function sortSchoolClasses<T extends { className: string }>(classList: T[]): T[] {
  return [...classList].sort((a, b) => compareClassNames(a.className, b.className));
}

/**
 * Menyusun senarai nama kelas (string[]) mengikut tertib rasmi
 */
export function sortClassNames(classNames: string[]): string[] {
  return [...classNames].sort((a, b) => compareClassNames(a, b));
}
