const express = require('express');
const QRCode = require('qrcode');
const db = require('./db');

const router = express.Router();

// Active SSE client connections for real-time live sync
const sseClients = new Set();

function broadcastEvent(eventType, payload) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch (err) {
      console.error('Error writing to SSE client:', err.message);
    }
  }
}

// Generate random 6-character alphanumeric code
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- SSE Real-time Endpoint ---
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId = Date.now() + Math.random().toString(36).substring(2);
  const newClient = { id: clientId, res };
  sseClients.add(newClient);

  // Initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  // Periodic heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(newClient);
  });
});

// --- Admin Verification & Settings ---
router.post('/admin/verify-pin', (req, res) => {
  const { pin } = req.body;
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_pin');
  if (setting && setting.value === pin) {
    return res.json({ success: true, message: 'Autentikasi admin berhasil' });
  }
  return res.status(401).json({ success: false, message: 'PIN admin tidak tepat!' });
});

router.put('/admin/change-pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_pin');
  if (!setting || setting.value !== currentPin) {
    return res.status(401).json({ success: false, message: 'PIN saat ini salah!' });
  }
  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ success: false, message: 'PIN baru minimal 4 karakter' });
  }
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(newPin, 'admin_pin');
  return res.json({ success: true, message: 'PIN admin berhasil diperbarui' });
});

// --- Statistics Endpoint ---
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
  const activeSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1').get().count;
  const todayAttendances = db.prepare(`
    SELECT COUNT(*) as count FROM attendances 
    WHERE date(timestamp) = date('now', 'localtime') OR date(timestamp) = ?
  `).get(today).count;
  const totalUniqueAttendees = db.prepare('SELECT COUNT(DISTINCT identifier) as count FROM attendances').get().count;

  const recentAttendances = db.prepare(`
    SELECT a.*, s.title as session_title, s.code as session_code
    FROM attendances a
    JOIN sessions s ON a.session_id = s.id
    ORDER BY a.id DESC
    LIMIT 6
  `).all();

  res.json({
    totalSessions,
    activeSessions,
    todayAttendances,
    totalUniqueAttendees,
    recentAttendances
  });
});

// --- Session Endpoints ---
router.get('/sessions', (req, res) => {
  const sessions = db.prepare(`
    SELECT s.*, 
           COUNT(a.id) as attendee_count,
           SUM(CASE WHEN a.status = 'Tepat Waktu' THEN 1 ELSE 0 END) as on_time_count
    FROM sessions s
    LEFT JOIN attendances a ON s.id = a.session_id
    GROUP BY s.id
    ORDER BY s.id DESC
  `).all();
  res.json(sessions);
});

router.get('/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ? OR code = ?').get(req.params.id, req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  }
  res.json(session);
});

