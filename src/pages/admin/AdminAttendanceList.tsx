import React, { useState } from 'react';
import {
  AttendanceRecord,
  SchoolClass,
  Student,
  StudentWarningStatus,
  WarningLetter,
} from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { AddAttendanceModal } from '../../components/attendance/AddAttendanceModal';
import { EditAttendanceModal } from '../../components/attendance/EditAttendanceModal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { DataExportModal } from '../../components/common/DataExportModal';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { sortSchoolClasses } from '../../utils/classOrder';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Stethoscope,
  AlertCircle,
  FileCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface AdminAttendanceListProps {
  attendance: AttendanceRecord[];
  students: Student[];
  classes: SchoolClass[];
  studentStatuses?: StudentWarningStatus[];
  warnings?: WarningLetter[];
  onRefreshData: () => void;
}

export const AdminAttendanceList: React.FC<AdminAttendanceListProps> = ({
  attendance,
  students,
  classes,
  studentStatuses = [],
  warnings = [],
  onRefreshData,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'COUNTED' | 'DOCTOR'>('ALL');
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Filter records
  const filtered = attendance.filter((rec) => {
    if (!showDeleted && rec.isDeleted) return false;
    if (showDeleted && !rec.isDeleted) return false;

    if (selectedClass !== 'ALL' && rec.className !== selectedClass) return false;

    if (filterType === 'COUNTED' && !rec.countsTowardsWarning) return false;
    if (filterType === 'DOCTOR' && rec.countsTowardsWarning) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = rec.studentName?.toLowerCase().includes(q);
      const matchReason = rec.reason?.toLowerCase().includes(q);
      const matchDate = rec.date?.includes(q);
      if (!matchName && !matchReason && !matchDate) return false;
    }

    return true;
  });

  const handleSoftDelete = async (reason: string) => {
    if (!deletingRecordId) return;
    try {
      await dataService.softDeleteAttendance(
        deletingRecordId,
        reason,
        user ? { id: user.id, name: user.name } : undefined
      );
      showToast('✅ Rekod kehadiran berjaya dipadam secara soft-delete.', 'success');
      onRefreshData();
    } catch {
      showToast('❌ Ralat memadam rekod.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Rekod Kehadiran Keseluruhan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengurusan data ketidakhadiran, audit penukaran status dan kemasukan manual
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            id="btn-open-export-attendance"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Eksport (CSV / Sheets)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Rekod Kehadiran</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Carian */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari murid, tarikh (YYYY-MM-DD), atau sebab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Kelas */}
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

          {/* Filter Jenis Amaran */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Jenis Sebab</option>
              <option value="COUNTED">🔴 Dikira Untuk Amaran Sahaja</option>
              <option value="DOCTOR">🟢 Surat Doktor (Dikecualikan) Sahaja</option>
            </select>
          </div>
        </div>

        {/* Toggle Soft-Deleted Records for Audit */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Menunjukkan: <strong>{filtered.length}</strong> daripada {attendance.length} rekod</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
            />
            <span className={showDeleted ? 'font-bold text-rose-700' : ''}>
              Papar Rekod Dipadam (Soft Delete Audit)
            </span>
          </label>
        </div>
      </div>

      {/* Jadual Senarai Kehadiran */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Bil</th>
                <th className="py-3 px-4">Tarikh Tidak Hadir</th>
                <th className="py-3 px-4">Nama Murid</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Sebab Tidak Hadir</th>
                <th className="py-3 px-4">Kiraan Amaran</th>
                <th className="py-3 px-4 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tiada rekod kehadiran yang sepadan dengan kriteria carian.
                  </td>
                </tr>
              ) : (
                filtered.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    className={`hover:bg-slate-50 transition ${
                      rec.isDeleted
                        ? 'bg-rose-50/40 opacity-70 line-through'
                        : !rec.countsTowardsWarning
                        ? 'bg-emerald-50/15'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {formatDateDisplay(rec.date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {rec.studentName}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{rec.className}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          rec.reason === 'TIADA MAKLUMAN'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-100 font-semibold'
                        }`}
                      >
                        {rec.reason}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {rec.countsTowardsWarning ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                          🔴 Dikira
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          🟢 Tidak dikira (Surat Doktor)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {!rec.isDeleted ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingRecord(rec)}
                            title="Edit Rekod"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingRecordId(rec.id)}
                            title="Soft Delete"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-medium italic">
                          Dipadam ({rec.deleteReason || 'Soft delete'})
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Kehadiran */}
      <AddAttendanceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={onRefreshData}
      />

      {/* Modal Edit Kehadiran */}
      <EditAttendanceModal
        isOpen={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onUpdated={onRefreshData}
      />

      {/* Dialog Soft Delete */}
      <ConfirmationDialog
        isOpen={Boolean(deletingRecordId)}
        onClose={() => setDeletingRecordId(null)}
        onConfirm={handleSoftDelete}
        title="Sahkan Pemadaman Rekod (Soft Delete)"
        message="Rekod tidak akan dipadam secara kekal dari pangkalan data. Status akan ditukar kepada 'isDeleted = true' dan disimpan untuk semakan Jejak Audit."
        requireReason={true}
        confirmLabel="Padam Rekod"
        isDestructive={true}
      />

      {/* Modal Eksport Kehadiran */}
      <DataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        studentStatuses={studentStatuses}
        attendance={attendance}
        warnings={warnings}
        classes={classes}
        initialDataset="attendance_records"
        defaultClass={selectedClass}
      />
    </div>
  );
};
