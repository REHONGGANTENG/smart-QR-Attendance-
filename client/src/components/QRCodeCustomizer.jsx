import React, { useState, useEffect } from 'react';
import { 
  QrCode, Palette, Download, Printer, Copy, Check, Tv, 
  Sparkles, Sliders, Calendar, Clock, RefreshCw, AlertCircle 
} from 'lucide-react';
import { createSession, updateSession, getSessionQR } from '../api';

const COLOR_PRESETS = [
  { name: 'Classic Slate', fg: '#1e293b', bg: '#ffffff' },
  { name: 'Royal Indigo', fg: '#3730a3', bg: '#f5f3ff' },
  { name: 'Emerald Forest', fg: '#065f46', bg: '#ecfdf5' },
  { name: 'Ocean Cyan', fg: '#0369a1', bg: '#f0f9ff' },
  { name: 'Crimson Sunset', fg: '#991b1b', bg: '#fef2f2' },
  { name: 'Cyber Dark', fg: '#38bdf8', bg: '#0f172a' }
];

export default function QRCodeCustomizer({ activeSession, onSessionCreated, onOpenProjector }) {
  const [mode, setMode] = useState(activeSession ? 'edit' : 'create'); // 'create' or 'edit'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '17:00',
    qr_fg_color: '#1e293b',
    qr_bg_color: '#ffffff',
    qr_ecc: 'M'
  });

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  // Sync form with activeSession
  useEffect(() => {
    if (activeSession) {
      setFormData({
        title: activeSession.title || '',
        description: activeSession.description || '',
        date: activeSession.date || new Date().toISOString().split('T')[0],
        start_time: activeSession.start_time || '',
        end_time: activeSession.end_time || '',
        qr_fg_color: activeSession.qr_fg_color || '#1e293b',
        qr_bg_color: activeSession.qr_bg_color || '#ffffff',
        qr_ecc: activeSession.qr_ecc || 'M'
      });
      loadQrPreview(activeSession.id);
    }
  }, [activeSession]);

  const loadQrPreview = async (sessionId) => {
    try {
      const res = await getSessionQR(sessionId);
      if (res.qrDataUrl) {
        setQrDataUrl(res.qrDataUrl);
      }
    } catch (err) {
      console.error('Error loading QR preview:', err);
    }
  };

  const handlePresetSelect = (preset) => {
    setFormData(prev => ({
      ...prev,
      qr_fg_color: preset.fg,
      qr_bg_color: preset.bg
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      setMessage('Judul sesi wajib diisi!');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      if (mode === 'create' || !activeSession) {
        const created = await createSession(formData);
        setMessage('Sesi dan QR Code berhasil dibuat!');
        onSessionCreated(created);
      } else {
        const updated = await updateSession(activeSession.id, formData);
        setMessage('Pengaturan QR Code sesi berhasil disimpan!');
        onSessionCreated(updated);
      }
    } catch (err) {
      setMessage(err.message || 'Gagal menyimpan sesi');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${(activeSession?.code || 'sesi').toUpperCase()}-${activeSession?.title || 'absensi'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head>
          <title>Cetak QR Code - ${activeSession?.title || 'Absensi'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; }
            .card { max-width: 500px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h1 { margin: 0 0 8px; font-size: 24px; color: #1e293b; }
            p { margin: 0 0 16px; color: #64748b; font-size: 14px; }
            .badge { display: inline-block; padding: 6px 16px; background: #e0e7ff; color: #3730a3; font-weight: bold; border-radius: 9999px; font-size: 14px; margin-bottom: 20px; }
            img { width: 320px; height: 320px; border-radius: 8px; }
            .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${activeSession?.title || 'Smart QR Attendance'}</h1>
            <p>${activeSession?.description || 'Silakan scan QR Code ini menggunakan smartphone untuk mengisi daftar hadir.'}</p>
            <div class="badge">KODE SESI: ${activeSession?.code || ''}</div>
            <div>
              <img src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div class="footer">Tanggal: ${activeSession?.date || ''} • Powered by SmartQR Attendance</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleCopyCode = () => {
    if (!activeSession?.code) return;
    navigator.clipboard.writeText(activeSession.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            <span>Kustomisasi & Pembuat QR Code Sesi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Buat sesi absensi baru atau atur desain warna, resolusi, dan tingkat koreksi QR Code
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeSession && (
            <>
              <button
                onClick={() => {
                  setMode('create');
                  setFormData({
                    title: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    start_time: '08:00',
                    end_time: '17:00',
                    qr_fg_color: '#1e293b',
                    qr_bg_color: '#ffffff',
                    qr_ecc: 'M'
                  });
                  setQrDataUrl('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
              >
                + Sesi Baru
              </button>
              <button
                onClick={() => onOpenProjector && onOpenProjector(activeSession)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors"
              >
                <Tv className="w-3.5 h-3.5 text-blue-400" />
                <span>Layar Proyektor</span>
              </button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl flex items-center space-x-2">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form & Customizer */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>{mode === 'create' ? 'Form Sesi Baru' : 'Edit Desain & Detail Sesi'}</span>
            </h3>
            {activeSession && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Kode: {activeSession.code}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Judul Sesi Absensi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Kuliah Umum AI, Briefing Tim, Rapat Divisi"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Keterangan / Lokasi (Opsional)
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contoh: Ruang Seminar Lantai 3 / Link Zoom"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Tanggal</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Jam Buka</span>
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Batas Waktu (Tutup)</span>
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          {/* Color & Visual Customization */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kustomisasi Warna QR Code
            </label>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs hover:border-slate-400 transition-colors bg-white"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: preset.fg }}></span>
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 -ml-2" style={{ backgroundColor: preset.bg }}></span>
                  <span className="text-slate-700 font-medium ml-1">{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">Warna Pola (Foreground)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.qr_fg_color}
                    onChange={(e) => setFormData({ ...formData, qr_fg_color: e.target.value })}
                    className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-medium text-slate-600 uppercase">{formData.qr_fg_color}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">Warna Latar (Background)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.qr_bg_color}
                    onChange={(e) => setFormData({ ...formData, qr_bg_color: e.target.value })}
                    className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-medium text-slate-600 uppercase">{formData.qr_bg_color}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">Error Correction</label>
                <select
                  value={formData.qr_ecc}
                  onChange={(e) => setFormData({ ...formData, qr_ecc: e.target.value })}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="L">L (7% Rendah)</option>
                  <option value="M">M (15% Standar)</option>
                  <option value="Q">Q (25% Tinggi)</option>
                  <option value="H">H (30% Maksimal)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : mode === 'create' ? 'Buat Sesi & Hasilkan QR Code' : 'Perbarui Desain QR Sesi Ini'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Live QR Preview & Actions */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-between text-center space-y-5">
          <div className="w-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pratinjau QR Code
              </span>
              {activeSession && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {activeSession.is_active ? 'Sesi Terbuka' : 'Sesi Ditutup'}
                </span>
              )}
            </div>

            {/* QR Card Canvas Container */}
            <div className="mt-4 p-6 rounded-2xl border border-slate-100 shadow-inner flex flex-col items-center justify-center transition-all"
                 style={{ backgroundColor: formData.qr_bg_color || '#ffffff' }}>
              
              <div className="text-center mb-3">
                <h4 className="font-bold text-base line-clamp-1" style={{ color: formData.qr_fg_color || '#1e293b' }}>
                  {formData.title || 'Judul Sesi Absensi'}
                </h4>
                <p className="text-[11px] opacity-75 line-clamp-1" style={{ color: formData.qr_fg_color || '#64748b' }}>
                  {formData.description || 'Pindai untuk mencatat kehadiran'}
                </p>
              </div>

              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code Sesi"
                  className="w-56 h-56 rounded-xl shadow-sm object-contain p-1 border border-slate-100/50"
                />
              ) : (
                <div className="w-56 h-56 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-4 border border-dashed border-slate-200">
                  <QrCode className="w-12 h-12 mb-2 stroke-[1.5]" />
                  <span className="text-xs font-medium text-center">Isi form di samping untuk meng-generate QR Code</span>
                </div>
              )}

              {activeSession && (
                <div className="mt-3 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-mono font-bold">
                  <span>KODE: {activeSession.code}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 hover:text-indigo-600 transition-colors"
                    title="Salin Kode Manual"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="w-full space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!qrDataUrl}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Unduh PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!qrDataUrl}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak Lembar</span>
              </button>
            </div>

            {activeSession && (
              <button
                type="button"
                onClick={() => onOpenProjector && onOpenProjector(activeSession)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow flex items-center justify-center space-x-2"
              >
                <Tv className="w-4 h-4 text-blue-400" />
                <span>Buka Mode Proyektor Layar Penuh</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
