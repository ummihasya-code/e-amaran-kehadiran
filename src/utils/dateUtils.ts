/**
 * Utiliti penukaran dan format tarikh standard bagi e-AMARAN KEHADIRAN.
 * Paparan: DD/MM/YYYY
 * Penyimpanan Database: YYYY-MM-DD (ISO)
 */

const MALAY_ENGLISH_MONTHS: Record<string, string> = {
  jan: '01',
  januari: '01',
  january: '01',
  feb: '02',
  februari: '02',
  february: '02',
  mac: '03',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  mei: '05',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  julai: '07',
  july: '07',
  ogo: '08',
  ogos: '08',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  okt: '10',
  oktober: '10',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dis: '12',
  disember: '12',
  dec: '12',
  december: '12',
};

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const str = String(dateStr).trim();
  // If already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }
  // If YYYY-MM-DD
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  // Cuba parseToIsoDate dahulu
  const iso = parseToIsoDate(str);
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const p = iso.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  }
  return str;
}

/**
 * Menukar sebarang jenis input tarikh (Excel serial number, String DD/MM/YYYY,
 * nama bulan BM/BI, cap masa waktu, JS Date, dll.) kepada format ISO YYYY-MM-DD.
 */
export function parseToIsoDate(rawDate: any): string {
  if (rawDate === undefined || rawDate === null || rawDate === '') return '';

  // 1. Jika objek Date sah
  if (rawDate instanceof Date) {
    if (!isNaN(rawDate.getTime())) {
      const year = rawDate.getFullYear();
      const month = String(rawDate.getMonth() + 1).padStart(2, '0');
      const day = String(rawDate.getDate()).padStart(2, '0');
      if (year >= 1970 && year <= 2100) {
        return `${year}-${month}-${day}`;
      }
    }
    return '';
  }

  // 2. Jika nombor siri Excel (contoh: 45543 atau rentetan "45543")
  if (
    typeof rawDate === 'number' ||
    (typeof rawDate === 'string' && /^\s*\d{4,6}(\.\d+)?\s*$/.test(rawDate))
  ) {
    const num = typeof rawDate === 'number' ? rawDate : parseFloat(rawDate);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      // Lotus 1-2-3 leap year bug adjustment (base epoch 1899-12-30)
      const utcDays = Math.floor(num - 25569);
      const dateObj = new Date(utcDays * 86400 * 1000);
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      if (year >= 1980 && year <= 2100) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  // Bersihkan rentetan teks daripada sebut harga atau tanda kutip Excel ('16/09/2026)
  let str = String(rawDate).trim().replace(/^['"`\s]+|['"`\s]+$/g, '');
  if (!str) return '';

  // 3. Jika sudah format ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 4. Buang bahagian cap masa (Time portion seperti 00:00:00, 12:00 AM, dsb.)
  str = str.replace(/T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([Zz]|[\+\-]\d{2}:\d{2})?$/, '').trim();
  str = str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*(am|pm))?$/i, '').trim();
  str = str.replace(/\s+(am|pm)$/i, '').trim();

  // Semak semula jika selepas buang time ia sudah YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 5. Format ISO dengan pemisah slash atau dot: YYYY/MM/DD atau YYYY.MM.DD
  const isoSlashMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (isoSlashMatch) {
    const y = isoSlashMatch[1];
    const m = isoSlashMatch[2].padStart(2, '0');
    const d = isoSlashMatch[3].padStart(2, '0');
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 6. Format teks nama bulan BM atau BI: contoh "16 Sep 2026", "16 September 2026", "16-Ogos-2026"
  const textMonthMatch = str.match(/^(\d{1,2})[\s\/\-\.]+([a-zA-Z]+)[\s\/\-\.]+(\d{2,4})$/);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const monthStr = textMonthMatch[2].toLowerCase();
    let year = textMonthMatch[3];
    if (year.length === 2) {
      year = Number(year) < 70 ? `20${year}` : `19${year}`;
    }
    const mappedMonth = MALAY_ENGLISH_MONTHS[monthStr];
    if (mappedMonth && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${mappedMonth}-${day}`;
    }
  }

  // Format teks nama bulan terbalik: contoh "September 16, 2026"
  const revTextMonthMatch = str.match(/^([a-zA-Z]+)[\s\/\-\.]+(\d{1,2})[\,\s\/\-\.]+(\d{2,4})$/);
  if (revTextMonthMatch) {
    const monthStr = revTextMonthMatch[1].toLowerCase();
    const day = revTextMonthMatch[2].padStart(2, '0');
    let year = revTextMonthMatch[3];
    if (year.length === 2) {
      year = Number(year) < 70 ? `20${year}` : `19${year}`;
    }
    const mappedMonth = MALAY_ENGLISH_MONTHS[monthStr];
    if (mappedMonth && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${mappedMonth}-${day}`;
    }
  }

  // 7. Format Standard Malaysia DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (sokong 1 atau 2 digit tahun/bulan/hari)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const yStr = dmyMatch[3];
    let y = parseInt(yStr, 10);
    if (yStr.length === 2) {
      y = y < 70 ? 2000 + y : 1900 + y;
    }

    let day = p1;
    let month = p2;

    // Di Malaysia kelaziman adalah DD/MM/YYYY
    // Jika p1 > 12 dan p2 <= 12, p1 pasti hari dan p2 pasti bulan
    // Jika p2 > 12 dan p1 <= 12 (contoh format AS MM/DD/YYYY), p2 adalah hari
    // Jika kedua-duanya <= 12 (contoh 05/09/2026), patuhi format Malaysia: DD = 05, MM = 09 (September)
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    } else {
      day = p1;
      month = p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 8. Fallback menggunakan JavaScript Date (hanya jika tahun munasabah)
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (year >= 1980 && year <= 2100) {
        return `${year}-${month}-${day}`;
      }
    }
  } catch {
    // ignore
  }

  return '';
}

/**
 * Mengekstrak semua tarikh ISO yang sah daripada satu sel atau rentetan teks.
 * Berguna sekiranya satu sel mengandungi lebih daripada satu tarikh tidak hadir
 * (contoh: "16/09/2026, 17/09/2026" atau pemisah baris baru).
 */
export function extractAllIsoDates(rawDate: any): string[] {
  if (!rawDate) return [];

  if (typeof rawDate === 'number' || rawDate instanceof Date) {
    const single = parseToIsoDate(rawDate);
    return single ? [single] : [];
  }

  const str = String(rawDate).trim();
  // Jika mengandungi pemisah koma, semikolon, baris baru atau perkataan 'dan' / '&'
  if (/[,;\n&]|\bdan\b/i.test(str)) {
    const parts = str.split(/[,;\n&]+|\bdan\b/i);
    const results: string[] = [];
    const seen = new Set<string>();

    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      const iso = parseToIsoDate(trimmed);
      if (iso && !seen.has(iso)) {
        seen.add(iso);
        results.push(iso);
      }
    }

    if (results.length > 0) {
      return results;
    }
  }

  // Jika satu tarikh sahaja
  const single = parseToIsoDate(str);
  return single ? [single] : [];
}

export function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateFingerprint(studentId: string, isoDate: string, reason: string): string {
  const cleanReason = reason.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${studentId}_${isoDate}_${cleanReason}`;
}
