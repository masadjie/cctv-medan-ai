# 🚦 MEDAN TRAFFIC VISION PRO — AI SURVEILLANCE & TELEMETRY

> **Sistem Pemantauan & Analisis Lalu Lintas ATCS Kota Medan Berbasis AI Edge Vision & Peta Interaktif**  
> *Engineered & Copyright © 2026 by **Adjie Kurniawan** ([@adjie.apk](https://instagram.com/adjie.apk))*

---

## 🌟 Fitur Utama

- 📍 **Peta Interaktif 60+ Titik CCTV ATCS Medan**: Menggunakan Leaflet.js dengan layer peta *DarkNight* dan *Voyager*.
- ⚡ **Multi-Scale Slicing AI Vision (SAHI)**: Deteksi otomatis kendaraan (*Mobil, Truk, Bus & Sepeda Motor*) dengan akurasi tinggi menggunakan TensorFlow.js.
- 📐 **Interactive Visual ROI Zone Selection**: Kemampuan memilih zona deteksi khusus langsung pada video dengan neural zoom inference.
- ✨ **Ultra-HD Super-Resolution Filter**: Penajaman visual kamera CCTV menggunakan hardware-accelerated contrast matrix.
- 📊 **Per-Device & Per-Date Telemetry Persistence**: Penyimpanan data volume lalu lintas harian terisolasi untuk masing-masing titik CCTV (`localStorage`).
- 🌙 **Dark & Light Mode Themes**: Tema gelap *Surveillance Obsidian* dan tema terang *Zinc Clean* dengan peralihan instan.
- 📱 **Progressive Web App (PWA) & Mobile Ready**: Dilengkapi `manifest.json` dan `sw.js` untuk instalasi native di smartphone dan desktop.
- 🛡️ **Enterprise Security**: Anti-SSRF proxy validator, `X-Frame-Options: SAMEORIGIN`, rate limiting, dan proteksi integritas.
- 📥 **Ekspor Audit CSV**: Unduh laporan lalu lintas multi-kamera dan multi-tanggal dengan sekali klik.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Kloning Repositori
```bash
git clone <repository-url>
cd cctv
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Jalankan Server Dev
```bash
npm run dev
```

Buka peramban di **`http://localhost:3000`**.

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, Vanilla CSS3 (Custom Design Tokens), JavaScript (ES6+), Leaflet.js, Hls.js, TensorFlow.js
- **Backend**: Node.js Native HTTP/HTTPS Proxy with Anti-SSRF Security Engine
- **PWA**: Service Worker (`sw.js`), Web App Manifest (`manifest.json`)
- **Author**: Adjie Kurniawan — Instagram: [@adjie.apk](https://instagram.com/adjie.apk)
