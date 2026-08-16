# 🚦 NUSANTARA TRAFFIC VISION PRO — AI SURVEILLANCE & TELEMETRY

> **Sistem Pemantauan & Analisis Lalu Lintas ATCS Multi-Kota Indonesia Berbasis AI Edge Vision & Peta Interaktif**  
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

---

## 🏗️ Struktur Proyek (Modular Architecture)

```
cctv/
├── src/                          # Backend Node.js Modular
│   ├── config/
│   │   └── server.config.js      # Port, security, CORS, & limits
│   ├── middleware/
│   │   ├── security.js           # Anti-clickjacking, HSTS, secure headers
│   │   └── rateLimiter.js        # Rate limiting & token bucket DDoS protection
│   ├── routes/
│   │   ├── proxy.js              # CCTV HLS stream proxy with Anti-SSRF
│   │   └── health.js             # Server & camera health telemetry endpoint
│   └── utils/
│       └── ssrfGuard.js          # DNS & Private IP validator
│
├── public/                       # Frontend Web Application
│   ├── css/                      # Modular Design System
│   │   ├── base.css              # Tokens, reset, dark/light theme variables
│   │   ├── layout.css            # Header, dual-view layout, sidebar, video canvas
│   │   ├── components.css        # Buttons, pills, badges, scanner HUD, modals
│   │   └── responsive.css        # Mobile, tablet, and responsive breakpoints
│   │
│   ├── js/                       # Modular ES6 Modules
│   │   ├── config/
│   │   │   └── constants.js      # Color tokens, YOLO model configs, class IDs
│   │   ├── data/
│   │   │   └── cctv_medan.js     # 111+ Node ATCS Dishub Medan
│   │   ├── modules/              # Core sub-system modules
│   │   └── app.js                # App bootstrap & event hub
│   │
│   ├── index.html                # Entry HTML Dashboard
│   ├── style.css                 # Unified CSS Entry Point
│   ├── manifest.json             # PWA Manifest
│   ├── favicon.svg               # Vector icon
│   └── sw.js                     # Service Worker
│
├── server.js                     # Clean Server Runner Entrypoint
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack
- **AI Vision**: YOLO11, YOLOv8, YOLO26 NMS-Free, SAHI Multi-Scale Slicing, TensorFlow.js COCO-SSD
- **Frontend**: Pure HTML5, Modern Vanilla CSS3 Tokens, ES6+ JavaScript, Leaflet.js, Hls.js, Chart.js
- **Backend**: Node.js Native HTTP Proxy Engine with Anti-SSRF and Rate-Limiting Security
- **PWA**: Service Worker (`sw.js`), Web App Manifest (`manifest.json`)
- **Author & Architect**: **Adjie Kurniawan** — Instagram: [@adjie.apk](https://instagram.com/adjie.apk)
