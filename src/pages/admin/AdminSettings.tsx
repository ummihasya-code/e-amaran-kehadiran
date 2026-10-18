import React, { useState, useEffect } from 'react';
import { AttendanceSettings } from '../../types';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import {
  Save,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  History,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { DEFAULT_SETTINGS } from '../../services/warningEngine';

interface AdminSettingsProps {
  settings: AttendanceSettings;
  onRefreshData: () => void;
  onNavigate?: (view: string) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  onRefreshData,
  onNavigate,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Berkala (Cumulative from Anchor Date)
  const [w1, setW1] = useState<number>(settings.warning1Threshold || 10);
  const [w2, setW2] = useState<number>(settings.warning2Threshold || 10);
  const [w3, setW3] = useState<number>(settings.warning3Threshold || 20);
  const [wExp, setWExp] = useState<number>(settings.expulsionThreshold || 20);

  // Berterusan (Consecutive from Anchor Date)
  const [c1, setC1] = useState<number>(settings.consecutiveW1 || 3);
  const [c2, setC2] = useState<number>(settings.consecutiveW2 || 7);
  const [c3, setC3] = useState<number>(settings.consecutiveW3 || 7);
  const [cExp, setCExp] = useState<number>(settings.consecutiveExpulsion || 14);

  const [calculationMethod, setCalculationMethod] = useState<'cumulative' | 'consecutive'>(
    settings.calculationMethod || 'cumulative'
  );
  const [showAuditTrailMenu, setShowAuditTrailMenu] = useState<boolean>(
    settings.showAuditTrailMenu ?? false
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    setW1(settings.warning1Threshold ?? 10);
    setW2(settings.warning2Threshold ?? 10);
    setW3(settings.warning3Threshold ?? 20);
    setWExp(settings.expulsionThreshold ?? 20);

    setC1(settings.consecutiveW1 ?? 3);
    setC2(settings.consecutiveW2 ?? 7);
    setC3(settings.consecutiveW3 ?? 7);
    setCExp(settings.consecutiveExpulsion ?? 14);

    setCalculationMethod(settings.calculationMethod || 'cumulative');
    setShowAuditTrailMenu(settings.showAuditTrailMenu ?? false);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (w1 <= 0 || w2 <= 0 || w3 <= 0 || wExp <= 0) {
      showToast('⚠️ Sila pastikan nilai threshold berkala lebih daripada 0 hari.', 'warning');
      return;
    }

    if (c1 <= 0 || c2 <= 0 || c3 <= 0 || cExp <= 0) {
      showToast('⚠️ Sila pastikan nilai threshold berterusan lebih daripada 0 hari.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const updated: AttendanceSettings = {
        ...settings,
        warning1Threshold: Number(w1),
        warning2Threshold: Number(w2),
        warning3Threshold: Number(w3),
        expulsionThreshold: Number(wExp),
        consecutiveW1: Number(c1),
        consecutiveW2: Number(c2),
        consecutiveW3: Number(c3),
        consecutiveExpulsion: Number(cExp),
        calculationMethod,
        showAuditTrailMenu,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || 'Pentadbir',
      };

      await dataService.saveSettings(
        updated,
        user ? { id: user.id, name: user.name } : undefined
      );

      showToast('✅ Tetapan berjaya disimpan.', 'success');
      onRefreshData();
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal menyimpan tetapan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setW1(DEFAULT_SETTINGS.warning1Threshold);
    setW2(DEFAULT_SETTINGS.warning2Threshold);
    setW3(DEFAULT_SETTINGS.warning3Threshold);
    setWExp(DEFAULT_SETTINGS.expulsionThreshold ?? 20);

    setC1(DEFAULT_SETTINGS.consecutiveW1 ?? 3);
    setC2(DEFAULT_SETTINGS.consecutiveW2 ?? 7);
    setC3(DEFAULT_SETTINGS.consecutiveW3 ?? 7);
    setCExp(DEFAULT_SETTINGS.consecutiveExpulsion ?? 14);

    setCalculationMethod(DEFAULT_SETTINGS.calculationMethod);
    setShowAuditTrailMenu(false);
    showToast('Nilai tetapan dikembalikan kepada standard KPM (SPI Bil. 7/2003).', 'info');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-600" />
          <span>Tetapan Peraturan Surat Amaran (Konsep Anchor Date)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Konfigurasi ambang had hari tidak hadir mengikut Surat Pekeliling Ikhtisas KPM Bil. 7/2003
          berdasarkan tarikh surat amaran terdahulu.
        </p>
      </div>

      {/* Makluman Logik Anchor Date */}
      <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-blue-950">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Prinsip Utama Pengiraan Anchor Date (Tarikh Surat Terdahulu):</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11.5px] text-blue-800 leading-relaxed pl-1">
          <li>
            <strong>Amaran 1:</strong> Dikira berdasarkan rekod tidak hadir sejak awal tahun persekolahan.
          </li>
          <li>
            <strong>Amaran 2:</strong> Hanya mula dikira untuk rekod selepas tarikh Surat Amaran 1 direkodkan (<em>attendance.date &gt; warning1.issueDate</em>).
          </li>
          <li>
            <strong>Amaran 3:</strong> Hanya mula dikira untuk rekod selepas tarikh Surat Amaran 2 direkodkan (<em>attendance.date &gt; warning2.issueDate</em>).
          </li>
          <li>
            <strong>Tindakan Buang Sekolah:</strong> Hanya mula dikira selepas tarikh Surat Amaran 3 direkodkan. Sistem hanya mengeluarkan <strong>amaran/alert status</strong> tanpa menjana surat automatik.
          </li>
          <li>
            <strong>Pengecualian MC:</strong> Sijil sakit (surat doktor) yang disahkan <strong>kekal tidak dikira</strong> dalam sebarang threshold.
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Kaedah Utama Pengiraan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Kaedah Analisis Utama Kehadiran (Active Rule Mode)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  calculationMethod === 'cumulative'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="calculationMethod"
                  checked={calculationMethod === 'cumulative'}
                  onChange={() => setCalculationMethod('cumulative')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <span>Ponteng Berkala (Tidak Berturut-turut)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      Lalai Rasmi KPM
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 leading-normal block mt-1">
                    Pengiraan hari tidak hadir terkumpul selepas tarikh surat amaran terdahulu
                    (10 hari → Amaran 1, +10 hari → Amaran 2, +20 hari → Amaran 3, +20 hari → Buang Sekolah).
                  </span>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  calculationMethod === 'consecutive'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="calculationMethod"
                  checked={calculationMethod === 'consecutive'}
                  onChange={() => setCalculationMethod('consecutive')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Ponteng Berterusan (Berturut-turut)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-normal block mt-1">
                    Pengiraan hari tidak hadir berturut-turut selepas tarikh surat amaran terdahulu
                    (3 hari berturut → Amaran 1, +7 hari → Amaran 2, +7 hari → Amaran 3, +14 hari → Buang Sekolah).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* JADUAL 1: PONTENG BERKALA */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span>Jadual 1: Ponteng Berkala (Tidak Berturut-turut)</span>
                  {calculationMethod === 'cumulative' && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                      Mod Aktif
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Kiraan hari tidak hadir yang berlaku selepas tarikh surat amaran terdahulu (Anchor Date).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Amaran 1 Berkala */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                <span className="text-xs font-bold text-amber-900 block">Surat Amaran 1</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={w1}
                    onChange={(e) => setW1(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hari</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Dari awal tahun (Lalai KPM: 10 hari).
                </p>
              </div>

              {/* Amaran 2 Berkala */}
              <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/40 space-y-2">
                <span className="text-xs font-bold text-orange-900 block">Surat Amaran 2</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={w2}
                    onChange={(e) => setW2(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hari</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Selepas Surat Amaran 1 (Lalai KPM: 10 hari).
                </p>
              </div>

              {/* Amaran 3 Berkala */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <span className="text-xs font-bold text-rose-900 block">Surat Amaran 3 (Terakhir)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={w3}
                    onChange={(e) => setW3(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hari</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Selepas Surat Amaran 2 (Lalai KPM: 20 hari).
                </p>
              </div>

              {/* Buang Sekolah Berkala */}
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
                <span className="text-xs font-bold text-purple-900 block">Buang Sekolah (Alert)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={wExp}
                    onChange={(e) => setWExp(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hari</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Selepas Surat Amaran 3 (Lalai KPM: 20 hari).
                </p>
              </div>
            </div>
          </div>

          {/* JADUAL 2: PONTENG BERTERUSAN */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span>Jadual 2: Ponteng Berterusan (Berturut-turut)</span>
                  {calculationMethod === 'consecutive' && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                      Mod Aktif
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Kiraan hari tidak hadir berturut-turut selepas tarikh surat amaran terdahulu.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Amaran 1 Berterusan */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                <span className="text-xs font-bold text-amber-900 block">Surat Amaran 1</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={c1}
                    onChange={(e) => setC1(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hari</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Berturut-turut (Lalai KPM: 3 hari).
                </p>
              </div>

              {/* Amaran 2 Berterusan */}
              <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/40 space-y-2">
                <span className="text-xs font-bold text-orange-900 block">Surat Amaran 2</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={c2}
                    onChange={(e) => setC2(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hari</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Selepas Surat Amaran 1 (Lalai KPM: 7 hari).
                </p>
              </div>

              {/* Amaran 3 Berterusan */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <span className="text-xs font-bold text-rose-900 block">Surat Amaran 3 (Terakhir)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={c3}
                    onChange={(e) => setC3(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hari</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Selepas Surat Amaran 2 (Lalai KPM: 7 hari).
                </p>
              </div>

              {/* Buang Sekolah Berterusan */}
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
                <span className="text-xs font-bold text-purple-900 block">Buang Sekolah (Alert)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={cExp}
                    onChange={(e) => setCExp(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Hari</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight">
                  Selepas Surat Amaran 3 (Lalai KPM: 14 hari).
                </p>
              </div>
            </div>
          </div>

          {/* KAWALAN PAPARAN NAVIGASI & JEJAK AUDIT (AUDIT TRAIL) */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Kawalan Paparan Navigasi & Jejak Audit (Audit Trail)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pengurusan paparan menu audit teknikal bagi mengekalkan antara muka yang bersih dan mesra pengguna.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Adakah Audit Trail Perlu Dipaparkan dalam Menu Utama?
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Disyorkan: Sembunyi
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed max-w-2xl">
                    <strong>Tidak perlu untuk urusan harian.</strong> Audit Trail mengandungi log teknikal sistem
                    (sejarah log masuk, penukaran status rekod, dan log pemadaman). Ia disembunyikan supaya menu sisi
                    lebih kemas dan fokus kepada operasi kehadiran & surat amaran harian guru.
                  </p>
                  <p className="text-[11px] text-slate-500 italic">
                    * Log jejak audit tetap aktif berjalan secara automatik di latar belakang untuk keselamatan data
                    dan membolehkan fungsi <strong>Undo / Pulihkan Kelas & Murid</strong> yang dipadam secara tidak sengaja.
                  </p>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('admin_audit')}
                    className="self-start sm:self-center px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 shrink-0"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Semak Log Audit Sekarang</span>
                  </button>
                )}
              </div>

              {/* Toggle Sembunyi / Papar */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  {showAuditTrailMenu ? (
                    <Eye className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Papar Menu 'Audit Trail' dalam Sidebar Navigasi
                    </span>
                    <span className="text-[10.5px] text-slate-500">
                      {showAuditTrailMenu
                        ? 'Menu Audit Trail sedang dipaparkan di bar navigasi sisi.'
                        : 'Menu Audit Trail disembunyikan daripada bar navigasi sisi (Lalai Disyorkan).'}
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAuditTrailMenu}
                    onChange={(e) => setShowAuditTrailMenu(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Tindakan Simpan & Reset */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan Nilai Lalai KPM</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Tetapan Peraturan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
