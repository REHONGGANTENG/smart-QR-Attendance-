const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\RAIHAN\\Downloads\\smart qr attendance\\client\\src\\components\\UserScanner.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove Geolocation constants and function
const haversineRegex = /\/\/ SMAN 70 Jakarta Coordinates[\s\S]*?return R \* c;\n};\n/;
content = content.replace(haversineRegex, '');

// 2. Remove Geolocation try/catch block
const geoCheckRegex = /[ \t]*\/\/ ---- GEOLOCATION CHECK ----[\s\S]*?\/\/ ---- END GEOLOCATION CHECK ----\n/;
content = content.replace(geoCheckRegex, '');

// 3. Remove Header Banner Geofencing note
const bannerRegex = /[ \t]*<div className="flex items-center justify-center text-xs font-medium text-amber-700 bg-amber-100\/70 py-2 px-3 rounded-xl w-max mx-auto mt-3 shadow-sm border border-amber-200">[\s\S]*?<\/div>\n/;
content = content.replace(bannerRegex, '');

// 4. Add Clear History function
const clearHistoryFunc = `  const saveToLocalHistory = (item) => {`;
const newClearHistoryFunc = `  const clearHistory = () => {
    if(window.confirm('Apakah Anda yakin ingin menghapus semua riwayat absensi di perangkat ini?')) {
      setHistoryList([]);
      localStorage.removeItem('smartqr_user_history');
    }
  };

  const saveToLocalHistory = (item) => {`;
content = content.replace(clearHistoryFunc, newClearHistoryFunc);

// 5. Add Clear History button to Modal
const modalFooterOriginal = `            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Tutup
              </button>
            </div>`;
            
const modalFooterUpdated = `            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between">
              <button
                onClick={clearHistory}
                disabled={historyList.length === 0}
                className="px-4 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Hapus Semua
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Tutup
              </button>
            </div>`;
content = content.replace(modalFooterOriginal, modalFooterUpdated);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully removed Geolocation and added clear history feature.');
