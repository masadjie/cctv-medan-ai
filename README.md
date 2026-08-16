# Nusantara Traffic Vision — CCTV Medan ATCS & Computer Vision Platform

Dashboard monitoring dan analitik lalu lintas kamera CCTV ATCS Kota Medan berbasis Web & Computer Vision. Aplikasi ini memproses video streaming CCTV secara real-time langsung di browser menggunakan WebGL/TensorFlow.js untuk menghitung volume kendaraan, mendeteksi kecepatan arus, dan memetakan titik kamera aktif.

**Pengembang**: [Adjie Kurniawan](https://instagram.com/adjie.apk)  
**Lisensi**: MIT  

---

## 📌 Fitur Utama

- **Peta Interaktif CCTV Medan**: 110+ titik sebaran kamera ATCS Dishub Medan terintegrasi dengan Leaflet.js (dilengkapi filter online/offline dan pencarian instan).
- **War Room Matrix**: Tampilan multi-layar fleksibel (1×1, 2×2, 3×3, hingga 4×4) khusus memutar kamera yang sedang online.
- **Deteksi Objek Kendaraan Real-Time**: Menghitung mobil, sepeda motor, bus, dan truk dengan fusi kotak deteksi multi-skala.
- **Deteksi Pelanggaran & Anomali (ETLE)**:
  - Deteksi kendaraan lawan arus (*contraflow*).
  - Peringatan pengendara tanpa helm pelindung.
  - Peringatan boncengan lebih dari 2 orang (*3-in-1 overcapacity*).
  - Peringatan kendaraan mogok/berhenti lama di jalur aktif.
- **Estimasi Kecepatan & Telemetri**: Mengukur rata-rata laju arus lalu lintas (km/jam) dan mencatat akumulasi hitungan kendaraan per tanggal.
- **Interactive ROI (Region of Interest)**: Fitur drag & lock kotak fokus untuk hanya menganalisis area jalan tertentu.
- **Audit & Ekspor CSV**: Unduh rekapitulasi data hitungan kendaraan ke format spreadsheet CSV.
- **Keamanan Backend**: Proxy internal Node.js dengan Anti-SSRF guard, rate limiter, dan header proteksi.

---

## 💻 Cara Menjalankan di Lokal

### 1. Kloning Repository
```bash
git clone https://github.com/masadjie/cctv-medan-ai.git
cd cctv-medan-ai
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Jalankan Server
```bash
npm run dev
```
Buka browser di: **`http://localhost:3000`**

---

## 🗂️ Struktur Folder

```text
├── public/                 # File antarmuka frontend
│   ├── app.js              # Logika utama aplikasi, deteksi, dan tracking
│   ├── map.js              # Inisialisasi peta Leaflet & marker kamera
│   ├── analytics.js        # Engine kalkulasi grafik & telemetri
│   ├── cctv_medan_data.js  # Database daftar kamera ATCS Medan
│   ├── index.html          # Halaman utama aplikasi
│   ├── style.css           # Styling antarmuka (Dark Theme)
│   └── sw.js               # Service worker PWA
├── src/                    # Backend Node.js
│   ├── config/             # Konfigurasi port, security, & CORS
│   ├── middleware/         # Security headers & rate limiter
│   ├── routes/             # Proxy HLS stream & health check endpoint
│   └── utils/              # SSRF guard & IP filter
├── server.js               # Server entry point
└── package.json
```

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: HTML5, Vanilla CSS3, JavaScript ES6, Leaflet.js, Hls.js, Chart.js
- **Computer Vision Engine**: TensorFlow.js (COCO-SSD, ByteTrack, Multi-Scale Slicing)
- **Backend**: Node.js Native HTTP Proxy (Stream buffering & CORS handling)

---

## 👤 Kontak & Kontribusi

Dibuat oleh **Adjie Kurniawan**.  
Instagram: [@adjie.apk](https://instagram.com/adjie.apk)  
Email: bgdjie46@gmail.com
