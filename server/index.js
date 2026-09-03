const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const routes = require('./routes');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', routes);

// Serve static frontend build if it exists
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Catch-all route to support client-side routing
  app.use((req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.send('Backend Smart QR Attendance berjalan. Frontend ada di client (port 5173 untuk development).');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 Smart QR Attendance Server Aktif!`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📡 Real-time SSE endpoint at: http://localhost:${PORT}/api/events`);
  console.log(`=========================================`);
});
