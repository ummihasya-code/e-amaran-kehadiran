import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, AppView } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Footer } from './components/layout/Footer';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminImport } from './pages/admin/AdminImport';
import { AdminAttendanceList } from './pages/admin/AdminAttendanceList';
import { AdminWarnings } from './pages/admin/AdminWarnings';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminClasses } from './pages/admin/AdminClasses';
import { AdminTeachers } from './pages/admin/AdminTeachers';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminAuditTrail } from './pages/admin/AdminAuditTrail';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherStudents } from './pages/teacher/TeacherStudents';
import { TeacherAttendance } from './pages/teacher/TeacherAttendance';
import { TeacherWarnings } from './pages/teacher/TeacherWarnings';
import { TeacherReports } from './pages/teacher/TeacherReports';
import {
  AttendanceRecord,
  AttendanceSettings,
  SchoolClass,
  Student,
  StudentWarningStatus,
  User,
  WarningLetter,
} from './types';
import { dataService } from './services/dataService';
import { calculateStudentStatuses, DEFAULT_SETTINGS } from './services/warningEngine';

const MainLayout: React.FC = () => {
  const { user, role, isLoading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<AppView>('admin_dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [warnings, setWarnings] = useState<WarningLetter[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  // Muat semua data dari DataService
  const loadAllData = useCallback(async () => {
    try {
      const [st, cl, tc, at, wn, stg] = await Promise.all([
        dataService.getStudents(),
        dataService.getClasses(),
        dataService.getUsers(),
        dataService.getAttendance(),
        dataService.getWarningLetters(),
        dataService.getSettings(),
      ]);

      setStudents(st);
      setClasses(cl);
      setTeachers(tc);
      setAttendance(at);
      setWarnings(wn);
      setSettings(stg);
    } catch (e) {
      console.error('Failed to load data: ', e);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Kemaskini paparan utama apabila peranan bertukar
  useEffect(() => {
    if (role === 'admin') {
      if (!currentView.startsWith('admin_')) {
        setCurrentView('admin_dashboard');
      }
    } else if (role === 'teacher') {
      if (!currentView.startsWith('teacher_')) {
        setCurrentView('teacher_dashboard');
      }
    }
  }, [role]);

  // Kira status amaran untuk semua murid
  const studentStatuses = calculateStudentStatuses(students, attendance, warnings, settings);

  // Kira bilangan murid yang memerlukan tindakan amaran bagi lencana menu
  const assignedClass = user?.assignedClasses[0] || '3 AA';
  const pendingWarningsCount = studentStatuses.filter((s) => {
    if (role === 'teacher' && s.student.className !== assignedClass) return false;
    return (
      s.status === 'warning1_needed' ||
      s.status === 'warning2_needed' ||
      s.status === 'warning3_needed'
    );
  }).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Memuatkan Sistem e-AMARAN...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={loadAllData} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased font-sans">
      {/* Top Navigation with Mobile Menu Trigger */}
      <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentView={currentView}
          onSelectView={(v) => setCurrentView(v)}
          pendingWarningsCount={pendingWarningsCount}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden min-w-0">
          {/* Admin Views */}
          {role === 'admin' && (
            <>
              {currentView === 'admin_dashboard' && (
                <AdminDashboard
                  students={students}
                  classes={classes}
                  attendance={attendance}
                  warnings={warnings}
                  studentStatuses={studentStatuses}
                  settings={settings}
                  onNavigate={(v) => setCurrentView(v as AppView)}
                  onRefreshData={loadAllData}
                />
              )}

              {currentView === 'admin_import' && (
                <AdminImport
                  onImportComplete={() => {
                    loadAllData();
                    setCurrentView('admin_dashboard');
                  }}
                />
              )}

              {currentView === 'admin_attendance' && (
                <AdminAttendanceList
                  attendance={attendance}
                  students={students}
                  classes={classes}
                  studentStatuses={studentStatuses}
                  warnings={warnings}
                  onRefreshData={loadAllData}
                />
              )}

              {currentView === 'admin_warnings' && (
                <AdminWarnings
                  studentStatuses={studentStatuses}
                  attendance={attendance}
                  classes={classes}
                  settings={settings}
                  students={students}
                  warnings={warnings}
                  onRefreshData={loadAllData}
                />
              )}

              {currentView === 'admin_students' && (
                <AdminStudents
                  students={students}
                  classes={classes}
                  attendance={attendance}
                  studentStatuses={studentStatuses}
                  warnings={warnings}
                  onRefreshData={loadAllData}
                  onNavigate={(v) => setCurrentView(v as AppView)}
                />
              )}

              {currentView === 'admin_classes' && (
                <AdminClasses
                  classes={classes}
                  students={students}
                  attendance={attendance}
                  teachers={teachers}
                  onRefreshData={loadAllData}
                  onNavigate={(v) => setCurrentView(v as AppView)}
                />
              )}

              {currentView === 'admin_teachers' && (
                <AdminTeachers
                  teachers={teachers}
                  classes={classes}
                  onRefreshData={loadAllData}
                />
              )}

              {currentView === 'admin_reports' && (
                <AdminReports
                  students={students}
                  classes={classes}
                  attendance={attendance}
                  warnings={warnings}
                  studentStatuses={studentStatuses}
                />
              )}

              {currentView === 'admin_settings' && (
                <AdminSettings settings={settings} onRefreshData={loadAllData} />
              )}

              {currentView === 'admin_audit' && <AdminAuditTrail />}
            </>
          )}

          {/* Teacher Views */}
          {role === 'teacher' && (
            <>
              {currentView === 'teacher_dashboard' && (
                <TeacherDashboard
                  students={students}
                  attendance={attendance}
                  warnings={warnings}
                  studentStatuses={studentStatuses}
                  settings={settings}
                  onRefreshData={loadAllData}
                  onNavigate={(v) => setCurrentView(v as AppView)}
                />
              )}

              {currentView === 'teacher_students' && (
                <TeacherStudents
                  students={students}
                  attendance={attendance}
                  studentStatuses={studentStatuses}
                  onRefreshData={loadAllData}
                />
              )}

              {currentView === 'teacher_attendance' && (
                <TeacherAttendance attendance={attendance} students={students} />
              )}

              {currentView === 'teacher_warnings' && (
                <TeacherWarnings
                  studentStatuses={studentStatuses}
                  attendance={attendance}
                  settings={settings}
                  students={students}
                  warnings={warnings}
                  classes={classes}
                  onRefreshData={loadAllData}
                />
              )}

              {currentView === 'teacher_reports' && (
                <TeacherReports
                  students={students}
                  attendance={attendance}
                  studentStatuses={studentStatuses}
                  warnings={warnings}
                  classes={classes}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer with Trademark */}
      <Footer />

      {/* Mobile Bottom Navigation for Quick Thumb Access (Smart per Role) */}
      <MobileBottomNav
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        pendingWarningsCount={pendingWarningsCount}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  );
}
