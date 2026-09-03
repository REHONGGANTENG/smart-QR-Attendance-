import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, Shield, ArrowRight } from 'lucide-react';
import { verifyPin } from '../api';

export default function AdminAuthModal({ isOpen, onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError('Silakan masukkan PIN admin');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await verifyPin(pin);
      if (res.success) {
        sessionStorage.setItem('admin_authed', 'true');
        onSuccess();
      } else {
        setError(res.message || 'PIN admin salah');
      }
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold">Akses Admin Dashboard</h3>
          <p className="text-blue-100 text-xs mt-1">Area terproteksi untuk konfigurasi QR & rekap absensi</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              PIN / Sandi Admin
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN (default: admin123)"
                autoFocus
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none pl-10"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1">
              <span>PIN bawaan:</span>
              <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-bold">admin123</code>
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/25 flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              <span>{loading ? 'Memeriksa...' : 'Buka Akses'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
