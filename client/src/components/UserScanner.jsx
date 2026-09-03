import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Upload, KeyRound, CheckCircle2, AlertCircle, 
  Sparkles, History, User, CreditCard, Building, RefreshCw, X, ShieldAlert, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import { checkIn, playSuccessSound } from '../api';

export default function UserScanner({ initialCode = '' }) {
  // User Profile from LocalStorage (Auto-remember)
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('smartqr_user_profile');
      return saved ? JSON.parse(saved) : { name: '', identifier: '', department: '' };
    } catch (e) {
      return { name: '', identifier: '', department: '' };
    }
  });

  const [rememberMe, setRememberMe] = useState(true);
  const [activeScanTab, setActiveScanTab] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [manualCode, setManualCode] = useState(initialCode);
  const [notes, setNotes] = useState('');
  
  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [processing, setProcessing] = useState(false);

  // Result state
  const [checkInResult, setCheckInResult] = useState(null); // { success, message, attendance, session, alreadyCheckedIn }
  const [errorMessage, setErrorMessage] = useState('');

  // History state
  const [historyList, setHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem('smartqr_user_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Save profile to localStorage if rememberMe is true
  useEffect(() => {
    if (rememberMe) {
      localStorage.setItem('smartqr_user_profile', JSON.stringify(profile));
    }
  }, [profile, rememberMe]);

  // Handle URL query param for code
  useEffect(() => {
    if (initialCode) {
      setManualCode(initialCode);
      setActiveScanTab('manual');
    }
  }, [initialCode]);

  // Clean up scanner on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Clean up scanner on unmount or tab switch
  useEffect(() => {
    if (activeScanTab !== 'camera') {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [activeScanTab]);

  const startCameraScanner = async (cameraId) => {
    setCameraError('');
    try {
      if (scannerRef.current) {
        await stopCameraScanner();
      }

      const html5QrCode = new Html5Qrcode('qr-reader-container');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        cameraId || { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleDecodedPayload(decodedText);
        },
        (errorMessage) => {
          // ignore continuous scanning frame misses
        }
      );

      setScannerActive(true);

      // Lazy query cameras in background if not already loaded
      if (availableCameras.length === 0) {
        Html5Qrcode.getCameras()
          .then(devices => {
            if (devices && devices.length > 0) {
              setAvailableCameras(devices);
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setCameraError('Gagal membuka kamera: ' + (err.message || 'Periksa izin kamera browser Anda.'));
      setScannerActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      } finally {
        scannerRef.current = null;
        setScannerActive(false);
      }
    }
  };

  const triggerSuccessEffects = () => {
    playSuccessSound();
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  const saveToLocalHistory = (item) => {
    const updated = [item, ...historyList.filter(h => h.id !== item.id)].slice(0, 30);
    setHistoryList(updated);
    try {
      localStorage.setItem('smartqr_user_history', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDecodedPayload = async (rawString) => {
    if (processing) return;

    if (!profile.name || !profile.identifier) {
      setErrorMessage('Lengkapi Nama dan NIM/NIK Anda pada formulir profil di bawah sebelum memindai!');
      return;
    }

    setProcessing(true);
    setErrorMessage('');
    await stopCameraScanner();

    try {
      let sessionCode = rawString;
      try {
        const parsed = JSON.parse(rawString);
        if (parsed.code) sessionCode = parsed.code;
      } catch (e) {
        // rawString is just the code
      }

      const res = await checkIn({
        code: sessionCode,
        name: profile.name,
        identifier: profile.identifier,
        department: profile.department,
        notes: notes
      });

      setCheckInResult(res);
      triggerSuccessEffects();
      saveToLocalHistory({
        id: res.attendance.id,
        session_title: res.session.title,
        session_code: res.session.code,
        timestamp: res.attendance.timestamp,
        status: res.attendance.status
      });

    } catch (err) {
      if (err.data && err.data.alreadyCheckedIn) {
        setCheckInResult({
          alreadyCheckedIn: true,
          message: err.data.message,
          session: err.data.session,
          attendance: err.data.data
        });
      } else {
        setErrorMessage(err.message || 'Gagal melakukan absensi. Pastikan QR code sesuai.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!profile.name || !profile.identifier) {
      setErrorMessage('Isi Nama Lengkap dan NIM/NIK Anda terlebih dahulu.');
      return;
    }

    try {
      setProcessing(true);
      setErrorMessage('');
      const html5QrCode = new Html5Qrcode('qr-reader-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      await handleDecodedPayload(decodedText);
    } catch (err) {
      setErrorMessage('Tidak dapat membaca QR Code dari gambar yang diunggah. Pastikan gambar jelas dan tidak blur.');
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setErrorMessage('Masukkan 6-karakter kode sesi absensi');
      return;
    }
    await handleDecodedPayload(manualCode.trim().toUpperCase());
  };

  const resetScannerState = () => {
    setCheckInResult(null);
    setErrorMessage('');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="text-center space-y-1">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Portal Absensi Peserta</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Scan & Absen Seketika
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Arahkan kamera ke QR Code atau masukkan kode sesi yang ditampilkan panitia / dosen
        </p>
      </div>

      {/* History Launcher button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowHistoryModal(true)}
          className="flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Absensi Saya ({historyList.length})</span>
        </button>
      </div>

      {/* SUCCESS CARD / ALREADY CHECKED IN BANNER */}
      {checkInResult && (
        <div className={`p-6 rounded-2xl border shadow-lg animate-in zoom-in-95 duration-200 text-center space-y-4 ${
          checkInResult.alreadyCheckedIn 
            ? 'bg-amber-50/90 border-amber-300 text-amber-900' 
            : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
        }`}>
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-md ${
            checkInResult.alreadyCheckedIn ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {checkInResult.alreadyCheckedIn ? (
              <ShieldAlert className="w-9 h-9" />
            ) : (
              <CheckCircle2 className="w-9 h-9" />
            )}
          </div>

          <div>
            <h3 className="text-xl font-extrabold">
              {checkInResult.alreadyCheckedIn ? 'Sudah Tercatat Hadir' : 'Absensi Berhasil!'}
            </h3>
            <p className="text-xs mt-1 opacity-80">
              {checkInResult.message}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200/60 text-left text-xs space-y-1.5 shadow-sm">
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">Sesi:</span>
              <span className="font-bold text-slate-800">{checkInResult.session?.title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">Nama Peserta:</span>
              <span className="font-bold text-slate-800">{checkInResult.attendance?.name || profile.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">NIM / NIK:</span>
              <span className="font-mono font-bold text-slate-800">{checkInResult.attendance?.identifier || profile.identifier}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">Waktu Kehadiran:</span>
              <span className="font-mono font-semibold text-slate-700">{checkInResult.attendance?.timestamp}</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <span className="font-bold px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800">
                {checkInResult.attendance?.status || 'Hadir'}
              </span>
            </div>
          </div>

          <button
            onClick={resetScannerState}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow"
          >
            Selesai / Scan Sesi Lain
          </button>
        </div>
      )}

      {/* ERROR MESSAGE BANNER */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start space-x-3 animate-in shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">Gagal Mencatat Absensi</div>
            <div className="mt-0.5 leading-relaxed">{errorMessage}</div>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. IDENTITY CARD (AUTO-REMEMBER) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
            <User className="w-4 h-4 text-blue-600" />
            <span>Identitas Peserta (Auto-Remember)</span>
          </h2>
          <label className="flex items-center space-x-1.5 text-[11px] text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Ingat di HP ini</span>
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Contoh: Muhammad Raihan"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                NIM / NIK / ID Karyawan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={profile.identifier}
                onChange={(e) => setProfile({ ...profile, identifier: e.target.value })}
                placeholder="20241001"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kelas / Departemen (Opsional)
              </label>
              <input
                type="text"
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                placeholder="Informatika / Divisi IT"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Catatan Kehadiran (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Hadir di baris depan / izin terlambat 5 menit"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. SCANNER / INPUT METHOD SELECTOR */}
      {!checkInResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveScanTab('camera')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeScanTab === 'camera'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera</span>
            </button>

            <button
              onClick={() => setActiveScanTab('file')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeScanTab === 'file'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah QR</span>
            </button>

            <button
              onClick={() => setActiveScanTab('manual')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeScanTab === 'manual'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Kode Manual</span>
            </button>
          </div>

          {/* TAB 1: WEBCAM SCANNER */}
          {activeScanTab === 'camera' && (
            <div className="space-y-4">
              {cameraError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">Peringatan Izin Kamera</div>
                    <div className="text-[11px] mt-0.5">{cameraError}</div>
                    <div className="text-[11px] font-semibold text-blue-600 mt-1 cursor-pointer" onClick={() => setActiveScanTab('manual')}>
                      &rarr; Gunakan opsi 'Kode Manual' atau 'Unggah QR' sebagai alternatif
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Device Switcher */}
              {availableCameras.length > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Pilih Kamera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (scannerActive) startCameraScanner(e.target.value);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  >
                    {availableCameras.map(cam => (
                      <option key={cam.id} value={cam.id}>{cam.label || `Kamera ${cam.id.substring(0, 4)}`}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scanner Video Box */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 aspect-square flex flex-col items-center justify-center">
                <div id="qr-reader-container" className="w-full h-full"></div>

                {!scannerActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900/90 backdrop-blur-sm z-10">
                    <Camera className="w-12 h-12 text-blue-400 mb-3" />
                    <h4 className="font-bold text-sm">Kamera Siap Digunakan</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-4 max-w-xs">
                      Tekan tombol di bawah untuk mengaktifkan pemindai kamera smartphone Anda.
                    </p>
                    <button
                      type="button"
                      onClick={() => startCameraScanner(selectedCameraId)}
                      disabled={!profile.name || !profile.identifier}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                    >
                      Buka Kamera & Scan Sekarang
                    </button>
                    {(!profile.name || !profile.identifier) && (
                      <span className="text-[11px] text-amber-400 mt-2">
                        *Lengkapi Nama & NIM di atas terlebih dahulu
                      </span>
                    )}
                  </div>
                )}

                {scannerActive && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center z-20">
                    <button
                      type="button"
                      onClick={stopCameraScanner}
                      className="px-3.5 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold shadow-md hover:bg-red-700 transition-colors"
                    >
                      Hentikan Kamera
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD SCANNER */}
          {activeScanTab === 'file' && (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl p-8 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">Klik untuk Unggah Gambar QR Code</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih screenshot atau foto QR Code dari galeri perangkat Anda (PNG, JPG)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <div id="qr-reader-temp" className="hidden"></div>
            </div>
          )}

          {/* TAB 3: MANUAL CODE ENTRY */}
          {activeScanTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Kode Sesi Absensi (6 Karakter)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: ATT101"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest uppercase focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lihat kode sesi yang tertera pada layar proyektor atau papan pengumuman
                </p>
              </div>

              <button
                type="submit"
                disabled={processing || !manualCode.trim() || !profile.name || !profile.identifier}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>{processing ? 'Memproses...' : 'Kirim Absensi Sekarang'}</span>
              </button>
            </form>
          )}

        </div>
      )}

      {/* USER HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Riwayat Absensi di Perangkat Ini</span>
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {historyList.length > 0 ? (
                historyList.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.session_title}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Kode: {item.session_code} • {item.timestamp}
                      </div>
                    </div>
                    <span className="font-bold px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                      {item.status || 'Hadir'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada riwayat absensi tersimpan di perangkat ini.
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
