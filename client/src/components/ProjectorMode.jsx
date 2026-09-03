import React, { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Users, Sparkles, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { getSessionQR } from '../api';

export default function ProjectorMode({ session, onClose, latestAttendee }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendeeCount, setAttendeeCount] = useState(session?.attendee_count || 0);
  const [recentFlash, setRecentFlash] = useState(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch QR Code
  useEffect(() => {
    if (session?.id) {
      getSessionQR(session.id)
        .then(res => setQrDataUrl(res.qrDataUrl))
        .catch(err => console.error(err));
    }
  }, [session]);

  // Flash new attendee ticker when latestAttendee changes
  useEffect(() => {
    if (latestAttendee && latestAttendee.session_id === session?.id) {
      setAttendeeCount(prev => prev + 1);
      setRecentFlash(latestAttendee);
      const timer = setTimeout(() => setRecentFlash(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [latestAttendee, session]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden animate-in fade-in duration-300">
      
      {/* Top Bar: Title, Date/Time & Controls */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full">
            LIVE PRESENTATION MODE
          </span>
        </div>

        {/* Big Digital Clock */}
        <div className="flex items-center space-x-6 text-right">
          <div>
            <div className="text-2xl sm:text-4xl font-extrabold tracking-tight font-mono text-slate-100">
              {formattedTime}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 font-medium flex items-center justify-end space-x-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
              title="Toggle Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 transition-colors"
              title="Keluar Mode Proyektor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Center Content: Huge QR & Event Information */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 py-6">
        
        {/* Left Info Card */}
        <div className="max-w-xl text-center lg:text-left space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-sm font-semibold tracking-wide">
            KODE SESI: <span className="font-mono font-bold text-white text-base">{session?.code}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            {session?.title || 'Sesi Absensi'}
          </h1>

          {session?.description && (
            <p className="text-base sm:text-xl text-slate-300 leading-relaxed font-light">
              {session?.description}
            </p>
          )}

          {/* Attendee Live Counter Box */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <div className="flex items-center space-x-3 px-5 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                  {attendeeCount}
                </div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Peserta Hadir
                </div>
              </div>
            </div>

            {session?.end_time && (
              <div className="flex items-center space-x-3 px-5 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slate-200">
                    {session.end_time}
                  </div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                    Batas Waktu
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-center lg:justify-start space-x-2">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>Arahkan kamera smartphone ke QR Code untuk mencatat kehadiran Anda.</span>
          </div>
        </div>

        {/* Right QR Display Container */}
        <div className="relative">
          <div className="p-6 sm:p-8 rounded-3xl bg-white shadow-2xl shadow-blue-500/10 border-4 border-slate-800 flex flex-col items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Proyektor"
                className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain rounded-xl"
              />
            ) : (
              <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-slate-100 animate-pulse rounded-xl" />
            )}
            
            <div className="mt-4 text-center">
              <span className="text-xs text-slate-500 font-mono font-bold tracking-wider">
                SCAN DENGAN KAMERA HP ATAU MASUKKAN KODE: {session?.code}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Floating Live Check-in Ticker */}
      <div className="h-14 flex items-center justify-center">
        {recentFlash ? (
          <div className="flex items-center space-x-3 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm shadow-xl shadow-emerald-900/50 animate-bounce">
            <CheckCircle2 className="w-5 h-5" />
            <span>
              Selamat Datang, <strong className="underline">{recentFlash.name}</strong> ({recentFlash.identifier}) baru saja hadir!
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium">
            Smart QR Attendance • Status Sesi: Aktif & Menerima Absensi
          </div>
        )}
      </div>

    </div>
  );
}
