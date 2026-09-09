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
  AlertTriangle,
  RefreshCw,
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingWarningsCount = 0,
}) => {
  const { role, user, switchUserRole } = useAuth();

  const adminNavItems: { id: AdminView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'admin_dashboard', label: 'Dashboard', icon: Home },
    { id: 'admin_students', label: 'Murid', icon: GraduationCap },
    { id: 'admin_classes', label: 'Kelas', icon: School },
    { id: 'admin_attendance', label: 'Rekod Kehadiran', icon: ClipboardList },
    {
      id: 'admin_warnings',
      label: 'Tindakan Amaran',
      icon: BellRing,
      badge: pendingWarningsCount > 0 ? pendingWarningsCount : undefined,
    },
    { id: 'admin_teachers', label: 'Guru', icon: Users },
    { id: 'admin_reports', label: 'Laporan', icon: BarChart3 },
    { id: 'admin_import', label: 'Import Data', icon: FileSpreadsheet },
    { id: 'admin_settings', label: 'Tetapan', icon: Settings },
    { id: 'admin_audit', label: 'Audit Trail', icon: History },
  ];

  const teacherNavItems: { id: TeacherView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'teacher_dashboard', label: 'Dashboard', icon: Home },
    { id: 'teacher_students', label: 'Murid', icon: GraduationCap },
    { id: 'teacher_attendance', label: 'Kehadiran', icon: ClipboardList },
    {
      id: 'teacher_warnings',
      label: 'Perlu Tindakan',
      icon: BellRing,
      badge: pendingWarningsCount > 0 ? pendingWarningsCount : undefined,
    },
    { id: 'teacher_reports', label: 'Laporan Kelas', icon: BarChart3 },
  ];

  const items = role === 'admin' ? adminNavItems : teacherNavItems;

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Role Banner */}
        <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>{role === 'admin' ? 'PANEL PENTADBIR' : 'PORTAL GURU KELAS'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-xs font-semibold text-slate-800 mt-0.5">
            {role === 'admin' ? 'Akses Penuh Pentadbir' : `Kelas: ${user?.assignedClasses[0] || '3 AA'}`}
          </div>
          <button
            onClick={() => switchUserRole(role === 'admin' ? 'teacher' : 'admin')}
            className="mt-2 w-full py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1.5 transition shadow-2xs"
            title="Tukar peranan pengguna"
          >
            <RefreshCw className="w-3 h-3 text-indigo-600" />
            <span>Tukar ke {role === 'admin' ? 'Guru Kelas' : 'Pentadbir (Admin)'}</span>
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
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'
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
          <p className="text-[10px] text-slate-400 mt-0.5">Integrasi KPM Berperingkat</p>
        </div>
      </div>
    </aside>
  );
};
