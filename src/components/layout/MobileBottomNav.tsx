import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppView } from './Sidebar';
import {
  Home,
  ClipboardList,
  BellRing,
  GraduationCap,
  BarChart3,
  FileSpreadsheet,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  onOpenMenu: () => void;
  pendingWarningsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenMenu,
  pendingWarningsCount = 0,
}) => {
  const { role } = useAuth();

  if (role === 'teacher') {
    const teacherTabs: { id: AppView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
      { id: 'teacher_dashboard', label: 'Dashboard', icon: Home },
      { id: 'teacher_attendance', label: 'Kehadiran', icon: ClipboardList },
      {
        id: 'teacher_warnings',
        label: 'Tindakan',
        icon: BellRing,
        badge: pendingWarningsCount > 0 ? pendingWarningsCount : undefined,
      },
      { id: 'teacher_students', label: 'Murid', icon: GraduationCap },
      { id: 'teacher_reports', label: 'Laporan', icon: BarChart3 },
    ];

    return (
      <nav
        aria-label="Navigasi Mudah Alih Guru"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden shadow-lg safe-area-bottom"
      >
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-1">
          {teacherTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`btn-bottom-nav-${tab.id}`}
                onClick={() => onSelectView(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1 transition select-none ${
                  isActive ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight leading-none whitespace-nowrap truncate max-w-[60px]">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Pentadbir (Admin) Mobile Bottom Bar
  const adminTabs: { id: AppView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'admin_dashboard', label: 'Utama', icon: Home },
    {
      id: 'admin_warnings',
      label: 'Amaran',
      icon: BellRing,
      badge: pendingWarningsCount > 0 ? pendingWarningsCount : undefined,
    },
    { id: 'admin_students', label: 'Murid', icon: GraduationCap },
    { id: 'admin_import', label: 'Import', icon: FileSpreadsheet },
  ];

  return (
    <nav
      aria-label="Navigasi Mudah Alih Pentadbir"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden shadow-lg safe-area-bottom"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-1">
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`btn-bottom-nav-${tab.id}`}
              onClick={() => onSelectView(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition select-none ${
                isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-none whitespace-nowrap truncate max-w-[60px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-emerald-600" />
              )}
            </button>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <button
          type="button"
          id="btn-bottom-nav-menu"
          onClick={onOpenMenu}
          className="relative flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 transition select-none"
        >
          <Menu className="w-5 h-5 stroke-2" />
          <span className="text-[10px] tracking-tight leading-none whitespace-nowrap">Semua</span>
        </button>
      </div>
    </nav>
  );
};
