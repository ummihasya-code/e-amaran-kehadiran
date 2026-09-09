import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  Shield,
  GraduationCap,
  ChevronDown,
  Check,
  User as UserIcon,
  Menu,
} from 'lucide-react';
import { UserRole, User } from '../../types';

interface NavbarProps {
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const {
    user,
    role,
    isCloudConnected,
    firebaseUser,
    loginWithGoogle,
    logout,
    switchUserRole,
    switchUserAccount,
    availableAccounts,
    hasMultipleRoles,
  } = useAuth();
  const { showToast } = useToast();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown apabila klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGoogleConnect = async () => {
    try {
      await loginWithGoogle();
      showToast('✅ Berjaya bersambung ke Firebase Awan.', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal log masuk Google atau dibatalkan.', 'warning');
    }
  };

  const handleSwitchRole = async (targetRole: UserRole) => {
    try {
      await switchUserRole(targetRole);
      setIsRoleDropdownOpen(false);
      showToast(
        `✅ Peranan ditukar ke ${targetRole === 'admin' ? 'Pentadbir Sekolah (Admin)' : 'Guru Kelas'}.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal menukar peranan.', 'error');
    }
  };

  const handleSwitchAccount = async (targetAccount: User) => {
    try {
      await switchUserAccount(targetAccount);
      setIsRoleDropdownOpen(false);
      showToast(
        `✅ Berjaya beralih ke akaun: ${targetAccount.name} (${targetAccount.role === 'admin' ? 'Admin' : 'Guru Kelas'}).`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal menukar akaun.', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo + Mobile Hamburger Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenMobileMenu && (
            <button
              type="button"
              id="btn-open-mobile-menu"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="Buka Menu Navigasi"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm shrink-0">
            eA
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                e-AMARAN KEHADIRAN
              </h1>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap">
                KPM/idMe
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              Sistem Pemantauan Ketidakhadiran & Rekod Surat Amaran Murid
            </p>
          </div>
        </div>

        {/* Right side: Cloud Sync Status + Quick Role Switcher + User Info + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Cloud Sync Status / Connect Button */}
          {isCloudConnected ? (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800"
              title={`Disegerakkan ke Firestore (${firebaseUser?.email})`}
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">Awan Aktif</span>
            </div>
          ) : (
            <button
              onClick={handleGoogleConnect}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[11px] font-semibold text-amber-900 transition shadow-2xs"
              title="Klik untuk log masuk Google dan menyegerakkan terus ke Firestore Awan"
            >
              <CloudOff className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Log Masuk Google</span>
              <span className="sm:hidden text-[10px]">Awan</span>
            </button>
          )}

          {/* ========================================================================= */}
          {/* BUTANG TUKAR PENGGUNA / PERANAN: "ADMIN / PENTADBIR" <-> "GURU KELAS" */}
          {/* ========================================================================= */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="btn-switch-user-role"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold transition shadow-2xs"
              title="Tukar peranan pengguna: ADMIN / PENTADBIR atau GURU KELAS"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">
                {role === 'admin' ? 'ADMIN / Pentadbir' : 'Guru Kelas'}
              </span>
              <span className="sm:hidden text-[11px] font-bold">
                {role === 'admin' ? 'ADMIN' : 'GURU'}
              </span>
              <ChevronDown className="w-3 h-3 text-indigo-500 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tukar Peranan Pengguna
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 truncate">
                    Emel: <strong className="text-slate-800">{user?.email || 'Tiada emel'}</strong>
                  </div>
                </div>

                {/* Senarai Akaun Sedia Ada Berdaftar Dengan Emel Ini */}
                {availableAccounts.length > 1 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Akaun Berdaftar ({availableAccounts.length}):
                    </div>
                    <div className="space-y-1.5">
                      {availableAccounts.map((acc) => {
                        const isActive = user?.id === acc.id || user?.role === acc.role;
                        return (
                          <button
                            key={acc.id}
                            onClick={() => handleSwitchAccount(acc)}
                            className={`w-full text-left p-2 rounded-xl border text-xs transition flex items-center justify-between ${
                              isActive
                                ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {acc.role === 'admin' ? (
                                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                              )}
                              <div>
                                <div className="font-semibold text-slate-900 truncate">{acc.name}</div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {acc.role === 'admin' ? '👑 Pentadbir (ADMIN)' : '👨‍🏫 Guru Kelas'}
                                </div>
                              </div>
                            </div>
                            {isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pilihan Pantas Tukar Peranan: ADMIN / PENTADBIR vs GURU KELAS */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Pilih Peranan Aktif:
                  </div>

                  {/* Button ADMIN / PENTADBIR */}
                  <button
                    onClick={() => handleSwitchRole('admin')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition ${
                      role === 'admin'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className={`w-4 h-4 shrink-0 ${role === 'admin' ? 'text-white' : 'text-emerald-600'}`} />
                      <div className="text-left">
                        <div className="font-bold leading-tight">ADMIN / PENTADBIR</div>
                        <div className={`text-[10px] leading-tight mt-0.5 ${role === 'admin' ? 'text-emerald-100' : 'text-slate-500'}`}>
                          Akses penuh pentadbiran sekolah & import data
                        </div>
                      </div>
                    </div>
                    {role === 'admin' && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>

                  {/* Button GURU KELAS */}
                  <button
                    onClick={() => handleSwitchRole('teacher')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition ${
                      role === 'teacher'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className={`w-4 h-4 shrink-0 ${role === 'teacher' ? 'text-white' : 'text-blue-600'}`} />
                      <div className="text-left">
                        <div className="font-bold leading-tight">GURU KELAS</div>
                        <div className={`text-[10px] leading-tight mt-0.5 ${role === 'teacher' ? 'text-blue-100' : 'text-slate-500'}`}>
                          Pengurusan kehadiran harian & surat amaran murid
                        </div>
                      </div>
                    </div>
                    {role === 'teacher' && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                  Pertukaran peranan serta-merta tanpa perlu log keluar.
                </div>
              </div>
            )}
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{user?.name}</div>
              <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 font-medium">
                {role === 'admin' ? (
                  <span className="text-emerald-700">Pentadbir (ADMIN)</span>
                ) : (
                  <span className="text-blue-700">Guru Kelas</span>
                )}
              </div>
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                role === 'admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}
              title={`${user?.name} (${role === 'admin' ? 'ADMIN' : 'GURU KELAS'})`}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => logout()}
            title="Log Keluar"
            className="p-1.5 sm:p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
