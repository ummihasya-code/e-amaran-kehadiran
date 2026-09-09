import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { dataService } from '../services/dataService';
import { sortSchoolClasses } from '../utils/classOrder';
import { SchoolClass, UserRole } from '../types';
import {
  LogIn,
  UserPlus,
  Shield,
  School,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { loginWithCredentials, registerUser, loginWithGoogle, isLoading } = useAuth();
  const { showToast } = useToast();

  // Mode: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // State untuk Log Masuk
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginRole, setLoginRole] = useState<'admin' | 'teacher'>('admin');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // State untuk Pendaftaran Akaun
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('teacher');
  const [regClass, setRegClass] = useState<string>('3 AA');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Senarai kelas yang diambil daripada pangkalan data
  const [availableClasses, setAvailableClasses] = useState<SchoolClass[]>([]);

  useEffect(() => {
    // Muat senarai kelas untuk dropdown pendaftaran guru
    dataService.getClasses().then((clsList) => {
      const sorted = sortSchoolClasses(clsList);
      setAvailableClasses(sorted);
      if (sorted.length > 0 && !regClass) {
        setRegClass(sorted[0].className);
      }
    });
  }, []);

  // Handler Log Masuk
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const emailTrim = loginEmail.trim();
    if (!emailTrim) {
      setLoginError('Sila masukkan alamat emel atau ID pengguna anda.');
      return;
    }

    try {
      await loginWithCredentials(emailTrim, loginPassword, loginRole);
      showToast('✅ Berjaya log masuk ke sistem e-Amaran.', 'success');
      onSuccess();
    } catch (err: any) {
      const msg = err?.message || 'Gagal log masuk. Sila semak emel dan kata laluan anda.';
      setLoginError(msg);
      showToast(`❌ ${msg}`, 'error');
    }
  };

  // Handler Daftar Akaun
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const nameTrim = regName.trim();
    const emailTrim = regEmail.trim();

    if (!nameTrim) {
      setRegError('Sila masukkan nama penuh anda.');
      return;
    }
    if (!emailTrim || !emailTrim.includes('@')) {
      setRegError('Sila masukkan alamat emel yang sah.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Kata laluan dan pengesahan kata laluan tidak sepadan.');
      return;
    }
    if (regRole === 'teacher' && !regClass) {
      setRegError('Sila pilih kelas yang anda selia sebagai Guru Kelas.');
      return;
    }

    try {
      await registerUser({
        name: nameTrim,
        email: emailTrim,
        password: regPassword,
        role: regRole,
        assignedClasses: regRole === 'teacher' ? [regClass] : [],
      });

      showToast(`🎉 Tahniah ${nameTrim}, akaun anda telah berjaya didaftarkan!`, 'success');
      onSuccess();
    } catch (err: any) {
      const msg = err?.message || 'Ralat semasa mendaftar akaun baru.';
      setRegError(msg);
      showToast(`❌ ${msg}`, 'error');
    }
  };

  // Handler Google Login
  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
      showToast('✅ Berjaya log masuk menggunakan Google.', 'success');
      onSuccess();
    } catch (e: any) {
      const msg = e?.message?.includes('closed')
        ? 'Tetingkap Google ditutup sebelum log masuk selesai.'
        : 'Log masuk Google dibatalkan atau ralat konfigurasi awan.';
      showToast(`⚠️ ${msg}`, 'warning');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg my-auto">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white font-black text-2xl shadow-lg mb-2.5">
            eA
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            e-AMARAN KEHADIRAN
          </h2>
          <p className="mt-1 text-xs text-slate-600 font-medium max-w-sm mx-auto">
            Sistem Pemantauan Ketidakhadiran & Pengurusan Surat Amaran Murid Sekolah
          </p>
        </div>

        {/* Tab Navigation: Log Masuk vs Daftar Akaun */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Log Masuk</span>
            </button>

            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akaun Baru</span>
            </button>
          </div>

          {/* TAB 1: LOG MASUK */}
          {activeTab === 'login' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-900">Selamat Kembali</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Masukkan emel dan kata laluan untuk mengakses portal e-Amaran
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">{loginError}</span>
                    {loginError.includes('Daftar Akaun') && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('register')}
                        className="block mt-1 font-bold text-emerald-700 hover:underline"
                      >
                        Buka Borang Daftar Akaun →
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Alamat Emel / ID Pengguna <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-login-email"
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="cth: cikgu@sekolah.edu.my atau admin"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Kata Laluan <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="input-login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata laluan"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title={showLoginPassword ? 'Sembunyi' : 'Tunjuk'}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Peranan Utama Pengguna
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-select-role-admin"
                      onClick={() => setLoginRole('admin')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                        loginRole === 'admin'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Pentadbir (Admin)</span>
                    </button>
                    <button
                      type="button"
                      id="btn-select-role-teacher"
                      onClick={() => setLoginRole('teacher')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                        loginRole === 'teacher'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <School className="w-3.5 h-3.5" />
                      <span>Guru Kelas</span>
                    </button>
                  </div>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Sedang Mengesahkan...' : 'LOG MASUK'}</span>
                </button>
              </form>

              {/* Log Masuk dengan Google */}
              <div className="space-y-3 pt-1">
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    atau
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button
                  type="button"
                  id="btn-google-login"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition shadow-2xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Log Masuk Akaun Google (Firebase Awan)</span>
                </button>
              </div>

              <div className="pt-2 text-center text-xs text-slate-500">
                Belum mempunyai akaun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegError(null);
                  }}
                  className="font-bold text-emerald-600 hover:text-emerald-700 underline"
                >
                  Daftar Akaun Sekarang
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DAFTAR AKAUN BARU */}
          {activeTab === 'register' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pendaftaran Pengguna Baru</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Buka Akaun e-Amaran</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftarkan diri anda sebagai Guru Kelas atau Pentadbir Sekolah
                </p>
              </div>

              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Penuh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="cth: Cikgu Nurul Huda binti Ismail"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Alamat Emel Rasmi / Peribadi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="cth: nurulhuda@sekolah.edu.my"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Emel ini akan digunakan sebagai ID log masuk anda.
                  </p>
                </div>

                {/* Pilihan Peranan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih Peranan Anda <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn-reg-role-teacher"
                      onClick={() => setRegRole('teacher')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        regRole === 'teacher'
                          ? 'bg-emerald-50/80 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <School className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Guru Kelas</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Mengurus kehadiran & murid kelas sendiri
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="btn-reg-role-admin"
                      onClick={() => setRegRole('admin')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        regRole === 'admin'
                          ? 'bg-emerald-50/80 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Pentadbir (Admin)</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Akses penuh keseluruhan sekolah
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Dropdown Kelas jika Guru Kelas */}
                {regRole === 'teacher' && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Kelas Bertanggungjawab <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="select-reg-class"
                      value={regClass}
                      onChange={(e) => setRegClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {availableClasses.map((cls) => (
                        <option key={cls.id} value={cls.className}>
                          {cls.className} {cls.teacherName ? `(Guru kini: ${cls.teacherName})` : ''}
                        </option>
                      ))}
                      {availableClasses.length === 0 && (
                        <>
                          <option value="3 AA">3 AA</option>
                          <option value="1 AM">1 AM</option>
                          <option value="1 AK">1 AK</option>
                          <option value="2 AA">2 AA</option>
                          <option value="3 BB">3 BB</option>
                          <option value="4 IS">4 IS</option>
                          <option value="5 IDR">5 IDR</option>
                        </>
                      )}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Anda akan diberikan akses pantas merekod kehadiran dan mencetak surat amaran bagi kelas ini.
                    </p>
                  </div>
                )}

                {/* Kata Laluan & Sahkan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kata Laluan <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 aksara"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-9 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sahkan Kata Laluan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-reg-confirm-password"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Ulang kata laluan"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-submit-register"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isLoading ? 'Sedang Mendaftar Akaun...' : 'DAFTAR AKAUN SEKARANG'}</span>
                  </button>
                </div>
              </form>

              <div className="pt-2 text-center text-xs text-slate-500">
                Sudah mempunyai akaun berdaftar?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setLoginError(null);
                  }}
                  className="font-bold text-emerald-600 hover:text-emerald-700 underline"
                >
                  Log Masuk di Sini
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 font-medium mt-6 flex items-center justify-center gap-2">
        <span>© 2026 e-Amaran Kehadiran</span>
        <span>•</span>
        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          BY CIKGU XIE
        </span>
      </footer>
    </div>
  );
};
