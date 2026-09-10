import * as fb from './services/firebaseService';
export { isFirebaseConfigured, firebaseConfig } from './firebaseConfig';

// Re-export all Firebase Firestore services
export const getStats = fb.getStats;
export const getSessions = fb.getSessions;
export const getSession = fb.getSession;
export const createSession = fb.createSession;
export const updateSession = fb.updateSession;
export const deleteSession = fb.deleteSession;
export const getSessionQR = fb.getSessionQR;
export const checkIn = fb.checkIn;
export const getAttendances = fb.getAttendances;
export const manualAttendance = fb.manualAttendance;
export const deleteAttendance = fb.deleteAttendance;
export const verifyPin = fb.verifyPin;
export const changePin = fb.changePin;
export const subscribeSessions = fb.subscribeSessions;
export const subscribeAttendances = fb.subscribeAttendances;
export const exportAttendanceCSV = fb.exportAttendanceCSV;

// Export URL fallback / Client-side blob URL
export function getExportUrl(sessionId = 'all') {
  return `/api/attendance/export?session_id=${sessionId}`;
}

// Audio chime generator using Web Audio API (zero external assets needed)
export function playSuccessSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    // Audio might be blocked by browser policy until user interacts
  }
}
