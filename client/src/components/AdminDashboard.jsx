import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, QrCode, Clock, Plus, 
  Settings, Key, Check, AlertCircle, ToggleLeft, ToggleRight, Trash2, Edit3, Tv 
} from 'lucide-react';
import { getStats, getSessions, updateSession, deleteSession, changePin, getAttendances } from '../api';
import QRCodeCustomizer from './QRCodeCustomizer';
import AttendanceTable from './AttendanceTable';
import ManualCheckInModal from './ManualCheckInModal';

export default function AdminDashboard({ onOpenProjector, latestAttendee }) {
  const [subTab, setSubTab] = useState('overview'); // 'overview' | 'qr_customizer' | 'attendance' | 'settings'
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    todayAttendances: 0,
    totalUniqueAttendees: 0,
    recentAttendances: []
  });
  const [sessions, setSessions] = useState([]);
  const [activeCustomSession, setActiveCustomSession] = useState(null);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('all');
  const [attendances, setAttendances] = useState([]);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // Settings State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [pinError, setPinError] = useState('');

  const loadData = async () => {
    try {
      const [statsData, sessionsData] = await Promise.all([
        getStats(),
        getSessions()
      ]);
      setStats(statsData);
      setSessions(sessionsData);
      if (sessionsData.length > 0 && !activeCustomSession) {
        setActiveCustomSession(sessionsData[0]);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  const loadAttendances = async () => {
    try {
      const data = await getAttendances();
      setAttendances(data);
    } catch (err) {
      console.error('Error loading attendances:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadAttendances();
  }, []);

  // Update real-time state when new attendee arrives via SSE
  useEffect(() => {
    if (latestAttendee) {
      loadData();
      loadAttendances();
    }
  }, [latestAttendee]);

  const handleToggleSessionStatus = async (session) => {
    try {
      await updateSession(session.id, { is_active: session.is_active ? 0 : 1 });
      loadData();
    } catch (err) {
      alert('Gagal mengubah status sesi: ' + err.message);
    }
  };

  const handleDeleteSession = async (session) => {
    if (window.confirm(`Hapus sesi "${session.title}" beserta seluruh data absensinya?`)) {
      try {
        await deleteSession(session.id);
        if (activeCustomSession?.id === session.id) {
          setActiveCustomSession(null);
        }
        loadData();
        loadAttendances();
      } catch (err) {
        alert('Gagal menghapus sesi: ' + err.message);
      }
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinMessage('');
    setPinError('');
    try {
      const res = await changePin(currentPin, newPin);
      if (res.success) {
        setPinMessage('PIN admin berhasil diperbarui!');
        setCurrentPin('');
        setNewPin('');
      } else {
        setPinError(res.message || 'Gagal mengganti PIN');
      }
    } catch (err) {
      setPinError(err.message || 'Gagal mengganti PIN');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Subtabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              subTab === 'overview'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ikhtisar & Metrik
          </button>

          <button
            onClick={() => setSubTab('qr_customizer')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              subTab === 'qr_customizer'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kustomisasi & Kelola QR
          </button>

          <button
            onClick={() => setSubTab('attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              subTab === 'attendance'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rekap Absensi
          </button>

          <button
            onClick={() => setSubTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              subTab === 'settings'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pengaturan
          </button>
        </div>

        <button
          onClick={() => {
            setActiveCustomSession(null);
            setSubTab('qr_customizer');
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Sesi & QR Baru</span>
        </button>
      </div>

      {/* --- TAB 1: OVERVIEW & STATS --- */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{stats.todayAttendances}</div>
                <div className="text-xs font-medium text-slate-500">Hadir Hari Ini</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{stats.activeSessions}</div>
                <div className="text-xs font-medium text-slate-500">Sesi Aktif</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{stats.totalUniqueAttendees}</div>
                <div className="text-xs font-medium text-slate-500">Total Peserta Unik</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{stats.totalSessions}</div>
                <div className="text-xs font-medium text-slate-500">Total Semua Sesi</div>
              </div>
            </div>
          </div>

          {/* Active Sessions Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                Daftar Sesi Absensi Aktif
              </h3>
              <span className="text-xs text-slate-500">{sessions.length} Sesi Terdaftar</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map(s => (
                <div 
                  key={s.id} 
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    s.is_active 
                      ? 'border-slate-200 bg-slate-50/50 hover:border-indigo-300' 
                      : 'border-slate-200/60 bg-slate-50/20 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {s.code}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {s.is_active ? 'Terbuka' : 'Ditutup'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{s.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{s.description || 'Tidak ada keterangan'}</p>
                    
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/60 pt-2">
                      <span>Tanggal: {s.date}</span>
                      <span className="font-semibold text-indigo-600">{s.attendee_count || 0} Hadir</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-1">
                    <button
                      onClick={() => {
                        setActiveCustomSession(s);
                        setSubTab('qr_customizer');
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Atur QR</span>
                    </button>

                    <button
                      onClick={() => onOpenProjector(s)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center space-x-1"
                    >
                      <Tv className="w-3.5 h-3.5 text-blue-600" />
                      <span>Proyektor</span>
                    </button>

                    <button
                      onClick={() => handleToggleSessionStatus(s)}
                      className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      title={s.is_active ? 'Tutup Sesi' : 'Buka Kembali Sesi'}
                    >
                      {s.is_active ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                    </button>

                    <button
                      onClick={() => handleDeleteSession(s)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent 6 Attendances Quick Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                Aktivitas Absensi Terkini
              </h3>
              <button
                onClick={() => setSubTab('attendance')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Lihat Semua Rekap &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {stats.recentAttendances.length > 0 ? (
                stats.recentAttendances.map(item => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.identifier} • {item.session_title}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.timestamp}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">Belum ada aktivitas absensi terbaru.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: QR CUSTOMIZER --- */}
      {subTab === 'qr_customizer' && (
        <QRCodeCustomizer
          activeSession={activeCustomSession}
          onSessionCreated={(newOrUpdated) => {
            setActiveCustomSession(newOrUpdated);
            loadData();
          }}
          onOpenProjector={onOpenProjector}
        />
      )}

      {/* --- TAB 3: ATTENDANCE RECORDS --- */}
      {subTab === 'attendance' && (
        <AttendanceTable
          attendances={attendances}
          sessions={sessions}
          selectedSessionId={selectedSessionFilter}
          onSessionFilterChange={setSelectedSessionFilter}
          onRefresh={loadAttendances}
          onOpenManualModal={() => setManualModalOpen(true)}
          latestAttendeeId={latestAttendee?.id}
        />
      )}

      {/* --- TAB 4: SETTINGS --- */}
      {subTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <span>Pengaturan Admin & Keamanan</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ganti PIN pengaman admin dashboard untuk mencegah akses peserta yang tidak diinginkan
            </p>
          </div>

          <form onSubmit={handleChangePin} className="space-y-4 pt-2">
            {pinMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pinMessage}</span>
              </div>
            )}

            {pinError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">PIN Admin Saat Ini</label>
              <input
                type="password"
                required
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Masukkan PIN saat ini (default: admin123)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">PIN Admin Baru</label>
              <input
                type="password"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Masukkan PIN baru (minimal 4 karakter)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center space-x-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Simpan Perubahan PIN</span>
            </button>
          </form>

          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Informasi Jaringan & Penggunaan di HP
            </h4>
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-2 border border-slate-200/60 leading-relaxed">
              <p>
                • <strong>Akses dari Smartphone dalam WiFi yang sama:</strong> Cari IP lokal komputer Anda (misal: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">192.168.1.X:5000</code>) dan bagikan ke peserta.
              </p>
              <p>
                • <strong>Akses Kamera Smartphone:</strong> Browser modern memerlukan origin <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">localhost</code> atau protokol <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">HTTPS</code> untuk izin webcam. Jika peserta mengakses via HTTP di IP lokal, mereka dapat menggunakan <strong>Upload Foto QR</strong> atau <strong>Input Manual Kode Sesi</strong> yang tersedia di portal user.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Check-in Modal */}
      <ManualCheckInModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        sessions={sessions}
        onSuccess={() => {
          loadData();
          loadAttendances();
        }}
      />

    </div>
  );
}
