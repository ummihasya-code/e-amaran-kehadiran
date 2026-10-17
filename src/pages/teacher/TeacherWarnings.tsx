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
import { useAuth } from '../../context/AuthContext';
import { formatDateDisplay } from '../../utils/dateUtils';
import {
  BellRing,
  AlertTriangle,
  FileCheck2,
  Eye,
  Info,
  Edit3,
  CheckCircle2,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';

interface TeacherWarningsProps {
  studentStatuses: StudentWarningStatus[];
  attendance: AttendanceRecord[];
  settings: AttendanceSettings;
  students?: Student[];
  warnings?: WarningLetter[];
  classes?: SchoolClass[];
  onRefreshData: () => void;
}

export const TeacherWarnings: React.FC<TeacherWarningsProps> = ({
  studentStatuses,
  attendance,
  settings,
  students = [],
  warnings = [],
  classes = [],
  onRefreshData,
}) => {
  const { user } = useAuth();
  const assignedClass = user?.assignedClasses[0] || '3 AA';

  const [inspectingStatus, setInspectingStatus] = useState<StudentWarningStatus | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<{
    status: StudentWarningStatus;
    type: WarningType;
  } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Penapisan data: Hanya kelas guru sahaja
  const myStatuses = studentStatuses.filter((s) => s.student.className === assignedClass);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-1">
            <span>Kelas {assignedClass}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengurusan Tindakan Surat Amaran Kelas {assignedClass}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau status ketidakhadiran murid dan rekodkan tarikh surat amaran yang telah dikeluarkan melalui idMe / MOEIS
          </p>
        </div>

        <button
          type="button"
          id="btn-open-export-teacher"
          onClick={() => setIsExportModalOpen(true)}
          className="px-3.5 py-2 text-xs font-bold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Eksport (CSV / Sheets)</span>
        </button>
      </div>

      {/* Peringatan Rasmi KPM */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block mb-0.5">Panduan Guru Kelas:</strong>
          Sistem e-AMARAN mengira hari tidak hadir yang sah (mengecualikan sijil cuti sakit hospital/klinik).
          Apabila murid mencapai had ambang (cth: 10 hari bagi Amaran 1), guru kelas bertanggungjawab mengeluarkan surat rasmi di portal rasmi KPM (<strong>idMe</strong> atau <strong>MOEIS</strong>).
          Selepas surat dikeluarkan, klik butang <strong>"REKOD SURAT DIKELUARKAN"</strong> untuk merekodkan tarikh rasmi ke dalam sistem ini.
        </div>
      </div>

      {/* Pengurusan Surat Amaran: Responsif Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {myStatuses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tiada rekod amaran bagi kelas ini.
            </div>
          ) : (
            myStatuses.map((item) => {
              const isExpulsion = item.status === 'expulsion_needed';
              const needsAction =
                item.status === 'warning1_needed' ||
                item.status === 'warning2_needed' ||
                item.status === 'warning3_needed';

              const neededType: WarningType =
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
                      <div className="text-[11px] text-slate-400">
                        {item.student.studentNumber || 'ID: ' + item.student.id.substring(0, 8)}
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>

                  {/* Summary Grid */}
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

                  {/* Status Surat Amaran 1, 2, 3 */}
                  <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Amaran 1:</span>
                      {item.warning1 ? (
                        <span className="font-bold text-emerald-700">
                          {formatDateDisplay(item.warning1.issueDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Amaran 2:</span>
                      {item.warning2 ? (
                        <span className="font-bold text-emerald-700">
                          {formatDateDisplay(item.warning2.issueDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Amaran 3:</span>
                      {item.warning3 ? (
                        <span className="font-bold text-emerald-700">
                          {formatDateDisplay(item.warning3.issueDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum</span>
                      )}
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
                            type: neededType,
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
                <th className="py-3 px-4">Jumlah Tidak Hadir</th>
                <th className="py-3 px-4">Surat Doktor</th>
                <th className="py-3 px-4">Hari Dikira</th>
                <th className="py-3 px-4">Status Tindakan</th>
                <th className="py-3 px-4">Surat Amaran 1</th>
                <th className="py-3 px-4">Surat Amaran 2</th>
                <th className="py-3 px-4">Surat Amaran 3</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myStatuses.map((item) => {
                const isExpulsion = item.status === 'expulsion_needed';
                const needsAction =
                  item.status === 'warning1_needed' ||
                  item.status === 'warning2_needed' ||
                  item.status === 'warning3_needed';

                const neededType: WarningType =
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
                        ? 'bg-rose-50/30'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.student.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.student.studentNumber || 'ID: ' + item.student.id.substring(0, 8)}
                      </div>
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

                    {/* Amaran 1 */}
                    <td className="py-3 px-4">
                      {item.warning1 ? (
                        <div className="text-[11px] text-emerald-800 font-medium">
                          <span className="font-bold">Dikeluarkan:</span>{' '}
                          {formatDateDisplay(item.warning1.issueDate)}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum</span>
                      )}
                    </td>

                    {/* Amaran 2 */}
                    <td className="py-3 px-4">
                      {item.warning2 ? (
                        <div className="text-[11px] text-emerald-800 font-medium">
                          <span className="font-bold">Dikeluarkan:</span>{' '}
                          {formatDateDisplay(item.warning2.issueDate)}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum</span>
                      )}
                    </td>

                    {/* Amaran 3 */}
                    <td className="py-3 px-4">
                      {item.warning3 ? (
                        <div className="text-[11px] text-emerald-800 font-medium">
                          <span className="font-bold">Dikeluarkan:</span>{' '}
                          {formatDateDisplay(item.warning3.issueDate)}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum</span>
                      )}
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
                        {needsAction ? (
                          <button
                            type="button"
                            onClick={() =>
                              setRecordingTarget({
                                status: item,
                                type: neededType,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow-2xs transition flex items-center gap-1"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Rekod Surat</span>
                          </button>
                        ) : null}

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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Profil Murid */}
      {inspectingStatus && (
        <StudentProfileModal
          isOpen={Boolean(inspectingStatus)}
          onClose={() => setInspectingStatus(null)}
          statusData={inspectingStatus}
          attendanceRecords={attendance}
          onDataChanged={onRefreshData}
        />
      )}

      {/* Modal Rekod Surat */}
      {recordingTarget && (
        <RecordWarningModal
          isOpen={Boolean(recordingTarget)}
          onClose={() => setRecordingTarget(null)}
          student={recordingTarget.status.student}
          warningType={recordingTarget.type}
          onSaved={onRefreshData}
        />
      )}

      {/* Modal Eksport Data Kelas */}
      <DataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        studentStatuses={studentStatuses}
        attendance={attendance}
        warnings={warnings}
        classes={classes}
        initialDataset="student_warnings_master"
        defaultClass={assignedClass}
        lockClass={true}
      />
    </div>
  );
};
