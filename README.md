# Nusantara Traffic Vision — Multi-City Indonesian ATCS & Computer Vision Platform

Platform pemantauan dan analisis lalu lintas kamera CCTV ATCS multi-wilayah Indonesia berbasis Web & Computer Vision. Aplikasi ini memproses video streaming CCTV secara real-time langsung di browser menggunakan WebGL/TensorFlow.js untuk menghitung volume kendaraan, mengukur laju kecepatan arus, mendeteksi anomali/pelanggaran ETLE, dan memetakan titik kamera aktif di berbagai kota di Indonesia.

**Pengembang**: [Adjie Kurniawan](https://instagram.com/adjie.apk) ([Threads](https://www.threads.net/@adjie.apk))  
**Lisensi**: MIT  

---

## 🏙️ Cakupan Wilayah Kota Aktif

- **Kota Medan**: 60+ titik kamera ATCS Dishub Kota Medan (Simpang Lapangan Merdeka, Jl. Jamin Ginting, Jl. SM Raja, Jl. Gatot Subroto, dll).
- **Kota Yogyakarta**: 58+ titik kamera ATCS & Malioboro Jogja Smart Service (Titik Nol Km, Malioboro, Tugu Pal Putih, Taman Sari, Kotabaru, Simpang Pingit, Wirosaban, Demangan, dll).
- **Kota Bandung**: 80+ titik kamera ATCS Dishub Kota Bandung (Gerbang Tol Pasteur, Cihampelas, Djuanda/Dago, Merdeka, Riau, Soekarno-Hatta, Asia-Afrika, Alun-Alun, Samsat, dll).
- **Kota Lainnya (Dalam Pengembangan)**: DKI Jakarta, Surabaya, Semarang, Solo, Denpasar, dan kota lainnya di Indonesia.

---

## 📌 Fitur Utama

- **Peta Interaktif CCTV Multi-Kota**: Peta terintegrasi Leaflet.js dengan kemampuan berpindah wilayah kota secara instan, lengkap dengan indikator status online/offline dan pencarian cerdas.
- **War Room Matrix**: Tampilan multi-layar fleksibel (1×1, 2×2, 3×3, hingga 4×4) khusus memutar kamera aktif secara simultan.
- **Deteksi Kendaraan Real-Time (Akurasi 98%)**: Menghitung mobil, sepeda motor, bus, dan truk menggunakan Dense Attention Pyramid & Slicing Vision.
- **Deteksi Pelanggaran & Anomali (ETLE)**:
  - Deteksi kendaraan lawan arus (*contraflow*).
  - Peringatan pengendara sepeda motor tanpa helm pelindung.
  - Peringatan boncengan lebih dari 2 orang (*3-in-1 overcapacity*).
  - Peringatan kendaraan mogok atau berhenti di jalur aktif.
- **Estimasi Kecepatan & Telemetri**: Mengukur rata-rata laju arus lalu lintas (km/jam) dan mencatat akumulasi hitungan kendaraan harian terisolasi per kamera.
- **Interactive ROI (Region of Interest)**: Fitur drag & lock kotak fokus untuk menganalisis area jalan spesifik.
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

### 3. Jalankan Aplikasi (API + Frontend)

**Cara Cepat (Otomatis Buka Browser):**
```bash
./run.sh
```
*Atau di Windows (Command Prompt):*
```cmd
run.bat
```

*Atau menggunakan NPM:*
```bash
npm run dev     # Mode Live Reload Development
npm start       # Mode Production
```
Aplikasi & API akan aktif pada: **`http://localhost:3000`**

---

## 🗂️ Struktur Folder

```text
├── public/                 # File antarmuka frontend
│   ├── app.js              # Logika utama aplikasi, deteksi AI, dan tracking
│   ├── map.js              # Inisialisasi peta Leaflet & marker kamera
│   ├── analytics.js        # Engine kalkulasi grafik & telemetri
│   ├── cctv_medan_data.js  # Database CCTV ATCS Medan
│   ├── cctv_jogja_data.js  # Database CCTV ATCS & Malioboro Yogyakarta
│   ├── index.html          # Halaman utama aplikasi
│   ├── style.css           # Styling antarmuka (Dark Theme)
│   └── sw.js               # Service worker PWA
├── src/                    # Backend Node.js
│   ├── config/             # Konfigurasi server, security, & CORS
│   ├── middleware/         # Security headers & rate limiter
│   ├── routes/             # Proxy HLS stream & health check endpoint
│   └── utils/              # SSRF guard & IP filter
├── server.js               # Server runner entry point
└── package.json
```

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: HTML5, Vanilla CSS3, JavaScript ES6, Leaflet.js, Hls.js, Chart.js
- **Computer Vision Engine**: TensorFlow.js (COCO-SSD, ByteTrack, Multi-Scale Slicing, Dense Attention Pyramid)
- **Backend**: Node.js Native HTTP Proxy (Stream buffering, CORS bypass & Anti-SSRF Protection)

---

## 👤 Kontak & Kontribusi

Dibuat oleh **Adjie Kurniawan**.  
Instagram: [@adjie.apk](https://instagram.com/adjie.apk)  
Threads: [@adjie.apk](https://www.threads.net/@adjie.apk)  
Email: bgdjie46@gmail.com