router.post('/sessions', async (req, res) => {
  try {
    const {
      title,
      description = '',
      date = new Date().toISOString().split('T')[0],
      start_time = '',
      end_time = '',
      qr_fg_color = '#1e293b',
      qr_bg_color = '#ffffff',
      qr_ecc = 'M'
    } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Judul sesi harus diisi' });
    }

    // Ensure unique 6-character code
    let code = generateSessionCode();
    let existing = db.prepare('SELECT id FROM sessions WHERE code = ?').get(code);
    while (existing) {
      code = generateSessionCode();
      existing = db.prepare('SELECT id FROM sessions WHERE code = ?').get(code);
    }

    const result = db.prepare(`
      INSERT INTO sessions (code, title, description, date, start_time, end_time, is_active, qr_fg_color, qr_bg_color, qr_ecc)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(code, title.trim(), description.trim(), date, start_time, end_time, qr_fg_color, qr_bg_color, qr_ecc);

    const newSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);

    broadcastEvent('SESSION_CREATED', newSession);
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Gagal membuat sesi: ' + error.message });
  }
});

router.put('/sessions/:id', (req, res) => {
  try {
    const { title, description, date, start_time, end_time, is_active, qr_fg_color, qr_bg_color, qr_ecc } = req.body;
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    }

    db.prepare(`
      UPDATE sessions SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        date = COALESCE(?, date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        is_active = COALESCE(?, is_active),
        qr_fg_color = COALESCE(?, qr_fg_color),
        qr_bg_color = COALESCE(?, qr_bg_color),
        qr_ecc = COALESCE(?, qr_ecc)
      WHERE id = ?
    `).run(
      title,
      description,
      date,
      start_time,
      end_time,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      qr_fg_color,
      qr_bg_color,
      qr_ecc,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    broadcastEvent('SESSION_UPDATED', updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui sesi: ' + error.message });
  }
});

router.delete('/sessions/:id', (req, res) => {
  try {
    const id = req.params.id;
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    broadcastEvent('SESSION_DELETED', { id: Number(id) });
    res.json({ success: true, message: 'Sesi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus sesi: ' + error.message });
  }
});

// --- QR Code Generator for a Session ---
router.get('/sessions/:id/qr', async (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ? OR code = ?').get(req.params.id, req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    }

    // QR Payload contains structured JSON or plain code
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

    res.json({
      session,
      payload,
      qrDataUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat QR Code: ' + error.message });
  }
});

// --- Attendance Check-in (User Scan or Manual Code) ---
router.post('/attendance/check-in', (req, res) => {
  try {
    let { code, name, identifier, department = '', notes = '' } = req.body;

    if (!code || !name || !identifier) {
      return res.status(400).json({
        success: false,
        message: 'Kode sesi, nama lengkap, dan nomor identitas (NIM/NIK) wajib diisi!'
      });
    }

    // Sanitize
    code = code.trim().toUpperCase();
    name = name.trim();
    identifier = identifier.trim();
    department = department.trim();
    notes = notes.trim();

    // Try parsing if code is a JSON string from QR
    if (code.startsWith('{') && code.endsWith('}')) {
      try {
        const parsed = JSON.parse(code);
        if (parsed.code) code = parsed.code.toUpperCase();
      } catch (e) {
        // ignore, keep as string
      }
    }

    // Find session
    const session = db.prepare('SELECT * FROM sessions WHERE code = ? OR id = ?').get(code, code);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Sesi dengan kode "${code}" tidak ditemukan. Pastikan QR code valid.`
      });
    }

    // Check if session is active
    if (!session.is_active) {
      return res.status(403).json({
        success: false,
        message: `Sesi "${session.title}" saat ini telah ditutup oleh admin.`
      });
    }

    // Check duplicate attendance
    const existing = db.prepare(`
      SELECT * FROM attendances 
      WHERE session_id = ? AND LOWER(identifier) = LOWER(?)
    `).get(session.id, identifier);

    if (existing) {
      return res.status(409).json({
        success: false,
        alreadyCheckedIn: true,
        message: `Anda (${existing.name}) sudah tercatat hadir pada sesi ini pada ${existing.timestamp}!`,
        data: existing,
        session
      });
    }

    // Determine status (Tepat Waktu vs Terlambat if end_time is defined)
    let status = 'Hadir';
    const now = new Date();
    if (session.end_time) {
      const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
      if (currentTimeStr > session.end_time) {
        status = 'Terlambat';
      } else {
        status = 'Tepat Waktu';
      }
    } else {
      status = 'Tepat Waktu';
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const insertResult = db.prepare(`
      INSERT INTO attendances (session_id, name, identifier, department, notes, status, timestamp, ip_address, device_info)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)
    `).run(session.id, name, identifier, department, notes, status, clientIp, userAgent);

    const newAttendance = db.prepare(`
      SELECT a.*, s.title as session_title, s.code as session_code 
      FROM attendances a 
      JOIN sessions s ON a.session_id = s.id 
      WHERE a.id = ?
    `).get(insertResult.lastInsertRowid);

    // Broadcast new attendance event to all admin viewers in real-time!
    broadcastEvent('NEW_ATTENDANCE', newAttendance);

    res.status(201).json({
      success: true,
      message: `Absensi berhasil dicatat! Selamat datang, ${name}.`,
      attendance: newAttendance,
      session
    });
  } catch (error) {
    console.error('Error in check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem: ' + error.message
    });
  }
});

