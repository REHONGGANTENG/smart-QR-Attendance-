import React, { useState } from 'react';
import { 
  Search, Download, UserPlus, Trash2, Filter, 
  Clock, CheckCircle2, AlertTriangle, Calendar, FileSpreadsheet, RefreshCw 
} from 'lucide-react';
import { getExportUrl, deleteAttendance } from '../api';

export default function AttendanceTable({ 
  attendances = [], 
  sessions = [], 
  selectedSessionId, 
  onSessionFilterChange, 
  onRefresh, 
  onOpenManualModal,
  latestAttendeeId 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Filter records locally
  const filteredRecords = attendances.filter(record => {
    if (selectedSessionId && selectedSessionId !== 'all') {
      if (String(record.session_id) !== String(selectedSessionId)) return false;
    }
    if (statusFilter !== 'all') {
      if (record.status !== statusFilter) return false;
    }
    if (dateFilter) {
      if (!record.timestamp.startsWith(dateFilter)) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = record.name?.toLowerCase().includes(term);
      const matchId = record.identifier?.toLowerCase().includes(term);
      const matchDept = record.department?.toLowerCase().includes(term);
      if (!matchName && !matchId && !matchDept) return false;
    }
    return true;
  });

  const handleDelete = async (id, name) => {
    if (window.confirm(`Hapus data absensi atas nama "${name}"?`)) {
      try {
        setDeletingId(id);
        await deleteAttendance(id);
        onRefresh();
      } catch (err) {
        alert(err.message || 'Gagal menghapus data');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Tepat Waktu':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Tepat Waktu
          </span>
        );
      case 'Terlambat':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Terlambat
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Hadir
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header bar */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>Rekapitulasi Kehadiran Peserta</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {filteredRecords.length} Data
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data absensi terupdate otomatis secara real-time dari pemindaian scanner peserta
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Muat Ulang Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenManualModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Input Manual</span>
            </button>

            <a
              href={getExportUrl(selectedSessionId)}
              download
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV / Excel</span>
            </a>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, NIM, atau kelas..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Session filter */}
          <select
            value={selectedSessionId || 'all'}
            onChange={(e) => onSessionFilterChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
          >
            <option value="all">Semua Sesi Absensi</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.title}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
          >
            <option value="all">Semua Status</option>
            <option value="Tepat Waktu">Tepat Waktu</option>
            <option value="Terlambat">Terlambat</option>
            <option value="Hadir">Hadir</option>
          </select>

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4 w-12 text-center">No</th>
              <th className="py-3 px-4">Nama Peserta</th>
              <th className="py-3 px-4">Identitas (NIM/NIK)</th>
              <th className="py-3 px-4">Sesi</th>
              <th className="py-3 px-4">Departemen/Kelas</th>
              <th className="py-3 px-4">Waktu Hadir</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Catatan</th>
              <th className="py-3 px-4 text-center w-16">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((row, idx) => {
                const isRecentlyAdded = latestAttendeeId === row.id;
                return (
                  <tr 
                    key={row.id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isRecentlyAdded ? 'bg-emerald-50/80 animate-pulse' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{row.name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                      {row.identifier}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-semibold">
                        {row.session_code || ''}
                      </span>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]" title={row.session_title}>
                        {row.session_title}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.department || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{row.timestamp}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic max-w-[150px] truncate" title={row.notes}>
                      {row.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(row.id, row.name)}
                        disabled={deletingId === row.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus data kehadiran ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-600">Belum ada catatan kehadiran</p>
                    <p className="text-xs text-slate-400">
                      Data akan muncul otomatis saat peserta melakukan scan atau dimasukkan manual
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
