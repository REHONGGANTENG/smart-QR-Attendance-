const API_BASE = '/api';

export async function getStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Gagal memuat statistik');
  return res.json();
}

export async function getSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error('Gagal memuat daftar sesi');
  return res.json();
}

export async function getSession(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}`);
  if (!res.ok) throw new Error('Gagal memuat sesi');
  return res.json();
}

export async function createSession(data) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal membuat sesi');
  }
  return res.json();
}

export async function updateSession(id, data) {
  const res = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memperbarui sesi');
  }
  return res.json();
}

export async function deleteSession(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Gagal menghapus sesi');
  return res.json();
}

export async function getSessionQR(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}/qr`);
  if (!res.ok) throw new Error('Gagal membuat QR code');
  return res.json();
}

export async function checkIn(data) {
  const res = await fetch(`${API_BASE}/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) {
    const error = new Error(json.message || 'Gagal melakukan absensi');
    error.status = res.status;
    error.data = json;
    throw error;
  }
  return json;
}

export async function getAttendances(params = {}) {
  const query = new URLSearchParams();
  if (params.session_id) query.set('session_id', params.session_id);
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.date) query.set('date', params.date);

  const res = await fetch(`${API_BASE}/attendance?${query.toString()}`);
  if (!res.ok) throw new Error('Gagal memuat data absensi');
  return res.json();
}

export async function manualAttendance(data) {
  const res = await fetch(`${API_BASE}/attendance/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal menambahkan absensi');
  }
  return res.json();
}

export async function deleteAttendance(id) {
  const res = await fetch(`${API_BASE}/attendance/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Gagal menghapus data absensi');
  return res.json();
}

export function getExportUrl(sessionId = 'all') {
  return `${API_BASE}/attendance/export?session_id=${sessionId}`;
}

export async function verifyPin(pin) {
  const res = await fetch(`${API_BASE}/admin/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  return res.json();
}

export async function changePin(currentPin, newPin) {
  const res = await fetch(`${API_BASE}/admin/change-pin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPin, newPin })
  });
  return res.json();
}

// Audio chime generator using Web Audio API (smooth success ding!)
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
    // Audio might be blocked by browser policy until interaction
  }
}
