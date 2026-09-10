import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Konfigurasi Firebase Anda:
 * Anda bisa mengisi nilai di bawah ini secara langsung, atau menggunakan file .env
 * (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, dll.)
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "PASTE_API_KEY_ANDA_DI_SINI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "PASTE_AUTH_DOMAIN_ANDA_DI_SINI",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "PASTE_PROJECT_ID_ANDA_DI_SINI",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "PASTE_STORAGE_BUCKET_ANDA_DI_SINI",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "PASTE_MESSAGING_SENDER_ID_DI_SINI",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "PASTE_APP_ID_ANDA_DI_SINI"
};

// Cek apakah konfigurasi telah diisi dengan benar (bukan placeholder default)
export const isFirebaseConfigured = () => {
  return (
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.includes('PASTE_') &&
    Boolean(firebaseConfig.projectId) &&
    !firebaseConfig.projectId.includes('PASTE_')
  );
};

// Inisialisasi Firebase App & Firestore
let app = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('🔥 Firebase Firestore berhasil diinisialisasi untuk project:', firebaseConfig.projectId);
  } catch (error) {
    console.error('Error saat inisialisasi Firebase:', error);
  }
}

export { app, db, firebaseConfig };
