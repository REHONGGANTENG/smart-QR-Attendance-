import { db, isFirebaseConfigured } from '../firebaseConfig';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import QRCode from 'qrcode';

// Key LocalStorage untuk Fallback Offline/Mock jika Firebase belum diisi
const LS_SESSIONS = 'smartqr_fb_fallback_sessions';
const LS_ATTENDANCES = 'smartqr_fb_fallback_attendances';
const LS_SETTINGS = 'smartqr_fb_fallback_settings';

function getLocalData(key, defaultVal) {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setLocalData(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

// Inisialisasi sesi contoh jika offline
if (!localStorage.getItem(LS_SESSIONS)) {
  const today = new Date().toISOString().split('T')[0];
  setLocalData(LS_SESSIONS, [
    {
      id: 'demo-session-101',
      code: 'ATT101',
      title: 'Sesi Pengenalan Smart QR Attendance',
      description: 'Uji coba pemindaian QR Code dan absensi cloud',
      date: today,
      start_time: '08:00',
      end_time: '17:00',
      is_active: true,
      qr_fg_color: '#2563eb',
      qr_bg_color: '#ffffff',
      qr_ecc: 'M',
      attendee_count: 1
    }
  ]);
  setLocalData(LS_ATTENDANCES, [
    {
      id: 'demo-att-1',
      session_id: 'demo-session-101',
      session_code: 'ATT101',
      session_title: 'Sesi Pengenalan Smart QR Attendance',
      name: 'Ahmad Raihan',
      identifier: '2024001',
      department: 'Teknik Informatika',
      notes: 'Hadir tepat waktu melalui scanner',
      status: 'Tepat Waktu',
      timestamp: new Date().toLocaleString('id-ID')
    }
  ]);
  setLocalData(LS_SETTINGS, { admin_pin: 'admin123' });
}

// Helper generate 6-karakter kode sesi
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- REALTIME SUBSCRIPTIONS (Firestore onSnapshot) ---
export function subscribeSessions(onUpdate) {
  if (!isFirebaseConfigured() || !db) {
    // Fallback: kirim data lokal
    onUpdate(getLocalData(LS_SESSIONS, []));
    const handleStorage = () => onUpdate(getLocalData(LS_SESSIONS, []));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  const q = query(collection(db, 'sessions'), orderBy('created_at', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(list);
  }, (err) => {
    console.warn('Firestore subscribeSessions fallback ke lokal:', err.message);
    onUpdate(getLocalData(LS_SESSIONS, []));
  });
}

export function subscribeAttendances(onUpdate, onNewAttendee) {
  if (!isFirebaseConfigured() || !db) {
    onUpdate(getLocalData(LS_ATTENDANCES, []));
    const handleStorage = () => onUpdate(getLocalData(LS_ATTENDANCES, []));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  const q = query(collection(db, 'attendances'), orderBy('created_at', 'desc'));
  let isFirst = true;

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(list);

    if (!isFirst) {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && onNewAttendee) {
          onNewAttendee({ id: change.doc.id, ...change.doc.data() });
        }
      });
    }
    isFirst = false;
  }, (err) => {
    console.warn('Firestore subscribeAttendances fallback ke lokal:', err.message);
    onUpdate(getLocalData(LS_ATTENDANCES, []));
  });
}

