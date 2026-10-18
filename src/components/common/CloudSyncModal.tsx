import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { dataService } from '../../services/dataService';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Database,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const { user, firebaseUser, isCloudConnected, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    local: { classes: number; students: number; attendance: number; warnings: number };
    firestore: { classes: number; students: number; attendance: number; warnings: number } | null;
    isConnected: boolean;
  } | null>(null);

  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await dataService.getSyncStats();
      setStats(res);
    } catch (e) {
      console.warn('Gagal memuatkan statistik Firebase:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  // Handler: Tolak semua data tempatan ke Firestore
  const handlePushAll = async () => {
    setIsPushing(true);
    try {
      const res = await dataService.syncAllToFirestore(
        user ? { id: user.id, name: user.name } : undefined
      );

      if (res.success) {
        showToast(
          `🎉 Berjaya menyegerak ke Firebase: ${res.counts.classes} kelas, ${res.counts.students} murid, ${res.counts.attendance} kehadiran, & ${res.counts.warnings} surat amaran!`,
          'success'
        );
        await loadStats();
        if (onSyncComplete) onSyncComplete();
      } else {
        showToast(`❌ ${res.error || 'Gagal menyegerakkan ke Firebase.'}`, 'error');
      }
    } catch (err: any) {
      showToast(`❌ Ralat: ${err?.message || 'Tidak dapat bersambung ke Firebase.'}`, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  // Handler: Tarik data terkini dari Firestore ke pelayar
  const handlePullAll = async () => {
    setIsPulling(true);
    try {
      const counts = await dataService.fetchFromFirestore();
      showToast(
        `✅ Berjaya menarik data dari Firebase Firestore (${counts.classes} kelas, ${counts.students} murid, ${counts.attendance} kehadiran)!`,
        'success'
      );
      await loadStats();
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      showToast(`❌ Gagal menarik data: ${err?.message}`, 'error');
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pusat Penyegerakan & Status Firebase Firestore"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Banner Status Sambungan Langsung */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isCloudConnected
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/90 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isCloudConnected ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {isCloudConnected ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {isCloudConnected ? 'Tersambung ke Firebase Firestore' : 'Sesi Firebase Auth Terhad'}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isCloudConnected
                      ? 'bg-emerald-200/70 text-emerald-800'
                      : 'bg-amber-200 text-amber-800'
                  }`}
                >
                  {isCloudConnected ? 'Awan Aktif' : 'Mod Tempatan'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isCloudConnected
                  ? `Pengguna: ${firebaseUser?.email || 'Sesi Awan Tanpa Nama (Anonymous Active)'}`
                  : 'Sistem sedang menggunakan cache tempatan pelayar (LocalStorage).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {!isCloudConnected && (
              <button
                type="button"
                onClick={loginWithGoogle}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <span>Log Masuk Google</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadStats}
              disabled={isLoadingStats}
              className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 border border-slate-200 text-xs shadow-2xs transition"
              title="Muat semula statistik"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Penerangan Jelas: Kenapa Data Sebelum Ini Belum Masuk ke Firebase? */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Kenapa data yang dimasukkan sebelum ini tersimpan dalam pelayar?</span>
            </div>
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline"
            >
              {showExplanation ? 'Sembunyi' : 'Lihat Penjelasan'}
            </button>
          </div>

          {showExplanation && (
            <div className="text-xs text-slate-600 space-y-2 pt-1 border-t border-slate-200/60">
              <p>
                <strong>1. Keselamatan Peraturan Firestore (ABAC):</strong> Firestore memerlukan pengguna
                mempunyai token keselamatan sah (<code>request.auth != null</code>). Sekiranya pengguna menggunakan
                log masuk pantas atau belum mengesahkan Google, Firestore menyekat penulisan dan data dialihkan
                ke <strong>Local Storage</strong> pelayar untuk mengelakkan data hilang.
              </p>
              <p>
                <strong>2. Mod Luar Talian (Offline Resilience):</strong> Aplikasi direka menyimpan salinan
                tempatan terlebih dahulu supaya guru dan pentadbir boleh mengimport data, merekod kehadiran,
                dan mencetak surat tanpa terjejas sekiranya internet perlahan.
              </p>
              <p>
                <strong>3. Penyelesaian Segerak:</strong> Kini anda boleh menekan butang{' '}
                <strong className="text-emerald-700">"Segerak Semua Data ke Firebase Sekarang"</strong> di bawah.
                Sistem akan membaca semua kelas, murid, kehadiran, dan surat amaran daripada pelayar dan
                memasukkannya ke pangkalan data Firestore awan secara kelompok (batch).
              </p>
            </div>
          )}
        </div>

        {/* Perbandingan Statistik Data: Tempatan vs Firebase */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span>Perbandingan Data Semasa (Tempatan vs Firestore Awan)</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              Pangkalan Data: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-mono">ai-studio-eamarankehadiran</code>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* KELAS */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Kelas Berdaftar</div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-lg font-black text-slate-800">
                  {stats?.local.classes ?? '...'}
                </div>
                <div className="text-xs text-slate-500">
                  Awan:{' '}
                  <strong className="text-indigo-600">
                    {stats?.firestore ? stats.firestore.classes : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* MURID */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Murid Aktif</div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-lg font-black text-slate-800">
                  {stats?.local.students ?? '...'}
                </div>
                <div className="text-xs text-slate-500">
                  Awan:{' '}
                  <strong className="text-indigo-600">
                    {stats?.firestore ? stats.firestore.students : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* KEHADIRAN */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Rekod Ketidakhadiran</div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-lg font-black text-slate-800">
                  {stats?.local.attendance ?? '...'}
                </div>
                <div className="text-xs text-slate-500">
                  Awan:{' '}
                  <strong className="text-indigo-600">
                    {stats?.firestore ? stats.firestore.attendance : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* SURAT AMARAN */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Surat Amaran Dimasukkan</div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-lg font-black text-slate-800">
                  {stats?.local.warnings ?? '...'}
                </div>
                <div className="text-xs text-slate-500">
                  Awan:{' '}
                  <strong className="text-indigo-600">
                    {stats?.firestore ? stats.firestore.warnings : '-'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tindakan Utama */}
        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Penyegerakan selamat menggunakan transaksi Firestore Batch</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePullAll}
              disabled={isPulling || isPushing}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              title="Tarik data terkini daripada Firebase Firestore ke pelayar"
            >
              <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
              <span>{isPulling ? 'Menarik...' : 'Tarik dari Awan'}</span>
            </button>

            <button
              type="button"
              id="btn-confirm-push-firebase"
              onClick={handlePushAll}
              disabled={isPushing || isPulling}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} />
              <span>{isPushing ? 'Sedang Memuat Naik...' : 'Segerak Semua Data ke Firebase Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