// --- Manual Attendance Entry by Admin ---
router.post('/attendance/manual', (req, res) => {
  try {
    const { session_id, name, identifier, department = '', notes = 'Input manual oleh admin', status = 'Hadir' } = req.body;
    if (!session_id || !name || !identifier) {
      return res.status(400).json({ error: 'Sesi, nama, dan identitas wajib diisi' });
    }

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    }

    const existing = db.prepare('SELECT * FROM attendances WHERE session_id = ? AND identifier = ?').get(session_id, identifier);
    if (existing) {
      return res.status(409).json({ error: 'Peserta dengan nomor identitas ini sudah tercatat hadir' });
    }

    const result = db.prepare(`
      INSERT INTO attendances (session_id, name, identifier, department, notes, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(session_id, name.trim(), identifier.trim(), department.trim(), notes.trim(), status);

    const newEntry = db.prepare(`
      SELECT a.*, s.title as session_title, s.code as session_code
      FROM attendances a
      JOIN sessions s ON a.session_id = s.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    broadcastEvent('NEW_ATTENDANCE', newEntry);
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambah absensi manual: ' + error.message });
  }
});

// --- Get Attendance Records with Filters ---
router.get('/attendance', (req, res) => {
  const { session_id, search, status, date } = req.query;

  let query = `
    SELECT a.*, s.title as session_title, s.code as session_code, s.date as session_date
    FROM attendances a
    JOIN sessions s ON a.session_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (session_id && session_id !== 'all') {
    query += ` AND a.session_id = ?`;
    params.push(session_id);
  }

  if (status && status !== 'all') {
    query += ` AND a.status = ?`;
    params.push(status);
  }

  if (date) {
    query += ` AND date(a.timestamp) = ?`;
    params.push(date);
  }

  if (search && search.trim() !== '') {
    query += ` AND (a.name LIKE ? OR a.identifier LIKE ? OR a.department LIKE ?)`;
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ` ORDER BY a.id DESC`;

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// --- Delete Attendance Record ---
router.delete('/attendance/:id', (req, res) => {
  try {
    const id = req.params.id;
    db.prepare('DELETE FROM attendances WHERE id = ?').run(id);
    broadcastEvent('ATTENDANCE_DELETED', { id: Number(id) });
    res.json({ success: true, message: 'Data absensi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus absensi: ' + error.message });
  }
});

// --- Export Attendance to CSV (Excel Friendly with UTF-8 BOM) ---
router.get('/attendance/export', (req, res) => {
  try {
    const { session_id } = req.query;
    let query = `
      SELECT a.*, s.title as session_title, s.code as session_code, s.date as session_date
      FROM attendances a
      JOIN sessions s ON a.session_id = s.id
    `;
    const params = [];
    if (session_id && session_id !== 'all') {
      query += ` WHERE a.session_id = ?`;
      params.push(session_id);
    }
    query += ` ORDER BY a.session_id DESC, a.timestamp ASC`;

    const rows = db.prepare(query).all(...params);

    // Build CSV content
    const headers = ['No', 'ID Sesi', 'Nama Sesi', 'Tanggal Sesi', 'Nama Peserta', 'NIM / NIK / ID', 'Departemen / Kelas', 'Waktu Absen', 'Status', 'Catatan'];
    const csvLines = [headers.join(',')];

    rows.forEach((row, index) => {
      const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      csvLines.push([
        index + 1,
        escape(row.session_code),
        escape(row.session_title),
        escape(row.session_date),
        escape(row.name),
        escape(row.identifier),
        escape(row.department),
        escape(row.timestamp),
        escape(row.status),
        escape(row.notes)
      ].join(','));
    });

    const utf8BOM = '\uFEFF';
    const csvContent = utf8BOM + csvLines.join('\r\n');

    const filename = `data-absensi-${session_id ? `sesi-${session_id}` : 'semua'}-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).send('Gagal mengekspor data: ' + error.message);
  }
});

module.exports = router;
