const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\RAIHAN\\Downloads\\smart qr attendance\\client\\src\\components\\UserScanner.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add MapPin to lucide-react imports
content = content.replace(
  "Building, RefreshCw, X, ShieldAlert, Check",
  "Building, RefreshCw, X, ShieldAlert, Check, MapPin"
);

// 2. Insert Haversine formula and constants after the imports
const haversineCode = `
// SMAN 70 Jakarta Coordinates (Approx)
const TARGET_LAT = -6.241513;
const TARGET_LNG = 106.797274;
const MAX_RADIUS_METERS = 300; // Allow 300 meters radius

// Calculate distance in meters using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const toRadians = (deg) => deg * (Math.PI / 180);
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

export default function UserScanner({ initialCode = '' }) {`;

content = content.replace(
  "export default function UserScanner({ initialCode = '' }) {",
  haversineCode
);

// 3. Inject geolocation check in handleDecodedPayload
const originalHandleDecodedPayload = `  const handleDecodedPayload = async (rawString) => {
    if (processing) return;

    if (!profile.name || !profile.identifier) {
      setErrorMessage('Lengkapi Nama dan NIM/NIK Anda pada formulir profil di bawah sebelum memindai!');
      return;
    }

    setProcessing(true);
    setErrorMessage('');
    await stopCameraScanner();

    try {
      let sessionCode = rawString;`;

const updatedHandleDecodedPayload = `  const handleDecodedPayload = async (rawString) => {
    if (processing) return;

    if (!profile.name || !profile.identifier) {
      setErrorMessage('Lengkapi Nama dan NIM/NIK Anda pada formulir profil di bawah sebelum memindai!');
      return;
    }

    setProcessing(true);
    setErrorMessage('');
    await stopCameraScanner();

    // ---- GEOLOCATION CHECK ----
    try {
      await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Browser Anda tidak mendukung deteksi lokasi (GPS)."));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const distance = calculateDistance(latitude, longitude, TARGET_LAT, TARGET_LNG);
            if (distance > MAX_RADIUS_METERS) {
              reject(new Error(\`Anda berada di luar area SMAN 70 Jakarta (Jarak: \${Math.round(distance)} meter). Anda harus berada di dalam radius sekolah (\${MAX_RADIUS_METERS}m) untuk absen.\`));
            } else {
              resolve();
            }
          },
          (error) => {
            let msg = "Gagal mendapatkan lokasi Anda.";
            if (error.code === 1) msg = "Izin lokasi ditolak. Harap izinkan akses lokasi (GPS) pada browser/HP Anda untuk absen.";
            if (error.code === 2) msg = "Lokasi tidak tersedia, pastikan GPS/Lokasi perangkat Anda aktif.";
            if (error.code === 3) msg = "Waktu pencarian lokasi habis. Silakan coba lagi.";
            reject(new Error(msg));
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });
    } catch (err) {
      setErrorMessage(err.message);
      setProcessing(false);
      return;
    }
    // ---- END GEOLOCATION CHECK ----

    try {
      let sessionCode = rawString;`;

content = content.replace(originalHandleDecodedPayload, updatedHandleDecodedPayload);

// 4. Update Header Banner
const originalHeader = `      {/* Header Banner */}
      <div className="text-center space-y-1">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Portal Absensi Peserta</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Scan & Absen Seketika
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Arahkan kamera ke QR Code atau masukkan kode sesi yang ditampilkan panitia / dosen
        </p>
      </div>`;

const updatedHeader = `      {/* Header Banner */}
      <div className="text-center space-y-1">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Portal Absensi Peserta</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Scan & Absen Seketika
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Arahkan kamera ke QR Code atau masukkan kode sesi yang ditampilkan panitia / dosen
        </p>
        <div className="flex items-center justify-center text-xs font-medium text-amber-700 bg-amber-100/70 py-2 px-3 rounded-xl w-max mx-auto mt-3 shadow-sm border border-amber-200">
          <MapPin className="w-4 h-4 mr-1.5" />
          <span>Lokasi Terbatas: Hanya bisa absen di area SMAN 70 Jakarta</span>
        </div>
      </div>`;

content = content.replace(originalHeader, updatedHeader);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated UserScanner.jsx');
