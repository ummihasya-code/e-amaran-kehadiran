import React, { useState } from 'react';
import {
  AttendanceRecord,
  AttendanceSettings,
  SchoolClass,
  Student,
  StudentWarningStatus,
  WarningLetter,
  WarningType,
} from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StudentProfileModal } from '../../components/attendance/StudentProfileModal';
import { RecordWarningModal } from '../../components/attendance/RecordWarningModal';
import { DataExportModal } from '../../components/common/DataExportModal';
import { formatDateDisplay } from '../../utils/dateUtils';
import { sortSchoolClasses } from '../../utils/classOrder';
import {
  BellRing,
  Search,
  Filter,
  Eye,
  FileCheck2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';

interface AdminWarningsProps {
  studentStatuses: StudentWarningStatus[];
  attendance: AttendanceRecord[];
  classes: SchoolClass[];
  settings: AttendanceSettings;
  students?: Student[];
  warnings?: WarningLetter[];
  onRefreshData: () => void;
}

export const AdminWarnings: React.FC<AdminWarningsProps> = ({
  studentStatuses,
  attendance,
  classes,
  settings,
  students = [],
  warnings = [],
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('NEED_ACTION');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const [inspectingStatus, setInspectingStatus] = useState<StudentWarningStatus | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<{
    status: StudentWarningStatus;
    type: WarningType;
  } | null>(null);

  const filteredStatuses = studentStatuses.filter((s) => {
    if (selectedClass !== 'ALL' && s.student.className !== selectedClass) return false;

    if (filterAction === 'NEED_ACTION') {
      const isAction =
        s.status === 'warning1_needed' ||
        s.status === 'warning2_needed' ||
        s.status === 'warning3_needed' ||
        s.status === 'expulsion_needed';
      if (!isAction) return false;
    } else if (filterAction === 'EXPULSION') {
      if (s.status !== 'expulsion_needed') return false;
    } else if (filterAction === 'WARNING1') {
      if (s.status !== 'warning1_needed' && s.status !== 'warning1_issued') return false;
    } else if (filterAction === 'WARNING2') {
      if (s.status !== 'warning2_needed' && s.status !== 'warning2_issued') return false;
    } else if (filterAction === 'WARNING3') {
      if (s.status !== 'warning3_needed' && s.status !== 'warning3_issued') return false;
    } else if (filterAction === 'ISSUED') {
      const hasAnyIssued = Boolean(s.warning1 || s.warning2 || s.warning3);
      if (!hasAnyIssued) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.student.name.toLowerCase().includes(q);
      const matchClass = s.student.className.toLowerCase().includes(q);
      if (!matchName && !matchClass) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Tindakan & Pengurusan Surat Amaran
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Senarai murid yang telah melepasi ambang ketidakhadiran dan memerlukan tindakan pengeluaran surat amaran
          </p>
        </div>

        <button
          type="button"
          id="btn-open-export-warnings"
          onClick={() => setIsExportModalOpen(true)}
          className="px-3.5 py-2 text-xs font-bold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs flex items-center gap-2 transition self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Eksport Data (CSV / Google Sheets)</span>
        </button>
      </div>

      {/* Notis Penting KPM / idMe */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold block mb-0.5">Prosedur Surat Rasmi:</strong>
          Sistem e-AMARAN berfungsi sebagai instrumen audit dan pemberitahuan pintar. Surat rasmi (Amaran 1, Amaran 2, Amaran 3) dijana melalui sistem rasmi KPM seperti{' '}
          <strong>idMe</strong> atau <strong>MOEIS</strong>. Pihak pentadbir atau guru kelas merekodkan tarikh surat dikeluarkan di sini untuk melengkapkan kitaran pemantauan.
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari murid atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Kelas ({classes.length})</option>
              {sortSchoolClasses(classes).map((c) => (
                <option key={c.id} value={c.className}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="NEED_ACTION">🔴 Perlu Tindakan Segera Sahaja</option>
              <option value="EXPULSION">⚠️ Tindakan Buang Sekolah (Alert)</option>
              <option value="ALL">Semua Murid</option>
              <option value="WARNING1">Peringkat Amaran 1</option>
              <option value="WARNING2">Peringkat Amaran 2</option>
              <option value="WARNING3">Peringkat Amaran 3 (Terakhir)</option>
              <option value="ISSUED">🟢 Telah Dikeluarkan Surat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pengurusan Surat Amaran: Responsif Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredStatuses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <span>Tiada rekod murid dijumpai bagi kriteria tapisan ini.</span>
            </div>
          ) : (
            filteredStatuses.map((item) => {
              const isExpulsion = item.status === 'expulsion_needed';
              const needsAction =
                item.status === 'warning1_needed' ||
                item.status === 'warning2_needed' ||
                item.status === 'warning3_needed';

              const currentNeededType: WarningType =
                item.status === 'warning1_needed'
                  ? 'warning1'
                  : item.status === 'warning2_needed'
                  ? 'warning2'
                  : 'warning3';

              return (
                <div
                  key={item.student.id}
                  className={`p-4 space-y-3 transition ${
                    isExpulsion ? 'bg-purple-50/30' : needsAction ? 'bg-rose-50/25' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{item.student.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {item.student.className}
                        </span>
                        <span>{item.student.studentNumber || 'ID: ' + item.student.id.substring(0, 8)}</span>
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] text-slate-500">Jumlah TH</div>
                      <div className="font-bold text-slate-800">{item.totalAbsences}h</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60">
                      <div className="text-[10px] text-emerald-700">Surat Dr</div>
                      <div className="font-bold text-emerald-700">{item.doctorLetterCount}h</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200">
                      <div className="text-[10px] text-rose-600 font-medium">Kiraan Amaran</div>
                      <div className="font-black text-rose-700">{item.eligibleAbsences}h</div>
                    </div>
                  </div>

                  {/* Rekod Surat A1, A2, A3 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-slate-500 text-[11px] font-medium">Status Surat:</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          item.warning1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        A1: {item.warning1 ? 'Ya' : 'Belum'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          item.warning2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        A2: {item.warning2 ? 'Ya' : 'Belum'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          item.warning3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        A3: {item.warning3 ? 'Ya' : 'Belum'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {needsAction && (
                      <button
                        type="button"
                        onClick={() =>
                          setRecordingTarget({
                            status: item,
                            type: currentNeededType,
                          })
                        }
                        className="flex-1 py-2 px-3 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-2xs transition flex items-center justify-center gap-1.5 touch-manipulation"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>REKOD SURAT</span>
                      </button>
                    )}
                    {isExpulsion && (
                      <button
                        type="button"
                        onClick={() => setInspectingStatus(item)}
                        className="flex-1 py-2 px-3 text-xs font-bold rounded-xl text-white bg-purple-700 hover:bg-purple-800 shadow-2xs transition flex items-center justify-center gap-1.5 touch-manipulation"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>KES DISIPLIN</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setInspectingStatus(item)}
                      className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition flex items-center justify-center gap-1 touch-manipulation"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Profil</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Murid</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jumlah Hari</th>
                <th className="py-3 px-4">Surat Doktor</th>
                <th className="py-3 px-4">Hari Dikira</th>
                <th className="py-3 px-4">Status Tindakan</th>
                <th className="py-3 px-4">Rekod Surat</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStatuses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <span>Tiada rekod murid dijumpai bagi kriteria tapisan ini.</span>
                  </td>
                </tr>
              ) : (
                filteredStatuses.map((item) => {
                  const isExpulsion = item.status === 'expulsion_needed';
                  const needsAction =
                    item.status === 'warning1_needed' ||
                    item.status === 'warning2_needed' ||
                    item.status === 'warning3_needed';

                  const currentNeededType: WarningType =
                    item.status === 'warning1_needed'
                      ? 'warning1'
                      : item.status === 'warning2_needed'
                      ? 'warning2'
                      : 'warning3';

                  return (
                    <tr
                      key={item.student.id}
                      className={`hover:bg-slate-50 transition ${
                        isExpulsion
                          ? 'bg-purple-50/40'
                          : needsAction
                          ? 'bg-rose-50/25'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.student.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.student.studentNumber || 'ID: ' + item.student.id.substring(0, 10)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {item.student.className}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {item.totalAbsences} hari
                      </td>
                      <td className="py-3 px-4 font-medium text-emerald-700">
                        {item.doctorLetterCount} hari
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                          {item.eligibleAbsences} hari
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              item.warning1
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={item.warning1 ? `Amaran 1: ${item.warning1.issueDate}` : 'Belum'}
                          >
                            A1
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              item.warning2
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={item.warning2 ? `Amaran 2: ${item.warning2.issueDate}` : 'Belum'}
                          >
                            A2
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              item.warning3
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={item.warning3 ? `Amaran 3: ${item.warning3.issueDate}` : 'Belum'}
                          >
                            A3
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isExpulsion && (
                            <button
                              type="button"
                              onClick={() => setInspectingStatus(item)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg text-white bg-purple-700 hover:bg-purple-800 shadow-2xs transition flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Kes Disiplin</span>
                            </button>
                          )}
                          {needsAction && (
                            <button
                              type="button"
                              onClick={() =>
                                setRecordingTarget({
                                  status: item,
                                  type: currentNeededType,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow-2xs transition flex items-center gap-1"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Rekod Surat</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setInspectingStatus(item)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Profil</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Profil Murid & Kad Surat Amaran */}
      {inspectingStatus && (
        <StudentProfileModal
          isOpen={Boolean(inspectingStatus)}
          onClose={() => setInspectingStatus(null)}
          statusData={inspectingStatus}
          attendanceRecords={attendance}
          onDataChanged={onRefreshData}
        />
      )}

      {/* Modal Merekod Tarikh Surat Amaran */}
      {recordingTarget && (
        <RecordWarningModal
          isOpen={Boolean(recordingTarget)}
          onClose={() => setRecordingTarget(null)}
          student={recordingTarget.status.student}
          warningType={recordingTarget.type}
          onSaved={onRefreshData}
        />
      )}

      {/* Modal Eksport Data (CSV & Google Sheets) */}
      <DataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        studentStatuses={studentStatuses}
        attendance={attendance}
        warnings={warnings}
        classes={classes}
        initialDataset="student_warnings_master"
        defaultClass={selectedClass}
      />
    </div>
  );
};
