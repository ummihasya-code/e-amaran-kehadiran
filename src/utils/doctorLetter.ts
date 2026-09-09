/**
 * Utiliti untuk mengenalpasti sama ada sebab ketidakhadiran merupakan
 * Surat Cuti Sakit / MC / Sijil Sakit daripada Doktor, Hospital atau Klinik.
 * 
 * PERATURAN KRITIKAL:
 * Perkataan seperti 'sakit', 'demam', 'batuk', 'tidak sihat' TIDAK DIANGGAP
 * sebagai surat doktor melainkan disahkan dengan perkataan rasmi seperti
 * 'surat cuti sakit', 'hospital', 'klinik', 'sijil sakit', atau 'mc'.
 */

export function isVerifiedDoctorLetter(reason: string): boolean {
  if (!reason) return false;
  const normalized = reason.toLowerCase().trim();

  // Keyword sah untuk Surat Doktor / Hospital / Klinik / Sijil Sakit / MC
  const doctorKeywords = [
    'surat cuti sakit',
    'cuti sakit hospital',
    'cuti sakit klinik',
    'sijil sakit',
    'surat doktor',
    'hospital',
    'klinik',
    'medical certificate',
  ];

  for (const kw of doctorKeywords) {
    if (normalized.includes(kw)) {
      return true;
    }
  }

  // Regex untuk 'mc' sebagai perkataan berasingan
  if (/\bmc\b/i.test(normalized)) {
    return true;
  }

  return false;
}