// --- SESSION CRUD ---
export async function getSessions() {
  if (!isFirebaseConfigured() || !db) {
    return getLocalData(LS_SESSIONS, []);
  }
  try {
    const q = query(collection(db, 'sessions'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Gagal ambil sessions dari Firestore, pakai lokal:', err.message);
    return getLocalData(LS_SESSIONS, []);
  }
}

export async function getSession(id) {
  if (!isFirebaseConfigured() || !db) {
    const list = getLocalData(LS_SESSIONS, []);
    const found = list.find(s => s.id === id || s.code === id);
    if (!found) throw new Error('Sesi tidak ditemukan');
    return found;
  }
  const snap = await getDoc(doc(db, 'sessions', id));
  if (!snap.exists()) {
    // cari berdasarkan kode
    const q = query(collection(db, 'sessions'), where('code', '==', id.toUpperCase()));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      return { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
    }
    throw new Error('Sesi tidak ditemukan');
  }
  return { id: snap.id, ...snap.data() };
}

export async function createSession(data) {
  const code = generateSessionCode();
  const sessionData = {
    code,
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    date: data.date || new Date().toISOString().split('T')[0],
    start_time: data.start_time || '',
    end_time: data.end_time || '',
    is_active: true,
    qr_fg_color: data.qr_fg_color || '#1e293b',
    qr_bg_color: data.qr_bg_color || '#ffffff',
    qr_ecc: data.qr_ecc || 'M',
    attendee_count: 0,
    created_at: new Date().toISOString()
  };

  if (!isFirebaseConfigured() || !db) {
    const list = getLocalData(LS_SESSIONS, []);
    const newSession = { id: 'sess-' + Date.now(), ...sessionData };
    setLocalData(LS_SESSIONS, [newSession, ...list]);
    return newSession;
  }

  const docRef = await addDoc(collection(db, 'sessions'), {
    ...sessionData,
    created_at: serverTimestamp()
  });

  return { id: docRef.id, ...sessionData };
}

export async function updateSession(id, data) {
  if (!isFirebaseConfigured() || !db) {
    const list = getLocalData(LS_SESSIONS, []);
    const updated = list.map(s => s.id === id ? { ...s, ...data } : s);
    setLocalData(LS_SESSIONS, updated);
    return updated.find(s => s.id === id);
  }

  const sessionRef = doc(db, 'sessions', id);
  await updateDoc(sessionRef, data);
  const snap = await getDoc(sessionRef);
  return { id: snap.id, ...snap.data() };
}

export async function deleteSession(id) {
  if (!isFirebaseConfigured() || !db) {
    const list = getLocalData(LS_SESSIONS, []).filter(s => s.id !== id);
    setLocalData(LS_SESSIONS, list);
    return { success: true };
  }

  await deleteDoc(doc(db, 'sessions', id));
  return { success: true };
}

// --- QR CODE GENERATION (Client-side via library qrcode) ---
export async function getSessionQR(id) {
  const session = await getSession(id);
  const payload = JSON.stringify({
    app: 'smart-qr-attendance',
    sessionId: session.id,
    code: session.code,
    title: session.title,
    t: Date.now()
  });

  const qrDataUrl = await QRCode.toDataURL(payload, {
    color: {
      dark: session.qr_fg_color || '#1e293b',
      light: session.qr_bg_color || '#ffffff'
    },
    errorCorrectionLevel: session.qr_ecc || 'M',
    width: 500,
    margin: 2
  });

  return {
    session,
    payload,
    qrDataUrl
  };
}

// --- ATTENDANCE CHECK-IN ---
export async function checkIn(payload) {
  let { code, name, identifier, department = '', notes = '' } = payload;

  if (!code || !name || !identifier) {
    throw new Error('Kode sesi, nama lengkap, dan nomor identitas (NIM/NIK) wajib diisi!');
  }

  code = code.trim().toUpperCase();
  name = name.trim();
  identifier = identifier.trim();
  department = department.trim();
  notes = notes.trim();

  // Try parse JSON if raw QR payload
  if (code.startsWith('{') && code.endsWith('}')) {
    try {
      const parsed = JSON.parse(code);
      if (parsed.code) code = parsed.code.toUpperCase();
    } catch (e) {}
  }

  // Ambil sesi
  const sessions = await getSessions();
  const session = sessions.find(s => s.code === code || s.id === code);

  if (!session) {
    throw new Error(`Sesi dengan kode "${code}" tidak ditemukan. Pastikan QR code valid.`);
  }

  if (!session.is_active) {
    throw new Error(`Sesi "${session.title}" saat ini telah ditutup oleh admin.`);
  }

  // Tentukan status Hadir vs Terlambat
  let status = 'Hadir';
  const now = new Date();
  if (session.end_time) {
    const curTime = now.toTimeString().split(' ')[0].substring(0, 5);
    status = curTime > session.end_time ? 'Terlambat' : 'Tepat Waktu';
  } else {
    status = 'Tepat Waktu';
  }

  const timestampStr = now.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // FALLBACK OFFLINE / LOCAL
  if (!isFirebaseConfigured() || !db) {
    const attendances = getLocalData(LS_ATTENDANCES, []);
    const exists = attendances.find(
      a => String(a.session_id) === String(session.id) && 
           a.identifier.toLowerCase() === identifier.toLowerCase()
    );

    if (exists) {
      const err = new Error(`Anda (${exists.name}) sudah tercatat hadir pada sesi ini pada ${exists.timestamp}!`);
      err.data = { alreadyCheckedIn: true, data: exists, session, message: err.message };
      throw err;
    }

    const newAtt = {
      id: 'att-' + Date.now(),
      session_id: session.id,
      session_code: session.code,
      session_title: session.title,
      name,
      identifier,
      department,
      notes,
      status,
      timestamp: timestampStr
    };

    setLocalData(LS_ATTENDANCES, [newAtt, ...attendances]);
    
    // Update attendee count pada sesi lokal
    const updatedSessions = sessions.map(s => s.id === session.id ? { ...s, attendee_count: (s.attendee_count || 0) + 1 } : s);
    setLocalData(LS_SESSIONS, updatedSessions);

    return {
      success: true,
      message: `Absensi berhasil dicatat! Selamat datang, ${name}.`,
      attendance: newAtt,
      session
    };
  }

  // FIRESTORE CLOUD
  // Cek duplikasi di Firestore
  const qDup = query(
    collection(db, 'attendances'),
    where('session_id', '==', session.id),
    where('identifier', '==', identifier)
  );
  const dupSnap = await getDocs(qDup);

  if (!dupSnap.empty) {
    const existing = dupSnap.docs[0].data();
    const err = new Error(`Anda (${existing.name}) sudah tercatat hadir pada sesi ini pada ${existing.timestamp}!`);
    err.data = { alreadyCheckedIn: true, data: existing, session, message: err.message };
    throw err;
  }

  const attData = {
    session_id: session.id,
    session_code: session.code,
    session_title: session.title,
    name,
    identifier,
    department,
    notes,
    status,
    timestamp: timestampStr,
    created_at: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'attendances'), attData);
  
  // Update counter sesi
  try {
    await updateDoc(doc(db, 'sessions', session.id), {
      attendee_count: (session.attendee_count || 0) + 1
    });
  } catch (e) {}

  return {
    success: true,
    message: `Absensi berhasil dicatat! Selamat datang, ${name}.`,
    attendance: { id: docRef.id, ...attData },
    session
  };
}

// --- MANUAL ATTENDANCE ENTRY (Admin) ---
export async function manualAttendance(data) {
  const sessions = await getSessions();
  const session = sessions.find(s => s.id === data.session_id);
  if (!session) throw new Error('Sesi tidak ditemukan');

  return checkIn({
    code: session.code,
    name: data.name,
    identifier: data.identifier,
    department: data.department || '',
    notes: data.notes || 'Input manual oleh admin'
  });
}

// --- GET ATTENDANCES & FILTERS ---
export async function getAttendances(params = {}) {
  let list = [];
  if (!isFirebaseConfigured() || !db) {
    list = getLocalData(LS_ATTENDANCES, []);
  } else {
    try {
      const q = query(collection(db, 'attendances'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      list = getLocalData(LS_ATTENDANCES, []);
    }
  }

  // Apply filters
  return list.filter(item => {
    if (params.session_id && params.session_id !== 'all') {
      if (String(item.session_id) !== String(params.session_id)) return false;
    }
    if (params.status && params.status !== 'all') {
      if (item.status !== params.status) return false;
    }
    if (params.search && params.search.trim()) {
      const term = params.search.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(term);
      const matchId = item.identifier?.toLowerCase().includes(term);
      const matchDept = item.department?.toLowerCase().includes(term);
      if (!matchName && !matchId && !matchDept) return false;
    }
    return true;
  });
}

export async function deleteAttendance(id) {
  if (!isFirebaseConfigured() || !db) {
    const list = getLocalData(LS_ATTENDANCES, []).filter(a => a.id !== id);
    setLocalData(LS_ATTENDANCES, list);
    return { success: true };
  }

  await deleteDoc(doc(db, 'attendances', id));
  return { success: true };
}

// --- STATS OVERVIEW ---
export async function getStats() {
  const sessions = await getSessions();
  const attendances = await getAttendances();

  const activeSessions = sessions.filter(s => s.is_active).length;
  const uniqueAttendees = new Set(attendances.map(a => a.identifier)).size;

  return {
    totalSessions: sessions.length,
    activeSessions,
    todayAttendances: attendances.length,
    totalUniqueAttendees: uniqueAttendees,
    recentAttendances: attendances.slice(0, 6)
  };
}

// --- EXPORT CSV (UTF-8 BOM directly downloaded in browser) ---
export function exportAttendanceCSV(attendances, sessionName = 'semua') {
  const headers = ['No', 'ID Sesi', 'Nama Sesi', 'Nama Peserta', 'NIM / NIK / ID', 'Departemen / Kelas', 'Waktu Hadir', 'Status', 'Catatan'];
  const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
  
  const csvLines = [headers.join(',')];
  attendances.forEach((row, index) => {
    csvLines.push([
      index + 1,
      escape(row.session_code),
      escape(row.session_title),
      escape(row.name),
      escape(row.identifier),
      escape(row.department),
      escape(row.timestamp),
      escape(row.status),
      escape(row.notes)
    ].join(','));
  });

  const utf8BOM = '\uFEFF';
  const blob = new Blob([utf8BOM + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `data-absensi-${sessionName}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- ADMIN AUTH & PIN ---
export async function verifyPin(pin) {
  if (!isFirebaseConfigured() || !db) {
    const settings = getLocalData(LS_SETTINGS, { admin_pin: 'admin123' });
    if (pin === settings.admin_pin) {
      return { success: true };
    }
    return { success: false, message: 'PIN admin tidak tepat!' };
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'admin'));
    const savedPin = snap.exists() ? snap.data().pin : 'admin123';
    if (pin === savedPin) {
      return { success: true };
    }
    return { success: false, message: 'PIN admin tidak tepat!' };
  } catch (err) {
    // Fallback pin
    return pin === 'admin123' ? { success: true } : { success: false, message: 'PIN admin salah' };
  }
}

export async function changePin(currentPin, newPin) {
  const check = await verifyPin(currentPin);
  if (!check.success) {
    return { success: false, message: 'PIN saat ini salah!' };
  }
  if (!newPin || newPin.length < 4) {
    return { success: false, message: 'PIN baru minimal 4 karakter' };
  }

  if (!isFirebaseConfigured() || !db) {
    setLocalData(LS_SETTINGS, { admin_pin: newPin });
    return { success: true, message: 'PIN berhasil diubah di penyimpanan lokal' };
  }

  try {
    await setDoc(doc(db, 'settings', 'admin'), { pin: newPin }, { merge: true });
    return { success: true, message: 'PIN berhasil diubah di Cloud Firestore' };
  } catch (e) {
    return { success: false, message: 'Gagal memperbarui PIN di cloud: ' + e.message };
  }
}
