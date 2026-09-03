import React from 'react';
import { QrCode, LayoutDashboard, ScanLine, ShieldCheck, Tv, Wifi } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenProjector, isAdminAuthed, onAdminLogout, sseConnected }) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('user')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  SmartQR
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  Attendance
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Sistem Absensi Cepat & Real-time</p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('user')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'user'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              <span>User Scanner</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Dashboard</span>
              {isAdminAuthed && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Real-time Indicator */}
            <div 
              title={sseConnected ? 'Real-time sync aktif' : 'Menghubungkan real-time...'}
              className="hidden md:flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
            >
              <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-[11px] text-slate-500 font-medium">{sseConnected ? 'Live Real-time' : 'Connecting'}</span>
            </div>

            {/* Quick Projector Button */}
            {onOpenProjector && (
              <button
                onClick={onOpenProjector}
                title="Mode Proyektor Layar Penuh"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Tv className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Proyektor</span>
              </button>
            )}

            {/* Logout Admin */}
            {activeTab === 'admin' && isAdminAuthed && (
              <button
                onClick={onAdminLogout}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                title="Keluar dari sesi admin"
              >
                Kunci Admin
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
