import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  GraduationCap,
  School,
  ClipboardList,
  BellRing,
  Users,
  BarChart3,
  FileSpreadsheet,
  Settings,
  History,
  RefreshCw,
  X,
} from 'lucide-react';

export type AdminView =
  | 'admin_dashboard'
  | 'admin_students'
  | 'admin_classes'
  | 'admin_attendance'
  | 'admin_warnings'
  | 'admin_teachers'
  | 'admin_reports'
  | 'admin_import'
  | 'admin_settings'
  | 'admin_audit';

export type TeacherView =
  | 'teacher_dashboard'
  | 'teacher_students'
  | 'teacher_attendance'
  | 'teacher_warnings'
  | 'teacher_reports';

export type AppView = AdminView | TeacherView;

interface SidebarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  pendingWarningsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingWarningsCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { role, switchUserRole } = useAuth();

  const adminNavItems: { id: AdminView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'admin_dashboard', label: 'Dashboard', icon: Home },
    { id: 'admin_students', label: 'Senarai Murid', icon: GraduationCap },
    { id: 'admin_classes', label: 'Pengurusan Kelas', icon: School },
    { id: 'admin_attendance', label: 'Rekod Kehadiran', icon: ClipboardList },
    {
      id: 'admin_warnings',
      label: 'Tindakan Amaran',
      icon: BellRing,
      badge: pendingWarningsCount > 0 ? pendingWarningsCount : undefined,
    },
    { id: 'admin_teachers', label: 'Pengurusan Guru', icon: Users },
    { id: 'admin_reports', label: 'Laporan & Statistik', icon: BarChart3 },
    { id: 'admin_import', label: 'Import Data (Excel)', icon: FileSpreadsheet },
    { id: 'admin_settings', label: 'Tetapan Sistem', icon: Settings },
    { id: 'admin_audit', label: 'Audit Trail', icon: History },
  ];

  const teacherNavItems: { id: TeacherView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'teacher_dashboard', label: 'Dashboard Kelas', icon: Home },
    { id: 'teacher_attendance', label: 'Rekod Kehadiran', icon: ClipboardList },
    {
      id: 'teacher_warnings',
      label: 'Perlu Tindakan',
      icon: BellRing,
      badge: pendingWarningsCount > 0 ? pendingWarningsCount : undefined,
    },
    { id: 'teacher_students', label: 'Senarai Murid', icon: GraduationCap },
    { id: 'teacher_reports', label: 'Laporan Kelas', icon: BarChart3 },
  ];

  const items = role === 'admin' ? adminNavItems : teacherNavItems;

  const handleItemClick = (id: AppView) => {
    onSelectView(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="flex flex-col justify-between h-full">
      <div className="p-4 space-y-4 sm:space-y-6">
        {/* Mobile Header with Close Button */}
        {isMobile && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-sm">
                eA
              </div>
              <span className="font-bold text-slate-800 text-sm">Menu Navigasi</span>
            </div>
            <button
              type="button"
              id="btn-close-mobile-menu"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Role Banner: Clean - Only "ADMIN / PENTADBIR" and "GURU KELAS" (No 1 AF or class codes) */}
        <div className="px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>{role === 'admin' ? 'PANEL PENTADBIR' : 'PORTAL GURU KELAS'}</span>
            <span
              className={`w-2 h-2 rounded-full ${role === 'admin' ? 'bg-emerald-500' : 'bg-blue-500'}`}
            ></span>
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-0.5">
            {role === 'admin' ? 'Akses Penuh Pentadbir' : 'Akses Guru Kelas'}
          </div>

          <button
            type="button"
            id="btn-sidebar-switch-role"
            onClick={() => switchUserRole(role === 'admin' ? 'teacher' : 'admin')}
            className="mt-2.5 w-full py-2 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1.5 transition shadow-2xs touch-manipulation"
            title="Tukar peranan pengguna: ADMIN / PENTADBIR atau GURU KELAS"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Tukar ke {role === 'admin' ? 'GURU KELAS' : 'ADMIN / PENTADBIR'}</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`btn-nav-${item.id}`}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition touch-manipulation ${
                  isActive
                    ? role === 'admin'
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                      : 'bg-blue-50 text-blue-800 font-bold border border-blue-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? role === 'admin'
                          ? 'text-emerald-700'
                          : 'text-blue-700'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info in Sidebar */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="text-[11px] text-slate-500">
          <p className="font-semibold text-slate-700">Versi 2.6 (idMe / MOEIS Ready)</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Responsif Telefon, Tablet & Komputer</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on lg screens and up) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)]">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-over Drawer (visible when isMobileOpen is true on mobile & tablet) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
