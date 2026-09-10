import React, { useState } from 'react';
import { Flame, ChevronDown, ChevronUp, ExternalLink, Copy, Check, ShieldCheck, Sparkles, X } from 'lucide-react';
import { isFirebaseConfigured, firebaseConfig } from '../api';

export default function FirebaseGuideBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const configured = isFirebaseConfigured();

  if (dismissed) return null;

  const copyTemplate = () => {
    const text = `const firebaseConfig = {
  apiKey: "PASTE_API_KEY_ANDA",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border-b transition-all ${
      configured 
        ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border-amber-200/60 text-slate-800' 
        : 'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border-orange-200 text-slate-800'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              configured ? 'bg-amber-500 text-white shadow-sm' : 'bg-orange-500 text-white animate-pulse'
            }`}>
              <Flame className="w-4 h-4 fill-current" />
            </div>
            
            <div>
              {configured ? (
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-amber-900">Google Firebase Aktif:</span>
                  <span className="text-amber-800">Terhubung ke Firestore (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold">{firebaseConfig.projectId}</code>)</span>
                  <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                    Real-time Cloud Online
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-orange-950">Mode Firebase Siap!</span>
                  <span className="text-orange-800">
                    Aplikasi saat ini berjalan di mode lokal/offline. Masukkan kunci Firebase Anda untuk mengaktifkan cloud database.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {!configured && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-1 font-semibold text-orange-700 hover:text-orange-900 bg-white/80 border border-orange-200 px-2.5 py-1 rounded-lg transition-colors shadow-xs"
              >
                <span>{isOpen ? 'Tutup Panduan' : 'Lihat Cara Pasang'}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Tutup banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Collapsible Setup Guide */}
        {isOpen && !configured && (
          <div className="mt-3 pt-3 border-t border-orange-200/80 space-y-3 animate-in fade-in duration-200 text-xs text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/80 p-3 rounded-xl border border-orange-200/60 shadow-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[11px] font-bold">1</span>
                  <span>Buat Project Firebase</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Buka <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center">Firebase Console <ExternalLink className="w-3 h-3 ml-0.5" /></a> dan buat project baru gratis.
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-orange-200/60 shadow-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[11px] font-bold">2</span>
                  <span>Aktifkan Cloud Firestore</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pilih menu <strong>Firestore Database</strong> ➔ <strong>Create database</strong> (Pilih mode <em>Start in test mode</em>).
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-orange-200/60 shadow-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[11px] font-bold">3</span>
                  <span>Paste Kunci Config</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Buka file <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono font-bold">client/src/firebaseConfig.js</code> di VS Code dan tempel kunci Firebase Anda.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-xl border border-orange-200/80">
              <span className="text-[11px] text-slate-500 font-mono">
                Lokasi file: <strong>client/src/firebaseConfig.js</strong>
              </span>
              <button
                onClick={copyTemplate}
                className="flex items-center space-x-1 px-3 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Tersalin!' : 'Salin Format Config'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
