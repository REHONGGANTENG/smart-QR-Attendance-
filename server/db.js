const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dbPath = path.join(__dirname, 'attendance.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for optimal performance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    is_active INTEGER DEFAULT 1,
    qr_fg_color TEXT DEFAULT '#1e293b',
    qr_bg_color TEXT DEFAULT '#ffffff',
    qr_ecc TEXT DEFAULT 'M',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL,
    department TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Hadir',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    device_info TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    UNIQUE(session_id, identifier)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Seed default admin PIN if not exists
const checkPin = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_pin');
if (!checkPin) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_pin', 'admin123');
}

// Seed a sample session if table is empty
const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
if (sessionCount.count === 0) {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO sessions (code, title, description, date, start_time, end_time, is_active, qr_fg_color, qr_bg_color, qr_ecc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ATT101',
    'Sesi Pengenalan Smart QR Attendance',
    'Uji coba pemindaian QR Code dan pemantauan absensi real-time',
    today,
    '08:00',
    '17:00',
    1,
    '#2563eb',
    '#ffffff',
    'M'
  );

  const sampleSession = db.prepare('SELECT id FROM sessions WHERE code = ?').get('ATT101');
  if (sampleSession) {
    db.prepare(`
      INSERT INTO attendances (session_id, name, identifier, department, notes, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(
      sampleSession.id,
      'Ahmad Raihan',
      '2024001',
      'Teknik Informatika',
      'Hadir tepat waktu melalui scanner',
      'Tepat Waktu'
    );
  }
}

module.exports = db;
