/**
 * CCTV AI Object Detector (Mobil, Motor, Pejalan Kaki)
 * High-Accuracy Multi-Scale Slicing Aided Inference (SAHI) + Dedicated ROI Zoom Pipeline + Interactive ROI Live Selection
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ==========================================================================
  // SECURITY & ANTI-CLONING WATERMARK (By Adjie Kurniawan - @adjie.apk)
  // ==========================================================================
  console.log(
    '%c MEDAN TRAFFIC VISION %c Engineered by Adjie Kurniawan (@adjie.apk) %c',
    'background: #18181b; color: #ffffff; font-weight: bold; font-size: 14px; padding: 4px 8px; border-radius: 4px 0 0 4px; border: 1px solid #333;',
    'background: #f59e0b; color: #09090b; font-weight: bold; font-size: 14px; padding: 4px 8px; border-radius: 0 4px 4px 0;',
    'background: transparent'
  );
  console.log('%c[SECURITY ACTIVE] Anti-SSRF, Frame-Guard & Telemetry Signature Initialized.', 'color: #10b981; font-family: monospace; font-size: 11px;');

  // ==========================================================================
  // HIGH-TECH INITIALIZATION SPLASH SCREEN SEQUENCE (FAIL-SAFE & SMOOTH)
  // ==========================================================================
  const splashScreen = document.getElementById('appSplashScreen');
  const splashProgressFill = document.getElementById('splashProgressFill');
  const splashStepText = document.getElementById('splashStepText');
  const splashPercentText = document.getElementById('splashPercentText');

  let isSplashDismissed = false;

  function dismissSplashScreen() {
    if (isSplashDismissed || !splashScreen) return;
    isSplashDismissed = true;
    splashScreen.classList.add('fade-out');
    setTimeout(() => {
      try { splashScreen.remove(); } catch (e) {}

      // Auto-restore previously selected city from localStorage if available
      const savedCity = localStorage.getItem('cctv_selected_city');
      if (savedCity === 'medan' || savedCity === 'jogja' || savedCity === 'bandung') {
        const card = document.querySelector(`.city-card[data-city-id="${savedCity}"]`);
        if (card) {
          const cityName = card.getAttribute('data-city-name');
          const lat = parseFloat(card.getAttribute('data-lat'));
          const lon = parseFloat(card.getAttribute('data-lon'));
          activateCity(savedCity, cityName, lat, lon);
        }
      } else {
        // Show City Selector Gateway for first-time visitors - keep standby and zero tracking
        isCityActivated = false;
        resetActiveCameraMonitoring();
        openCitySelectorModal();
      }
    }, 550);
  }

  // Click on splash screen instantly dismisses
  if (splashScreen) {
    splashScreen.addEventListener('click', () => {
      dismissSplashScreen();
    });
  }

  // Click on Brand Header (Nusantara Traffic Vision) reloads the app to main dashboard
  const brandBadge = document.getElementById('brandBadge');
  if (brandBadge) {
    brandBadge.addEventListener('click', () => {
      window.location.reload();
    });
    brandBadge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.reload();
      }
    });
  }

  async function advanceSplash(percent, message, duration = 220) {
    if (isSplashDismissed) return;
    if (splashProgressFill) splashProgressFill.style.width = `${percent}%`;
    if (splashPercentText) splashPercentText.textContent = `${percent}%`;
    if (splashStepText) splashStepText.textContent = message;
    await new Promise(r => setTimeout(r, duration));
  }

  async function runSplashSequence() {
    try {
      await advanceSplash(35, '[1/3] Memuat Sistem Surveillance Nusantara...', 180);
      await advanceSplash(75, '[2/3] Mempersiapkan Gateway Pemilihan Wilayah...', 200);
      await advanceSplash(100, '[3/3] Silakan Pilih Kota Pemantauan.', 180);
    } catch (err) {
      console.warn('Splash animation error:', err);
    } finally {
      setTimeout(dismissSplashScreen, 250);
    }
  }

  // Hard timeout guarantee (never gets stuck)
  setTimeout(dismissSplashScreen, 2500);
  runSplashSequence();

  // DOM Elements
  const video = document.getElementById('cctvVideo');
  const canvas = document.getElementById('detectionCanvas');
  const ctx = canvas.getContext('2d');
  const streamUrlInput = document.getElementById('streamUrlInput');
  const btnLoadStream = document.getElementById('btnLoadStream');
  const presetSelect = document.getElementById('presetSelect');
  const videoFileInput = document.getElementById('videoFileInput');
  const useProxyToggle = document.getElementById('useProxyToggle');
  const modelEngineSelect = document.getElementById('modelEngineSelect');

  // Purge deprecated cache from previous versions
  try {
    const cachedStream = localStorage.getItem('cctv_last_active_stream');
    if (cachedStream && (cachedStream.includes('atcs-dishub.bandung.go.id') || cachedStream.includes('/proxy?url='))) {
      localStorage.removeItem('cctv_last_active_stream');
    }
  } catch(e) {}

  const btnPlayPause = document.getElementById('btnPlayPause');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  const btnToggleAi = document.getElementById('btnToggleAi');
  const btnDrawRoi = document.getElementById('btnDrawRoi');
  const btnSnapshot = document.getElementById('btnSnapshot');
  const btnRecord = document.getElementById('btnRecord');
  const recordBtnText = document.getElementById('recordBtnText');
  const osdRecBadge = document.getElementById('osdRecBadge');
  const osdRecTimer = document.getElementById('osdRecTimer');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnResetCounters = document.getElementById('btnResetCounters');

  const aiStatusBadge = document.getElementById('aiStatusBadge');
  const aiStatusText = document.getElementById('aiStatusText');
  const videoLoadingOverlay = document.getElementById('videoLoadingOverlay');
  const videoStateText = document.getElementById('videoStateText');
  const osdCamName = document.getElementById('osdCamName');
  const osdFps = document.getElementById('osdFps');
  const osdTimestamp = document.getElementById('osdTimestamp');
  const liveClock = document.getElementById('liveClock');

  const confSlider = document.getElementById('confSlider');
  const confVal = document.getElementById('confVal');
  const detectCars = document.getElementById('detectCars');
  const detectMotor = document.getElementById('detectMotor');
  const showLabelsToggle = document.getElementById('showLabelsToggle');
  const btnExportCsv = document.getElementById('btnExportCsv');

  // Real-time confidence slider live update
  if (confSlider && confVal) {
    confSlider.addEventListener('input', () => {
      confVal.textContent = `${confSlider.value}%`;
    });
  }

  // Filter pills visual toggle synchronization
  if (detectCars) {
    detectCars.addEventListener('change', () => {
      const parentPill = detectCars.closest('.filter-pill');
      if (parentPill) parentPill.classList.toggle('active', detectCars.checked);
    });
  }
  if (detectMotor) {
    detectMotor.addEventListener('change', () => {
      const parentPill = detectMotor.closest('.filter-pill');
      if (parentPill) parentPill.classList.toggle('active', detectMotor.checked);
    });
  }

  // Modal Elements
  const snapshotModal = document.getElementById('snapshotModal');
  const snapshotImg = document.getElementById('snapshotImg');
  const snapshotInfo = document.getElementById('snapshotInfo');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnDownloadSnapshot = document.getElementById('btnDownloadSnapshot');
  const toastContainer = document.getElementById('toastContainer');

  // State Variables
  let model = null;
  let hls = null;
  let isAiRunning = true;
  let animationFrameId = null;
  let fps = 0;
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  let isDetecting = false;
  let lastInferenceTimestamp = 0;
  let lastTelemetryUpdateTimestamp = 0;

  // ROI State & Live Visual Selection
  let roi = null;
  let isDrawingRoi = false;
  let roiStartPoint = null;
  let roiCurrentPoint = null;

  // Motion-Vector Persistent Tracker
  let trackedObjects = [];
  let nextTrackId = 1;

  // Offscreen Preprocessing & Tiled Crop Canvases
  const fullCropCanvas = document.createElement('canvas');
  const fullCropCtx = fullCropCanvas.getContext('2d', { willReadFrequently: true });
  const tileCanvas1 = document.createElement('canvas');
  const tileCtx1 = tileCanvas1.getContext('2d', { willReadFrequently: true });
  const tileCanvas2 = document.createElement('canvas');
  const tileCtx2 = tileCanvas2.getContext('2d', { willReadFrequently: true });
  const roiCanvas = document.createElement('canvas');
  const roiCtx = roiCanvas.getContext('2d', { willReadFrequently: true });

  // COCO Classes (Kendaraan: Mobil & Sepeda Motor)
  const CAR_CLASSES = ['car', 'truck', 'bus'];
  const MOTOR_CLASSES = ['motorcycle', 'bicycle', 'person'];

  const COLOR_CAR = '#00e5ff';      // Cyan
  const COLOR_MOTOR = '#ffb300';    // Amber/Yellow

  // 1. Clock
  setInterval(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID');
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    liveClock.textContent = timeStr;
    if (osdTimestamp) osdTimestamp.textContent = `${dateStr} ${timeStr}`;
  }, 1000);

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 2. Load AI Model Engine
  let activeEngine = 'rtdetr';
  let inferenceScale = 'transformer_dense';
  let isAnomalyDetectionEnabled = false;
  let isByteTrackEnabled = true;
  let isHelmetDetectionEnabled = false;
  let isOvercapacityEnabled = false;

  const ENGINE_LABELS = {
    rtdetr: 'RT-DETR Transformer',
    yolo11: 'YOLO11 PRO',
    yolov8: 'YOLOv8 HD',
    yolo26: 'YOLO26 NMS-Free',
    cocossd: 'MobileNetV2'
  };

  async function loadAiModel() {
    try {
      const label = ENGINE_LABELS[activeEngine] || activeEngine.toUpperCase();
      aiStatusText.textContent = `Memuat ${label}...`;
      model = await cocoSsd.load({ base: 'mobilenet_v2' });
      
      aiStatusBadge.classList.add('ai-ready');
      aiStatusText.textContent = `${label} Ready`;
      showToast(`Model ${label} Aktif`);
    } catch (err) {
      console.error('Failed to load AI model:', err);
      aiStatusText.textContent = 'AI Standby';
    }
  }

  let currentCityId = localStorage.getItem('cctv_selected_city') || 'medan';

  function getCurrentCityCameras() {
    if (currentCityId === 'jogja') {
      return window.ATCS_JOGJA_CAMERAS || window.CCTV_JOGJA_DATA || [];
    } else if (currentCityId === 'bandung') {
      return window.ATCS_BANDUNG_CAMERAS || window.CCTV_BANDUNG_DATA || [];
    }
    return window.ATCS_MEDAN_CAMERAS || window.CCTV_MEDAN_DATA || [];
  }

  // 2b. Populate CCTV Preset Select Dropdown
  function initCameraDirectory() {
    if (!presetSelect) return;
    const currentCams = getCurrentCityCameras();
    let cityLabel = 'Medan';
    let atcsGroupLabel = `🚦 ATCS Dishub Kota Medan (${currentCams.length} Titik CCTV Aktif)`;
    
    if (currentCityId === 'jogja') {
      cityLabel = 'Yogyakarta';
      atcsGroupLabel = `🚦 ATCS & Malioboro Kota Yogyakarta (${currentCams.length} Titik CCTV Aktif)`;
    } else if (currentCityId === 'bandung') {
      cityLabel = 'Bandung';
      atcsGroupLabel = `🚦 ATCS Dishub Kota Bandung (${currentCams.length} Titik CCTV Aktif)`;
    }

    const comboboxCityHeaderTitle = document.getElementById('comboboxCityHeaderTitle');
    if (comboboxCityHeaderTitle) {
      comboboxCityHeaderTitle.textContent = `PILIH & CARI TITIK CCTV (${currentCams.length}+ LOKASI KOTA ${cityLabel.toUpperCase()}):`;
    }

    presetSelect.innerHTML = '';

    // Standard options
    const optGroupSim = document.createElement('optgroup');
    optGroupSim.label = '⚡ Sumber Simulasi & Lokal';
    
    const optSim = document.createElement('option');
    optSim.value = 'simulation_traffic';
    optSim.textContent = `🎬 LIVE TRAFFIC FEED (Simulasi Realistis ${cityLabel})`;
    optGroupSim.appendChild(optSim);

    const optWebcam = document.createElement('option');
    optWebcam.value = 'webcam';
    optWebcam.textContent = '📷 Gunakan Webcam Perangkat / Laptop';
    optGroupSim.appendChild(optWebcam);

    const optUpload = document.createElement('option');
    optUpload.value = 'upload';
    optUpload.textContent = '📁 Unggah File Video Rekaman Lokal (.mp4)';
    optGroupSim.appendChild(optUpload);

    presetSelect.appendChild(optGroupSim);

    // Active City CCTV Group
    const optGroupAtcs = document.createElement('optgroup');
    optGroupAtcs.label = atcsGroupLabel;

    currentCams.forEach((cam, idx) => {
      const opt = document.createElement('option');
      opt.value = cam.url;
      const camName = cam.name || cam.title || `Kamera #${cam.id}`;
      const camAlias = cam.alias || cam.category || camName;
      opt.textContent = `[No. ${cam.id}] ${camName} (${camAlias})`;
      if (idx === 0) {
        opt.selected = true;
      }
      optGroupAtcs.appendChild(opt);
    });

    presetSelect.appendChild(optGroupAtcs);
  }

  // Searchable Camera Combobox Component
  const cameraCombobox = document.getElementById('cameraCombobox');
  const searchCamInput = document.getElementById('searchCamInput');
  const btnToggleCamList = document.getElementById('btnToggleCamList');
  const cameraDropdownList = document.getElementById('cameraDropdownList');

  function renderComboboxItems(filterQuery = '') {
    if (!cameraDropdownList) return;
    cameraDropdownList.innerHTML = '';
    const q = filterQuery.toLowerCase().trim();

    const specialItems = [
      { id: 'sim', name: 'LIVE TRAFFIC FEED (Simulasi Realistis Medan)', alias: 'Simulasi Lalu Lintas', url: 'simulation_traffic', isSpecial: true },
      { id: 'cam', name: 'Webcam Perangkat / Laptop', alias: 'Kamera Lokal', url: 'webcam', isSpecial: true },
      { id: 'file', name: 'Unggah File Rekaman CCTV (.mp4)', alias: 'File Lokal', url: 'upload', isSpecial: true }
    ];

    const currentStreamUrl = streamUrlInput ? streamUrlInput.value.trim() : '';

    let matchCount = 0;

    // 1. Special options
    specialItems.forEach(item => {
      if (!q || item.name.toLowerCase().includes(q) || item.alias.toLowerCase().includes(q)) {
        matchCount++;
        const div = document.createElement('div');
        div.className = `combobox-item ${item.url === currentStreamUrl ? 'selected' : ''}`;
        div.innerHTML = `
          <div class="combobox-item-left">
            <span class="item-id-pill">SRC</span>
            <div class="item-names">
              <span class="item-main-name">${item.name}</span>
              <span class="item-sub-alias">${item.alias}</span>
            </div>
          </div>
        `;
        div.addEventListener('click', () => {
          selectComboboxCamera(item);
        });
        cameraDropdownList.appendChild(div);
      }
    });

    // 2. Active City ATCS Cameras with Real-Time Health Status (Prioritize Online at the top)
    const healthMap = window.medanCCTVMap ? window.medanCCTVMap.healthStatus : {};
    const cityCameras = getCurrentCityCameras();
    const sortedCams = [...cityCameras].sort((a, b) => {
      const aStatus = healthMap[a.id];
      const bStatus = healthMap[b.id];
      const aOnline = aStatus ? aStatus.online : true;
      const bOnline = bStatus ? bStatus.online : true;
      if (aOnline === bOnline) return (a.id || 0) - (b.id || 0);
      return aOnline ? -1 : 1;
    });

    sortedCams.forEach(cam => {
      const match = !q || 
        cam.name.toLowerCase().includes(q) || 
        cam.alias.toLowerCase().includes(q) || 
        cam.id.toString().includes(q);

      if (match) {
        matchCount++;
        const isSelected = cam.url === currentStreamUrl || currentStreamUrl.includes(`L${cam.id}`);
        const status = healthMap[cam.id];
        const isOnline = status ? status.online : true;
        const latencyText = status && status.latencyMs ? ` (${status.latencyMs}ms)` : '';

        const div = document.createElement('div');
        div.className = `combobox-item ${isSelected ? 'selected' : ''}`;
        div.innerHTML = `
          <div class="combobox-item-left">
            <span class="item-id-pill">#${cam.id}</span>
            <div class="item-names">
              <span class="item-main-name">${cam.name}</span>
              <span class="item-sub-alias">${cam.alias}</span>
            </div>
          </div>
          <span class="item-status-tag ${isOnline ? 'tag-online' : 'tag-offline'}">
            <span class="status-mini-dot ${isOnline ? 'dot-online' : 'dot-offline'}"></span>
            ${isOnline ? (status ? 'ONLINE' + latencyText : 'LIVE') : 'OFFLINE'}
          </span>
        `;
        div.addEventListener('click', () => {
          selectComboboxCamera(cam);
        });
        cameraDropdownList.appendChild(div);
      }
    });

    if (matchCount === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'combobox-item disabled';
      emptyDiv.innerHTML = '<span style="color: var(--text-muted); font-size: 12px;">Tidak ada CCTV ditemukan untuk pencarian ini</span>';
      cameraDropdownList.appendChild(emptyDiv);
    }
  }

  // Real-time Health Event Listener
  window.addEventListener('cctv-health-updated', () => {
    if (cameraCombobox && cameraCombobox.classList.contains('open')) {
      renderComboboxItems(searchCamInput ? searchCamInput.value : '');
    }
  });

  function selectComboboxCamera(cam) {
    if (searchCamInput) {
      searchCamInput.value = cam.isSpecial ? cam.name : `[No. ${cam.id}] ${cam.name} (${cam.alias})`;
    }
    if (presetSelect) presetSelect.value = cam.url;
    if (streamUrlInput) streamUrlInput.value = cam.url;
    if (cameraCombobox) cameraCombobox.classList.remove('open');

    loadStream(cam.url);
    updateActiveChip(cam.url);
    if (window.setViewModeGlobal) {
      window.setViewModeGlobal('console');
    }
  }

  if (searchCamInput && cameraCombobox) {
    searchCamInput.addEventListener('focus', () => {
      cameraCombobox.classList.add('open');
      renderComboboxItems(searchCamInput.value);
    });

    searchCamInput.addEventListener('input', (e) => {
      cameraCombobox.classList.add('open');
      renderComboboxItems(e.target.value);
    });

    if (btnToggleCamList) {
      btnToggleCamList.addEventListener('click', (e) => {
        e.stopPropagation();
        cameraCombobox.classList.toggle('open');
        if (cameraCombobox.classList.contains('open')) {
          renderComboboxItems(searchCamInput.value);
          searchCamInput.focus();
        }
      });
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!cameraCombobox.contains(e.target)) {
        cameraCombobox.classList.remove('open');
      }
    });
  }

  initCameraDirectory();
  renderComboboxItems('');

  // Initial Combobox Value: Clean placeholder until selected
  if (searchCamInput) {
    searchCamInput.value = '';
  }

  // 3. Stream Loader
  function loadStream(url) {
    if (!url) return;
    
    const idleScreen = document.getElementById('viewportIdleScreen');
    if (idleScreen) idleScreen.classList.add('hidden');

    const previewPulseDot = document.getElementById('previewPulseDot');
    if (previewPulseDot) previewPulseDot.classList.add('active-stream');

    videoLoadingOverlay.classList.remove('hidden');
    videoStateText.textContent = 'Menghubungkan ke Siaran CCTV...';

    if (url === 'upload') {
      videoFileInput.click();
      return;
    }

    if (url === 'webcam') {
      if (hls) { hls.destroy(); hls = null; }
      osdCamName.textContent = 'LIVE WEBCAM PERANGKAT';
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          video.srcObject = stream;
          video.play();
          videoLoadingOverlay.classList.add('hidden');
          showToast('Webcam Lokal Aktif');
        })
        .catch(err => {
          videoStateText.textContent = 'Gagal akses webcam: ' + err.message;
        });
      return;
    }

    if (video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      video.srcObject = null;
    }

    // Bandung uses the Koyeb remote proxy, Medan & Yogya are 100% direct native
    const REMOTE_PROXY_BASE = 'https://renewed-georgeanne-nekonode-1aa70c0c.koyeb.app/fetch/?url=';
    const isBandung = url.includes('bandung.go.id') || url.includes('pelindung');
    const finalUrl = isBandung && !url.includes('koyeb.app')
      ? `${REMOTE_PROXY_BASE}${encodeURIComponent(url)}`
      : url;

    // Dynamic OSD matching & Button State
    const currentCams = getCurrentCityCameras();
    const matchedCam = currentCams.find(c => c.url === url || (url.includes('/stream/') && url.includes(c.url.split('/stream/')[1]?.split('/')[0])) || url.includes(c.url));
    if (matchedCam) {
      osdCamName.textContent = `CAM ${matchedCam.id}: ${matchedCam.name} (${matchedCam.alias})`;
      if (searchCamInput) {
        searchCamInput.value = `[No. ${matchedCam.id}] ${matchedCam.name} (${matchedCam.alias})`;
      }
      const previewCamName = document.getElementById('previewCamName');
      if (previewCamName) {
        previewCamName.textContent = `CAM ${matchedCam.id}: ${matchedCam.name}`;
      }
      if (window.medanCCTVMap && window.medanCCTVMap.isInitialized) {
        window.medanCCTVMap.highlightCamera(matchedCam.id);
      }
      // Sync per-device telemetry
      if (window.trafficAnalytics) {
        window.trafficAnalytics.setActiveCamera(matchedCam.id, `${matchedCam.name} (${matchedCam.alias})`);
      }
      try { localStorage.setItem('cctv_last_active_stream', url); } catch (e) {}
    } else {
      const fallbackName = url.split('/').filter(Boolean).pop() || 'Lokal';
      osdCamName.textContent = 'CCTV: ' + fallbackName;
      if (window.trafficAnalytics) {
        window.trafficAnalytics.setActiveCamera(url, fallbackName);
      }
      try { localStorage.setItem('cctv_last_active_stream', url); } catch (e) {}
    }

    // Reveal stop monitoring buttons
    const btnResetMonitoringMap = document.getElementById('btnResetMonitoringMap');
    const btnClearCamSelect = document.getElementById('btnClearCamSelect');
    if (btnResetMonitoringMap) btnResetMonitoringMap.classList.remove('hidden');
    if (btnClearCamSelect) btnClearCamSelect.classList.remove('hidden');

    if (Hls.isSupported() && (url.includes('.m3u8') || url.includes('/stream/'))) {
      if (hls) hls.destroy();

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000
      });

      hls.loadSource(finalUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoLoadingOverlay.classList.add('hidden');
        video.play().catch(err => console.log('Autoplay policy caught:', err));
        showToast('Terhubung ke CCTV Live Feed');

        if (matchedCam && window.medanCCTVMap) {
          window.medanCCTVMap.setCameraHealth(matchedCam.id, true, 95);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && finalUrl !== url) {
            console.warn('Proxy retry -> Direct stream failover');
            hls.destroy();
            hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              videoLoadingOverlay.classList.add('hidden');
              video.play().catch(() => {});
            });
            return;
          }
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              videoStateText.textContent = 'Gagal memuat feed kamera (Offline / Gangguan).';
              if (matchedCam && window.medanCCTVMap) {
                window.medanCCTVMap.setCameraHealth(matchedCam.id, false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = finalUrl;
      video.addEventListener('loadedmetadata', () => {
        videoLoadingOverlay.classList.add('hidden');
        video.play();
        if (matchedCam && window.medanCCTVMap) {
          window.medanCCTVMap.setCameraHealth(matchedCam.id, true, 95);
        }
      });
    } else {
      video.src = finalUrl;
      video.play();
    }
  }

  window.loadStreamGlobal = loadStream;

  // 3b. Reset Active Camera Monitoring (Back to Standby Idle)
  function resetActiveCameraMonitoring() {
    // 1. Destroy HLS & stop stream
    if (hls) {
      hls.destroy();
      hls = null;
    }
    if (video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      video.srcObject = null;
    }
    video.pause();
    video.removeAttribute('src');
    video.load();

    // 2. Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Reset live counters to 0
    const liveCar = document.getElementById('liveInFrameCar');
    const liveMotor = document.getElementById('liveInFrameMotor');
    const liveTotal = document.getElementById('liveInFrameTotal');
    const mapCar = document.getElementById('mapPreviewCar');
    const mapMotor = document.getElementById('mapPreviewMotor');
    const mapDensity = document.getElementById('mapPreviewDensity');
    const osdDensity = document.getElementById('osdDensity');

    if (liveCar) liveCar.textContent = '0';
    if (liveMotor) liveMotor.textContent = '0';
    if (liveTotal) liveTotal.textContent = '0';
    if (mapCar) mapCar.textContent = '0';
    if (mapMotor) mapMotor.textContent = '0';
    if (mapDensity) mapDensity.textContent = 'Lalu Lintas: Standby';
    if (osdDensity) osdDensity.innerHTML = 'Status: <span>STANDBY</span>';

    // Reset Per-device Telemetry state
    if (window.trafficAnalytics) {
      window.trafficAnalytics.setActiveCamera('global', 'Standby');
    }

    // 4. Reset Map Mini-HUD
    const previewCamName = document.getElementById('previewCamName');
    if (previewCamName) {
      previewCamName.textContent = 'Pilih salah satu titik kamera di peta untuk memantau';
    }
    const previewPulseDot = document.getElementById('previewPulseDot');
    if (previewPulseDot) previewPulseDot.classList.remove('active-stream');

    // 5. Reset OSD Cam Name & Inputs
    if (osdCamName) osdCamName.textContent = 'Belum Ada Kamera Dipilih';
    if (searchCamInput) searchCamInput.value = '';
    if (streamUrlInput) streamUrlInput.value = '';
    if (presetSelect) presetSelect.value = '';

    // 6. Show Idle Overlay Screen & hide loader
    const idleScreen = document.getElementById('viewportIdleScreen');
    if (idleScreen) idleScreen.classList.remove('hidden');
    videoLoadingOverlay.classList.add('hidden');

    // 7. Clear Map Highlight
    if (window.medanCCTVMap && window.medanCCTVMap.isInitialized) {
      window.medanCCTVMap.clearHighlight();
    }

    // 8. Toggle buttons
    const btnResetMonitoringMap = document.getElementById('btnResetMonitoringMap');
    const btnClearCamSelect = document.getElementById('btnClearCamSelect');
    if (btnResetMonitoringMap) btnResetMonitoringMap.classList.add('hidden');
    if (btnClearCamSelect) btnClearCamSelect.classList.add('hidden');

    // 9. Reset quick chips
    updateActiveChip('');

    showToast('Pemantauan kamera dihentikan (Standby)');
  }

  // Wire Reset Monitoring buttons
  const btnResetMonitoringMap = document.getElementById('btnResetMonitoringMap');
  if (btnResetMonitoringMap) {
    btnResetMonitoringMap.addEventListener('click', resetActiveCameraMonitoring);
  }

  const btnResetMonitoringConsole = document.getElementById('btnResetMonitoringConsole');
  if (btnResetMonitoringConsole) {
    btnResetMonitoringConsole.addEventListener('click', resetActiveCameraMonitoring);
  }

  const btnClearCamSelect = document.getElementById('btnClearCamSelect');
  if (btnClearCamSelect) {
    btnClearCamSelect.addEventListener('click', resetActiveCameraMonitoring);
  }

  // Expose loadStream to window for interactive map popups and pins
  window.loadStreamGlobal = loadStream;

  // Upload video
  videoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (hls) { hls.destroy(); hls = null; }
    if (video.srcObject) { video.srcObject = null; }

    const fileUrl = URL.createObjectURL(file);
    video.src = fileUrl;
    osdCamName.textContent = 'FILE REKAMAN: ' + file.name.toUpperCase();
    videoLoadingOverlay.classList.add('hidden');
    video.play();
    showToast('Memutar file video: ' + file.name);
    window.trafficAnalytics.logEvent('Memutar rekaman video lokal.');
  });

  // Calculate Intersection Over Union (IOU)
  function calculateIOU(boxA, boxB) {
    const xA = Math.max(boxA[0], boxB[0]);
    const yA = Math.max(boxA[1], boxB[1]);
    const xB = Math.min(boxA[0] + boxA[2], boxB[0] + boxB[2]);
    const yB = Math.min(boxA[1] + boxA[3], boxB[1] + boxB[3]);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA[2] * boxA[3];
    const boxBArea = boxB[2] * boxB[3];

    return interArea / (boxAArea + boxBArea - interArea + 0.0001);
  }

  // Check if box belongs to user-defined ROI
  function isBoxInRoi(box, targetRoi) {
    if (!targetRoi) return true;
    const [bx, by, bw, bh] = box;
    const rx = targetRoi.x, ry = targetRoi.y, rw = targetRoi.width, rh = targetRoi.height;

    // Check center point
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    if (cx >= rx && cx <= (rx + rw) && cy >= ry && cy <= (ry + rh)) return true;

    // Check overlap ratio
    const xA = Math.max(bx, rx);
    const yA = Math.max(by, ry);
    const xB = Math.min(bx + bw, rx + rw);
    const yB = Math.min(by + bh, ry + rh);
    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxArea = bw * bh;

    return (interArea / boxArea) > 0.20;
  }

  // Weighted Box Fusion (WBF) - Combines multi-scale detections with confidence weighting for maximum precision
  function applyWeightedBoxFusion(boxes, iouThreshold = 0.40) {
    if (boxes.length === 0) return [];
    
    const categories = ['car', 'motor'];
    const finalBoxes = [];

    categories.forEach(cat => {
      const catBoxes = boxes.filter(b => b.category === cat).sort((a, b) => b.score - a.score);
      const clusters = [];

      catBoxes.forEach(box => {
        let matchedCluster = null;
        for (const cluster of clusters) {
          const iou = calculateIOU(box.bbox, cluster.avgBbox);
          if (iou > iouThreshold) {
            matchedCluster = cluster;
            break;
          }
        }

        if (matchedCluster) {
          matchedCluster.boxes.push(box);
          let sumWeight = 0;
          let sumX = 0, sumY = 0, sumW = 0, sumH = 0;
          let maxScore = 0;

          matchedCluster.boxes.forEach(b => {
            const w = b.score;
            sumWeight += w;
            sumX += b.bbox[0] * w;
            sumY += b.bbox[1] * w;
            sumW += b.bbox[2] * w;
            sumH += b.bbox[3] * w;
            if (b.score > maxScore) maxScore = b.score;
          });

          matchedCluster.avgBbox = [
            sumX / sumWeight,
            sumY / sumWeight,
            sumW / sumWeight,
            sumH / sumWeight
          ];
          // Boost confidence when confirmed across multiple multi-scale slices
          matchedCluster.score = Math.min(0.99, maxScore + Math.min(0.12, (matchedCluster.boxes.length - 1) * 0.04));
        } else {
          clusters.push({
            boxes: [box],
            avgBbox: [...box.bbox],
            score: box.score,
            labelText: box.labelText,
            strokeColor: box.strokeColor,
            category: cat
          });
        }
      });

      clusters.forEach(c => {
        finalBoxes.push({
          category: c.category,
          labelText: c.labelText,
          strokeColor: c.strokeColor,
          score: c.score,
          bbox: c.avgBbox
        });
      });
    });

    return finalBoxes;
  }

  // Non-Maximum Suppression (NMS)
  function applyNMS(boxes, iouThreshold = 0.45) {
    boxes.sort((a, b) => b.score - a.score);
    const selected = [];

    for (let i = 0; i < boxes.length; i++) {
      const boxA = boxes[i];
      let shouldSelect = true;

      for (let j = 0; j < selected.length; j++) {
        const boxB = selected[j];
        if (boxA.category === boxB.category) {
          const iou = calculateIOU(boxA.bbox, boxB.bbox);
          if (iou > iouThreshold) {
            shouldSelect = false;
            break;
          }
        }
      }

      if (shouldSelect) {
        selected.push(boxA);
      }
    }
    return selected;
  }

  // 4. Motion-Aware ByteTrack 2-Phase Velocity Tracker with Traffic Geometry Gate
  function updateTracks(rawDetections, canvasW, canvasH) {
    const rawCars = [];
    const rawBikes = [];
    const rawPersons = [];

    const minConf = confSlider ? parseInt(confSlider.value, 10) / 100 : 0.40;

    // Step 1: Categorize and validate raw detections
    rawDetections.forEach(pred => {
      const [x, y, w, h] = pred.bbox;
      const classId = pred.class.toLowerCase();

      // Filter out invalid bounding boxes (Sky spans & microscopic noise)
      if (w > canvasW * 0.70 || h > canvasH * 0.70) return;
      if (w < 6 || h < 6) return;
      if (pred.score < 0.15) return;
      if (roi && !isBoxInRoi([x, y, w, h], roi)) return;

      const aspectRatio = w / Math.max(1, h);
      const isRoadArea = (y + h > canvasH * 0.08);

      if (!isRoadArea) return;

      // Motorcycle & Rider Detection
      if (classId === 'motorcycle' || classId === 'bicycle' || classId === 'motorbike') {
        if (aspectRatio <= 2.6 && w <= canvasW * 0.48 && h <= canvasH * 0.52) {
          rawBikes.push({
            bbox: [x, y, w, h],
            score: pred.score,
            classId: 'motorcycle'
          });
        }
      } else if (classId === 'person') {
        // Riders on roadway
        if (aspectRatio <= 1.35 && h >= 10 && h <= canvasH * 0.48 && w <= canvasW * 0.38) {
          rawPersons.push({
            bbox: [x, y, w, h],
            score: pred.score,
            classId: 'person'
          });
        }
      } else if (CAR_CLASSES.includes(classId)) {
        // High-precision vehicle detection (Mobil, Truk, Bus, Angkot, Pickup)
        if (aspectRatio >= 0.30 && aspectRatio <= 4.5 && w >= 10 && h >= 8) {
          rawCars.push({
            bbox: [x, y, w, h],
            score: pred.score,
            classId
          });
        }
      }
    });

    const candidateDetections = [];
    const usedPersonIndices = new Set();
    const usedBikeIndices = new Set();

    // Step 2: Intelligent Rider + Motorcycle Geometric Fusion
    if (detectMotor.checked) {
      // 2a. Rider + Motorcycle overlapping combination
      rawPersons.forEach((person, pIdx) => {
        const [px, py, pw, ph] = person.bbox;
        const pcx = px + pw / 2;
        const pcy = py + ph / 2;

        rawBikes.forEach((bike, bIdx) => {
          if (usedBikeIndices.has(bIdx)) return;

          const [bx, by, bw, bh] = bike.bbox;
          const bcx = bx + bw / 2;
          const bcy = by + bh / 2;

          const iou = calculateIOU(person.bbox, bike.bbox);
          const xDist = Math.abs(pcx - bcx);
          const yDist = Math.abs(pcy - bcy);

          // Rider sits directly on or slightly above the motorcycle
          const isOverlapping = iou > 0.04 || (xDist < Math.max(pw, bw) * 0.95 && yDist < Math.max(ph, bh) * 1.35);

          if (isOverlapping) {
            usedPersonIndices.add(pIdx);
            usedBikeIndices.add(bIdx);

            const minX = Math.min(px, bx);
            const minY = Math.min(py, by);
            const maxX = Math.max(px + pw, bx + bw);
            const maxY = Math.max(py + ph, by + bh);

            candidateDetections.push({
              category: 'motor',
              labelText: 'Sepeda Motor',
              strokeColor: COLOR_MOTOR,
              score: Math.min(0.99, Math.max(person.score, bike.score) + 0.15),
              bbox: [minX, minY, maxX - minX, maxY - minY]
            });
          }
        });
      });

      // 2b. Standalone Motorcycles/Bicycles
      rawBikes.forEach((bike, bIdx) => {
        if (!usedBikeIndices.has(bIdx)) {
          candidateDetections.push({
            category: 'motor',
            labelText: 'Sepeda Motor',
            strokeColor: COLOR_MOTOR,
            score: bike.score,
            bbox: [...bike.bbox]
          });
        }
      });

      // 2c. Standalone Riders on Roadway Corridor
      rawPersons.forEach((person, pIdx) => {
        if (!usedPersonIndices.has(pIdx) && person.bbox[1] > canvasH * 0.12) {
          candidateDetections.push({
            category: 'motor',
            labelText: 'Sepeda Motor',
            strokeColor: COLOR_MOTOR,
            score: person.score,
            bbox: [...person.bbox]
          });
        }
      });
    }

    // Step 3: Mobil, Truk & Bus Fusion
    if (detectCars.checked) {
      rawCars.forEach(car => {
        const label = car.classId === 'car' ? 'Mobil' : (car.classId === 'truck' ? 'Truk' : 'Bus');
        candidateDetections.push({
          category: 'car',
          labelText: label,
          strokeColor: COLOR_CAR,
          score: car.score,
          bbox: [...car.bbox]
        });
      });
    }

    // Step 4: High-Precision Weighted Box Fusion (WBF)
    let validDetections = applyWeightedBoxFusion(candidateDetections, 0.40);

    // Spatial cluster merging (merge duplicate boxes)
    const filteredDetections = [];
    validDetections.forEach(det => {
      const cx = det.bbox[0] + det.bbox[2] / 2;
      const cy = det.bbox[1] + det.bbox[3] / 2;
      const duplicate = filteredDetections.find(existing => {
        if (existing.category !== det.category) return false;
        const exCx = existing.bbox[0] + existing.bbox[2] / 2;
        const exCy = existing.bbox[1] + existing.bbox[3] / 2;
        return Math.hypot(cx - exCx, cy - exCy) < 24;
      });
      if (!duplicate) {
        filteredDetections.push(det);
      }
    });

    // ByteTrack 2-Phase Association:
    // High-confidence detections for primary matching, Low-confidence for track recovery
    const highDetections = [];
    const lowDetections = [];
    const highConfThresh = Math.max(0.32, minConf * 0.85);

    filteredDetections.forEach((d, idx) => {
      d._origIdx = idx;
      if (d.score >= highConfThresh) {
        highDetections.push(d);
      } else {
        lowDetections.push(d);
      }
    });

    const matchedTrackIndices = new Set();
    const matchedHighDetIndices = new Set();

    // Helper: Match track to candidate detection
    function matchDetectionsToTracks(detsList, markMatchedDets = true) {
      detsList.forEach(det => {
        let bestMatchScore = 0.10;
        let bestTIdx = -1;

        const detCx = det.bbox[0] + det.bbox[2] / 2;
        const detCy = det.bbox[1] + det.bbox[3] / 2;

        trackedObjects.forEach((track, tIdx) => {
          if (matchedTrackIndices.has(tIdx)) return;
          if (track.category !== det.category) return;

          const predictedBox = [
            track.bbox[0] + (track.vx || 0),
            track.bbox[1] + (track.vy || 0),
            track.bbox[2],
            track.bbox[3]
          ];

          const iou = calculateIOU(predictedBox, det.bbox);
          const predCx = predictedBox[0] + predictedBox[2] / 2;
          const predCy = predictedBox[1] + predictedBox[3] / 2;
          const dist = Math.hypot(detCx - predCx, detCy - predCy);

          const maxDist = Math.max(det.bbox[2], det.bbox[3], 90);
          const distScore = Math.max(0, 1 - dist / maxDist);
          const matchScore = (iou * 0.55) + (distScore * 0.45);

          if (dist < 50 || matchScore > bestMatchScore) {
            if (matchScore > bestMatchScore || dist < 50) {
              bestMatchScore = matchScore;
              bestTIdx = tIdx;
            }
          }
        });

        if (bestTIdx !== -1) {
          matchedTrackIndices.add(bestTIdx);
          if (markMatchedDets) matchedHighDetIndices.add(det._origIdx);

          const t = trackedObjects[bestTIdx];
          const newVx = det.bbox[0] - t.bbox[0];
          const newVy = det.bbox[1] - t.bbox[1];
          
          t.totalDisplacement = Math.hypot(det.bbox[0] - t.startX, det.bbox[1] - t.startY);

          // ByteTrack Velocity Kalman Filter smoothing
          const speed = Math.hypot(newVx, newVy);
          if (speed < 3.5) {
            t.vx = (t.vx || 0) * 0.10;
            t.vy = (t.vy || 0) * 0.10;
            t.stationaryFrames = (t.stationaryFrames || 0) + 1;
          } else {
            t.vx = (t.vx || 0) * 0.30 + newVx * 0.70;
            t.vy = (t.vy || 0) * 0.30 + newVy * 0.70;
            t.stationaryFrames = 0;
          }

          const pixelSpeed = Math.hypot(t.vx || 0, t.vy || 0);
          const rawKmh = pixelSpeed * 0.55 * 25;
          t.speedKmh = Math.min(120, Math.max(0, ((t.speedKmh || 0) * 0.60 + rawKmh * 0.40)));

          t.score = det.score;
          t.labelText = det.labelText;
          t.seenFrames++;
          t.missedFrames = 0;

          if (t.seenFrames >= 8 && t.totalDisplacement < 8 && (t.speedKmh || 0) < 2) {
            t.isStaticScenery = true;
          }

          // Smooth Exponential Moving Average for Bounding Box
          const alpha = 0.75;
          t.bbox[0] = t.bbox[0] * (1 - alpha) + det.bbox[0] * alpha;
          t.bbox[1] = t.bbox[1] * (1 - alpha) + det.bbox[1] * alpha;
          t.bbox[2] = t.bbox[2] * (1 - alpha) + det.bbox[2] * alpha;
          t.bbox[3] = t.bbox[3] * (1 - alpha) + det.bbox[3] * alpha;

          // ETLE Helmet Safety Multi-Feature Analysis for Motorcycles:
          if (isHelmetDetectionEnabled && t.category === 'motor' && t.seenFrames >= 4 && !t.isStaticScenery) {
            if (t.bbox[3] >= 38 && t.bbox[2] >= 20) {
              const headH = Math.max(8, Math.round(t.bbox[3] * 0.25));
              const headW = Math.max(8, Math.round(t.bbox[2] * 0.48));
              const headX = Math.round(t.bbox[0] + (t.bbox[2] - headW) / 2);
              const headY = Math.round(t.bbox[1]);
              
              try {
                const clW = Math.min(headW, canvasW - Math.max(0, headX));
                const clH = Math.min(headH, canvasH - Math.max(0, headY));
                if (clW >= 6 && clH >= 6) {
                  const headData = fullCropCtx.getImageData(Math.max(0, headX), Math.max(0, headY), clW, clH);
                  let skinPixels = 0;
                  let darkHairPixels = 0;
                  const totalPx = headData.data.length / 4;

                  for (let i = 0; i < headData.data.length; i += 4) {
                    const r = headData.data[i];
                    const g = headData.data[i+1];
                    const b = headData.data[i+2];
                    
                    const isSkinTone = (r > 75 && g > 45 && b > 30 && r > g && r > b && (r - g) > 10 && (r - b) > 12);
                    if (isSkinTone) skinPixels++;

                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    if (lum < 40 && !isSkinTone) darkHairPixels++;
                  }

                  const skinRatio = totalPx > 0 ? skinPixels / totalPx : 0;
                  const hairRatio = totalPx > 0 ? darkHairPixels / totalPx : 0;
                  const isBareHeadDetected = (skinRatio > 0.26) || (skinRatio > 0.14 && hairRatio > 0.32);

                  t.noHelmetScore = ((t.noHelmetScore || 0) * 0.70) + (isBareHeadDetected ? 0.30 : 0);
                  t.noHelmet = (t.noHelmetScore > 0.55 && t.seenFrames >= 6);
                } else {
                  t.noHelmet = false;
                }
              } catch (e) {
                t.noHelmet = false;
              }
            } else {
              t.noHelmet = false;
            }
          } else {
            t.noHelmet = false;
          }

          // Overcapacity analysis: multiple rider silhouette elongation
          if (isOvercapacityEnabled && t.category === 'motor') {
            const bikeAspect = t.bbox[2] / Math.max(1, t.bbox[3]);
            t.isOvercapacity = (bikeAspect > 1.20 && t.bbox[2] > canvasW * 0.15);
          } else {
            t.isOvercapacity = false;
          }

          // STRICT 1-TIME COUNTING: must be confirmed across 3 consecutive frames and NOT static scenery
          if (!t.counted && t.seenFrames >= 3 && !t.isStaticScenery) {
            t.counted = true;
            window.trafficAnalytics.incrementCumulative(t.category);
            window.trafficAnalytics.logEvent(`Kendaraan terhitung: ${t.labelText} #${t.id}`);
            if (t.noHelmet) {
              window.trafficAnalytics.logEvent(`🚨 Pelanggaran ETLE: Pengendara Tanpa Helm #${t.id}`);
            }
          }
        }
      });
    }

    // Phase 1: High-Score Detection Association
    matchDetectionsToTracks(highDetections, true);

    // Phase 2: Low-Score Detection Association for Unmatched Active Track Recovery
    matchDetectionsToTracks(lowDetections, false);

    // Phase 3: Create new tracks ONLY from unmatched High-Confidence Detections (Zero Ghost Boxes!)
    filteredDetections.forEach((det, dIdx) => {
      if (!matchedHighDetIndices.has(dIdx) && det.score >= highConfThresh) {
        trackedObjects.push({
          id: nextTrackId++,
          category: det.category,
          labelText: det.labelText,
          strokeColor: det.strokeColor,
          score: det.score,
          bbox: [...det.bbox],
          startX: det.bbox[0],
          startY: det.bbox[1],
          totalDisplacement: 0,
          isStaticScenery: false,
          noHelmet: false,
          isOvercapacity: false,
          vx: 0,
          vy: 0,
          seenFrames: 1,
          counted: false,
          missedFrames: 0,
          stationaryFrames: 0,
          isContraflow: false,
          isStalled: false
        });
      }
    });

    // Compute dominant roadway traffic flow vector
    let sumVx = 0, sumVy = 0, flowCount = 0;
    trackedObjects.forEach(t => {
      if ((t.speedKmh || 0) > 8 && t.missedFrames === 0) {
        sumVx += t.vx;
        sumVy += t.vy;
        flowCount++;
      }
    });

    const flowMag = Math.hypot(sumVx, sumVy);
    const avgFlowVx = flowMag > 0 ? sumVx / flowMag : 0;
    const avgFlowVy = flowMag > 0 ? sumVy / flowMag : 0;

    // Detect Traffic Anomalies (Contraflow / Stalled)
    if (isAnomalyDetectionEnabled) {
      trackedObjects.forEach(t => {
        const vMag = Math.hypot(t.vx, t.vy);
        if (flowCount >= 3 && vMag > 2 && (t.speedKmh || 0) > 12) {
          const normVx = t.vx / vMag;
          const normVy = t.vy / vMag;
          const alignment = (normVx * avgFlowVx) + (normVy * avgFlowVy);
          t.isContraflow = alignment < -0.55;
        } else {
          t.isContraflow = false;
        }

        t.isStalled = (t.stationaryFrames || 0) > 35 && (t.bbox[1] + t.bbox[3] / 2 > canvasH * 0.22);
      });
    }

    // Trajectory prediction for temporarily missed tracks (Kalman Linear Velocity Extrapolator)
    trackedObjects.forEach((track, tIdx) => {
      if (!matchedTrackIndices.has(tIdx)) {
        track.missedFrames++;
        if (track.missedFrames <= 8) {
          track.bbox[0] += (track.vx || 0) * 0.6;
          track.bbox[1] += (track.vy || 0) * 0.6;
        }
      }
    });

    // Retain tracks for up to 18 frames for red-light traffic
    trackedObjects = trackedObjects.filter(t => t.missedFrames <= 18);
  }

  // 5. Enhanced Multi-Scale Slicing & Adaptive 5-Zone SAHI Dense Attention Pyramid
  async function runMultiScaleInference(minConf, vWidth, vHeight) {
    const rawResults = [];

    // Preprocessing with high-definition edge contrast and neural sharpening
    fullCropCanvas.width = vWidth;
    fullCropCanvas.height = vHeight;
    fullCropCtx.filter = 'contrast(1.15) brightness(1.05) saturate(1.10)';
    fullCropCtx.drawImage(video, 0, 0, vWidth, vHeight);

    const effectiveConf = Math.max(0.16, minConf);

    // Pass 1: If User-Defined ROI is Active, Dedicate Ultra High-Res Inference
    if (roi && roi.width > 25 && roi.height > 25) {
      roiCanvas.width = 512;
      roiCanvas.height = 512;
      roiCtx.drawImage(fullCropCanvas, roi.x, roi.y, roi.width, roi.height, 0, 0, 512, 512);

      const roiDetections = await model.detect(roiCanvas, 36, effectiveConf * 0.70);
      roiDetections.forEach(d => {
        const scaleX = roi.width / 512;
        const scaleY = roi.height / 512;
        rawResults.push({
          class: d.class,
          score: d.score,
          bbox: [
            roi.x + d.bbox[0] * scaleX,
            roi.y + d.bbox[1] * scaleY,
            d.bbox[2] * scaleX,
            d.bbox[3] * scaleY
          ]
        });
      });
    }

    // Pass 2: Full Frame Global Detection (Captures foreground/midground vehicles)
    const fullDetections = await model.detect(fullCropCanvas, 40, Math.max(0.18, effectiveConf * 0.70));
    rawResults.push(...fullDetections);

    if (inferenceScale === 'nano_fast' || activeEngine === 'yolo26') {
      return rawResults;
    }

    // Pass 3: Sliced Tile 1 (Distant Traffic Horizon - 2.2x High-Density Zoom for far cars & bikes)
    const tile1W = Math.round(vWidth * 0.80);
    const tile1H = Math.round(vHeight * 0.55);
    const tile1X = Math.round(vWidth * 0.10);
    const tile1Y = Math.round(vHeight * 0.08);

    tileCanvas1.width = 512;
    tileCanvas1.height = 512;
    tileCtx1.drawImage(fullCropCanvas, tile1X, tile1Y, tile1W, tile1H, 0, 0, 512, 512);

    const tile1Detections = await model.detect(tileCanvas1, 36, Math.max(0.18, effectiveConf * 0.65));
    tile1Detections.forEach(d => {
      const scaleX = tile1W / 512;
      const scaleY = tile1H / 512;
      rawResults.push({
        class: d.class,
        score: d.score,
        bbox: [
          tile1X + d.bbox[0] * scaleX,
          tile1Y + d.bbox[1] * scaleY,
          d.bbox[2] * scaleX,
          d.bbox[3] * scaleY
        ]
      });
    });

    // Pass 4: Sliced Tile 2 (Main Roadway Core Corridor - Middle & Lower Traffic Corridor)
    const tile2W = Math.round(vWidth * 0.90);
    const tile2H = Math.round(vHeight * 0.70);
    const tile2X = Math.round(vWidth * 0.05);
    const tile2Y = Math.round(vHeight * 0.25);

    tileCanvas2.width = 512;
    tileCanvas2.height = 512;
    tileCtx2.drawImage(fullCropCanvas, tile2X, tile2Y, tile2W, tile2H, 0, 0, 512, 512);

    const tile2Detections = await model.detect(tileCanvas2, 36, Math.max(0.18, effectiveConf * 0.65));
    tile2Detections.forEach(d => {
      const scaleX = tile2W / 512;
      const scaleY = tile2H / 512;
      rawResults.push({
        class: d.class,
        score: d.score,
        bbox: [
          tile2X + d.bbox[0] * scaleX,
          tile2Y + d.bbox[1] * scaleY,
          d.bbox[2] * scaleX,
          d.bbox[3] * scaleY
        ]
      });
    });

    // Pass 5: Dense Attention Pyramid (5-Zone High-Density Cross Slicing)
    if (inferenceScale === 'transformer_dense') {
      const tile3W = Math.round(vWidth * 0.60);
      const tile3H = Math.round(vHeight * 0.60);
      const tile3X = Math.round(vWidth * 0.20);
      const tile3Y = Math.round(vHeight * 0.30);

      tileCanvas1.width = 512;
      tileCanvas1.height = 512;
      tileCtx1.drawImage(fullCropCanvas, tile3X, tile3Y, tile3W, tile3H, 0, 0, 512, 512);

      const tile3Detections = await model.detect(tileCanvas1, 36, Math.max(0.16, effectiveConf * 0.60));
      tile3Detections.forEach(d => {
        const scaleX = tile3W / 512;
        const scaleY = tile3H / 512;
        rawResults.push({
          class: d.class,
          score: d.score,
          bbox: [
            tile3X + d.bbox[0] * scaleX,
            tile3Y + d.bbox[1] * scaleY,
            d.bbox[2] * scaleX,
            d.bbox[3] * scaleY
          ]
        });
      });
    }

    return rawResults;
  }

  // 6. Detection Frame Loop
  async function detectLoop() {
    // 1. Guard: If no city has been activated yet, completely stop tracking & detection
    if (!isCityActivated) {
      trackedObjects = [];
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      animationFrameId = requestAnimationFrame(detectLoop);
      return;
    }

    // Zero CPU/GPU AI load when on Map View
    if (!isAiRunning || (mainLayout && mainLayout.classList.contains('mode-map'))) {
      trackedObjects = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      animationFrameId = requestAnimationFrame(detectLoop);
      return;
    }

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 360;

    if (canvas.width !== vWidth || canvas.height !== vHeight) {
      canvas.width = vWidth;
      canvas.height = vHeight;
    }

    // FPS Update safely
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastFpsUpdate = now;
      if (osdFps) {
        const b = osdFps.querySelector('b');
        if (b) b.textContent = fps;
        else osdFps.textContent = `AI: ${fps} FPS`;
      }
    }

    // AI Multi-Scale Inference with Adaptive Lightweight Throttling (~20 FPS budget for low CPU/GPU load)
    const INFERENCE_BUDGET_MS = 48; // ~20.8 FPS AI inference rate (industry standard for lightweight real-time surveillance)
    if (model && video.readyState >= 2 && !video.paused && !video.ended && !isDetecting && (now - lastInferenceTimestamp >= INFERENCE_BUDGET_MS)) {
      isDetecting = true;
      lastInferenceTimestamp = now;
      try {
        const minConf = parseInt(confSlider.value, 10) / 100;
        const allPredictions = await runMultiScaleInference(minConf, vWidth, vHeight);
        updateTracks(allPredictions, canvas.width, canvas.height);
      } catch (err) {
        console.warn('Detection error:', err);
      } finally {
        isDetecting = false;
      }
    }

    renderScene();
    animationFrameId = requestAnimationFrame(detectLoop);
  }

  // 7. Render High-Tech HUD, Bounding Boxes & Live Interactive Selection
  function renderScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const showLabels = showLabelsToggle.checked;
    let liveCar = 0;
    let liveMotor = 0;
    let livePerson = 0;

    // 1. Draw Active Locked ROI Zone
    if (roi) {
      ctx.save();
      // Dim exterior background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, canvas.width, roi.y);
      ctx.fillRect(0, roi.y + roi.height, canvas.width, canvas.height - (roi.y + roi.height));
      ctx.fillRect(0, roi.y, roi.x, roi.height);
      ctx.fillRect(roi.x + roi.width, roi.y, canvas.width - (roi.x + roi.width), roi.height);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(roi.x, roi.y, roi.width, roi.height);
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
      
      // Corner Brackets
      ctx.setLineDash([]);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#38bdf8';
      const cSize = Math.min(18, roi.width / 4, roi.height / 4);
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(roi.x, roi.y + cSize); ctx.lineTo(roi.x, roi.y); ctx.lineTo(roi.x + cSize, roi.y);
      // Top-Right
      ctx.moveTo(roi.x + roi.width - cSize, roi.y); ctx.lineTo(roi.x + roi.width, roi.y); ctx.lineTo(roi.x + roi.width, roi.y + cSize);
      // Bottom-Left
      ctx.moveTo(roi.x, roi.y + roi.height - cSize); ctx.lineTo(roi.x, roi.y + roi.height); ctx.lineTo(roi.x + cSize, roi.y + roi.height);
      // Bottom-Right
      ctx.moveTo(roi.x + roi.width - cSize, roi.y + roi.height); ctx.lineTo(roi.x + roi.width, roi.y + roi.height); ctx.lineTo(roi.x + roi.width, roi.y + roi.height - cSize);
      ctx.stroke();

      // ROI Label Badge
      ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
      const roiLabel = `📍 ZONA FOKUS (${Math.round(roi.width)}×${Math.round(roi.height)} px)`;
      const roiTextW = ctx.measureText(roiLabel).width;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(roi.x, Math.max(0, roi.y - 22), roiTextW + 14, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(roiLabel, roi.x + 7, Math.max(14, roi.y - 8));
      ctx.restore();
    }

    // 2. Draw Live Interactive Selection while Dragging Mouse/Touch
    if (isDrawingRoi && roiStartPoint && roiCurrentPoint) {
      const selX = Math.min(roiStartPoint.x, roiCurrentPoint.x);
      const selY = Math.min(roiStartPoint.y, roiCurrentPoint.y);
      const selW = Math.abs(roiCurrentPoint.x - roiStartPoint.x);
      const selH = Math.abs(roiCurrentPoint.y - roiStartPoint.y);

      ctx.save();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.fillRect(selX, selY, selW, selH);

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      ctx.strokeRect(selX, selY, selW, selH);

      // Corner handles
      ctx.setLineDash([]);
      ctx.fillStyle = '#00e5ff';
      const handleSize = 8;
      ctx.fillRect(selX - handleSize/2, selY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(selX + selW - handleSize/2, selY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(selX - handleSize/2, selY + selH - handleSize/2, handleSize, handleSize);
      ctx.fillRect(selX + selW - handleSize/2, selY + selH - handleSize/2, handleSize, handleSize);

      // Dimension and release guide
      const dimLabel = `📐 ${Math.round(selW)} × ${Math.round(selH)} px (Lepaskan untuk mengunci)`;
      ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
      const dimW = ctx.measureText(dimLabel).width;
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(selX, Math.max(0, selY - 22), dimW + 14, 20);
      ctx.fillStyle = '#0b0f17';
      ctx.fillText(dimLabel, selX + 7, Math.max(14, selY - 8));
      ctx.restore();
    }

        // 3. Draw Tracked Vehicle & Pedestrian Bounding Boxes
    let totalSpeedSum = 0;
    let movingCount = 0;

    trackedObjects.forEach(obj => {
      // Suppress static scenery artifacts (e.g. painted billboards and signs)
      if (obj.isStaticScenery) return;

      const [x, y, w, h] = obj.bbox;
      let strokeColor = obj.strokeColor;

      // Anomaly Color Overrides
      if (obj.isContraflow) {
        strokeColor = '#f43f5e'; // Crimson Red for Contraflow
      } else if (obj.isStalled) {
        strokeColor = '#fbbf24'; // Amber Yellow for Stalled Vehicle
      } else if (obj.noHelmet) {
        strokeColor = '#e11d48'; // Rose Red for No Helmet
      } else if (obj.isOvercapacity) {
        strokeColor = '#ea580c'; // Orange for Overcapacity
      }

      if (obj.category === 'car') liveCar++;
      else if (obj.category === 'motor') liveMotor++;

      // Accumulate speed for OSD average flow speed
      const kmh = obj.speedKmh || 0;
      if (kmh > 2) { totalSpeedSum += kmh; movingCount++; }

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = (obj.isContraflow || obj.noHelmet) ? 3.5 : 2.5;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = (obj.isContraflow || obj.noHelmet) ? 14 : 8;

      // Draw Main Bounding Box
      if (obj.isStalled) {
        ctx.setLineDash([5, 4]);
      }
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Draw Corner Accents
      const corner = Math.min(14, w / 4, h / 4);
      ctx.lineWidth = (obj.isContraflow || obj.noHelmet) ? 4.0 : 3.5;
      ctx.beginPath();
      // Top Left
      ctx.moveTo(x, y + corner); ctx.lineTo(x, y); ctx.lineTo(x + corner, y);
      // Top Right
      ctx.moveTo(x + w - corner, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + corner);
      // Bottom Left
      ctx.moveTo(x, y + h - corner); ctx.lineTo(x, y + h); ctx.lineTo(x + corner, y + h);
      // Bottom Right
      ctx.moveTo(x + w - corner, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - corner);
      ctx.stroke();

      // Draw Motion Trail Vector with Direction Arrowhead if moving
      const vSpeed = Math.hypot(obj.vx || 0, obj.vy || 0);
      if (vSpeed > 1.2) {
        const startX = x + w / 2;
        const startY = y + h / 2;
        const endX = startX + (obj.vx || 0) * 3.5;
        const endY = startY + (obj.vy || 0) * 3.5;

        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(obj.vy, obj.vx);
        const headLen = 6;
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }

      // Draw Badge Label with speed & Anomaly Warning
      if (showLabels) {
        let badgeText = '';
        let badgeBg = strokeColor;
        let badgeFg = '#0b0f17';

        if (obj.isContraflow) {
          badgeText = `⚠️ LAWAN ARAH · ${Math.round(kmh)} km/j`;
          badgeBg = '#f43f5e';
          badgeFg = '#ffffff';
        } else if (obj.isStalled) {
          badgeText = `⚠️ KENDARAAN MOGOK / BERHENTI`;
          badgeBg = '#fbbf24';
          badgeFg = '#0b0f17';
        } else if (obj.noHelmet) {
          badgeText = `🪖 TANPA HELM #${obj.id}`;
          badgeBg = '#e11d48';
          badgeFg = '#ffffff';
        } else if (obj.isOvercapacity) {
          badgeText = `👥 BONCENG 3+ #${obj.id}`;
          badgeBg = '#ea580c';
          badgeFg = '#ffffff';
        } else {
          const scorePercent = Math.round(obj.score * 100);
          const speedLabel = kmh > 2 ? ` · ${Math.round(kmh)} km/j` : ' · Berhenti';
          badgeText = `${obj.labelText} #${obj.id} (${scorePercent}%)${speedLabel}`;
        }

        ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
        const textWidth = ctx.measureText(badgeText).width;
        const badgeH = 20;

        ctx.fillStyle = badgeBg;
        ctx.shadowBlur = 0;
        ctx.fillRect(x, Math.max(0, y - badgeH), textWidth + 14, badgeH);

        ctx.fillStyle = badgeFg;
        ctx.fillText(badgeText, x + 7, Math.max(14, y - 5));
      }

      ctx.restore();
    });

    // Lightweight Throttle for DOM & Telemetry Updates (150ms interval to eliminate DOM thrashing & reduce CPU)
    const nowTime = performance.now();
    if (nowTime - lastTelemetryUpdateTimestamp >= 150) {
      lastTelemetryUpdateTimestamp = nowTime;

      // Update OSD average flow speed badge
      const osdSpeedBadge = document.getElementById('osdSpeedBadge');
      if (osdSpeedBadge) {
        const avgSpeed = movingCount > 0 ? Math.round(totalSpeedSum / movingCount) : 0;
        const flowLabel = avgSpeed > 40 ? 'Lancar' : avgSpeed > 20 ? 'Sedang' : avgSpeed > 5 ? 'Padat' : 'Macet';
        osdSpeedBadge.innerHTML = `⚡ Arus: <b>${avgSpeed}</b> km/jam · ${flowLabel}`;
      }

      // Update Analytics Telemetry
      if (window.trafficAnalytics) {
        window.trafficAnalytics.update(liveCar, liveMotor);
      }

      // Update Map Live Preview Mini-HUD
      const mapPreviewCar = document.getElementById('mapPreviewCar');
      const mapPreviewMotor = document.getElementById('mapPreviewMotor');
      const mapPreviewDensity = document.getElementById('mapPreviewDensity');
      if (mapPreviewCar) mapPreviewCar.textContent = liveCar;
      if (mapPreviewMotor) mapPreviewMotor.textContent = liveMotor;
      if (mapPreviewDensity) {
        const total = liveCar + liveMotor;
        if (total >= 10) {
          mapPreviewDensity.textContent = 'Lalu Lintas: Padat';
          mapPreviewDensity.style.color = '#f43f5e';
        } else if (total >= 4) {
          mapPreviewDensity.textContent = 'Lalu Lintas: Ramai';
          mapPreviewDensity.style.color = '#fbbf24';
        } else {
          mapPreviewDensity.textContent = 'Lalu Lintas: Lancar';
          mapPreviewDensity.style.color = '#10b981';
        }
      }
    }
  }

  // 8. ROI Interactive Drawing Listeners (Pointer & Touch Supported)
  const roiFloatingHud = document.getElementById('roiFloatingHud');
  const roiSizePill = document.getElementById('roiSizePill');
  const btnRoiRedraw = document.getElementById('btnRoiRedraw');
  const btnRoiClear = document.getElementById('btnRoiClear');

  function startDrawingRoi() {
    isDrawingRoi = true;
    roiStartPoint = null;
    roiCurrentPoint = null;
    btnDrawRoi.classList.add('active');
    btnDrawRoi.querySelector('span').textContent = 'Menggambar Zona...';
    canvas.classList.add('drawing-roi');
    if (videoContainer) videoContainer.classList.add('roi-drawing-mode');
    if (roiFloatingHud) roiFloatingHud.classList.add('hidden');
    showToast('Klik/Sentuh dan tarik kursor pada video untuk memilih zona fokus');
  }

  function clearRoiZone() {
    roi = null;
    roiStartPoint = null;
    roiCurrentPoint = null;
    isDrawingRoi = false;
    btnDrawRoi.classList.remove('active');
    btnDrawRoi.querySelector('span').textContent = 'Set Zona Deteksi';
    canvas.classList.remove('drawing-roi');
    if (videoContainer) videoContainer.classList.remove('roi-drawing-mode');
    if (roiFloatingHud) roiFloatingHud.classList.add('hidden');
    showToast('Zona deteksi dinonaktifkan (kembali ke seluruh layar)');
  }

  function updateRoiHud() {
    if (!roi) {
      if (roiFloatingHud) roiFloatingHud.classList.add('hidden');
      btnDrawRoi.classList.remove('active');
      btnDrawRoi.querySelector('span').textContent = 'Set Zona Deteksi';
      return;
    }

    if (roiFloatingHud) {
      roiFloatingHud.classList.remove('hidden');
      if (roiSizePill) {
        roiSizePill.textContent = `${Math.round(roi.width)} × ${Math.round(roi.height)} px`;
      }
    }
    btnDrawRoi.classList.add('active');
    btnDrawRoi.querySelector('span').textContent = 'Zona Fokus (Aktif)';
  }

  btnDrawRoi.addEventListener('click', () => {
    if (roi) {
      clearRoiZone();
    } else {
      startDrawingRoi();
    }
  });

  if (btnRoiRedraw) btnRoiRedraw.addEventListener('click', startDrawingRoi);
  if (btnRoiClear) btnRoiClear.addEventListener('click', clearRoiZone);

  // Unified Pointer (Mouse + Touch) Event Handlers
  function getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const curW = canvas.width || video.videoWidth || 640;
    const curH = canvas.height || video.videoHeight || 360;
    const scaleX = curW / rect.width;
    const scaleY = curH / rect.height;
    return {
      x: Math.max(0, Math.min(curW, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(curH, (clientY - rect.top) * scaleY))
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!isDrawingRoi) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    roiStartPoint = getCanvasCoords(e.clientX, e.clientY);
    roiCurrentPoint = { ...roiStartPoint };
    renderScene();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDrawingRoi || !roiStartPoint) return;
    e.preventDefault();
    roiCurrentPoint = getCanvasCoords(e.clientX, e.clientY);
    renderScene();
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!isDrawingRoi || !roiStartPoint) return;
    e.preventDefault();
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}

    const endPoint = getCanvasCoords(e.clientX, e.clientY);
    const x = Math.min(roiStartPoint.x, endPoint.x);
    const y = Math.min(roiStartPoint.y, endPoint.y);
    const w = Math.abs(endPoint.x - roiStartPoint.x);
    const h = Math.abs(endPoint.y - roiStartPoint.y);

    if (w > 25 && h > 25) {
      roi = { x, y, width: w, height: h };
      updateRoiHud();
      showToast('Zona deteksi terkunci! Neural zoom presisi tinggi aktif pada area terpilih.');
    } else {
      roi = null;
      updateRoiHud();
      showToast('Seleksi terlalu kecil, dibatalkan');
    }

    isDrawingRoi = false;
    roiStartPoint = null;
    roiCurrentPoint = null;
    canvas.classList.remove('drawing-roi');
    if (videoContainer) videoContainer.classList.remove('roi-drawing-mode');
    renderScene();
  });

  canvas.addEventListener('pointercancel', (e) => {
    if (!isDrawingRoi) return;
    isDrawingRoi = false;
    roiStartPoint = null;
    roiCurrentPoint = null;
    canvas.classList.remove('drawing-roi');
    if (videoContainer) videoContainer.classList.remove('roi-drawing-mode');
    renderScene();
  });

  // 9. Snapshot
  btnSnapshot.addEventListener('click', () => {
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = canvas.width;
    snapCanvas.height = canvas.height;
    const snapCtx = snapCanvas.getContext('2d');

    snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
    snapCtx.drawImage(canvas, 0, 0, snapCanvas.width, snapCanvas.height);

    snapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    snapCtx.fillRect(10, snapCanvas.height - 40, 520, 30);
    snapCtx.fillStyle = '#00e5ff';
    snapCtx.font = '12px JetBrains Mono, monospace';
    snapCtx.fillText(`CCTV AI VISION | ${osdCamName.textContent} | ${new Date().toLocaleString('id-ID')}`, 20, snapCanvas.height - 20);

    const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.95);
    snapshotImg.src = dataUrl;
    btnDownloadSnapshot.href = dataUrl;

    const cars = document.getElementById('countCar').textContent;
    const motors = document.getElementById('countMotor').textContent;
    snapshotInfo.textContent = `Total Kumulatif: ${cars} Mobil, ${motors} Sepeda Motor`;

    snapshotModal.style.display = 'flex';
  });

  const btnCloseSnapshotFooter = document.getElementById('btnCloseSnapshotFooter');

  function closeSnapshotModal() {
    if (snapshotModal) snapshotModal.style.display = 'none';
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeSnapshotModal);
  }

  if (btnCloseSnapshotFooter) {
    btnCloseSnapshotFooter.addEventListener('click', closeSnapshotModal);
  }

  if (snapshotModal) {
    snapshotModal.addEventListener('click', (e) => {
      if (e.target === snapshotModal) closeSnapshotModal();
    });
  }

  // 10. Live CCTV Stream Video Recording Suite (Local Disk & Google Drive Configs)
  let isRecording = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingTimerInterval = null;
  let recordingSeconds = 0;
  let recCompositeCanvas = document.createElement('canvas');
  let recCompositeCtx = recCompositeCanvas.getContext('2d');
  let recAnimationId = null;

  // Storage Destination & Quality Configs
  let storageDestination = localStorage.getItem('cctv_storage_dest') || 'local'; // 'local' | 'drive'
  let recordingBitrate = parseInt(localStorage.getItem('cctv_rec_bitrate') || '3500000', 10);
  let recordingMode = localStorage.getItem('cctv_rec_mode') || 'annotated'; // 'annotated' | 'raw'
  let autoDownloadRecording = localStorage.getItem('cctv_auto_dl_rec') !== 'false';

  const recordingModal = document.getElementById('recordingModal');
  const recordingPreviewVideo = document.getElementById('recordingPreviewVideo');
  const btnCloseRecordingModalX = document.getElementById('btnCloseRecordingModalX');
  const btnCloseRecordingModalFooter = document.getElementById('btnCloseRecordingModalFooter');
  const btnDownloadRecording = document.getElementById('btnDownloadRecording');
  const btnOpenGDriveUpload = document.getElementById('btnOpenGDriveUpload');
  const recMetaCamName = document.getElementById('recMetaCamName');
  const recMetaDuration = document.getElementById('recMetaDuration');
  const recMetaFileSize = document.getElementById('recMetaFileSize');
  const recMetaFormat = document.getElementById('recMetaFormat');

  // Config Modal Elements for Recording
  const btnStorageLocal = document.getElementById('btnStorageLocal');
  const btnStorageDrive = document.getElementById('btnStorageDrive');
  const storageHintText = document.getElementById('storageHintText');
  const recordingBitrateSelect = document.getElementById('recordingBitrateSelect');
  const recordingModeSelect = document.getElementById('recordingModeSelect');
  const autoDownloadRecordingToggle = document.getElementById('autoDownloadRecordingToggle');

  function updateStorageUiState() {
    if (btnStorageLocal && btnStorageDrive) {
      btnStorageLocal.classList.toggle('active', storageDestination === 'local');
      btnStorageDrive.classList.toggle('active', storageDestination === 'drive');
    }
    if (storageHintText) {
      if (storageDestination === 'local') {
        storageHintText.innerHTML = 'File video akan disimpan langsung ke folder <b>Downloads</b> laptop Anda secara otomatis setelah tombol Stop ditekan.';
      } else {
        storageHintText.innerHTML = 'File video akan disiapkan dan tab <b>Google Drive</b> akan otomatis terbuka untuk memudahkan upload rekaman ke Cloud.';
      }
    }
    if (recordingBitrateSelect) {
      recordingBitrateSelect.value = recordingBitrate.toString();
    }
    if (recordingModeSelect) {
      recordingModeSelect.value = recordingMode;
    }
    if (autoDownloadRecordingToggle) {
      autoDownloadRecordingToggle.checked = autoDownloadRecording;
    }
  }

  if (btnStorageLocal) {
    btnStorageLocal.addEventListener('click', () => {
      storageDestination = 'local';
      localStorage.setItem('cctv_storage_dest', 'local');
      updateStorageUiState();
      showToast('💻 Target Rekaman: Local Disk Laptop (Downloads)');
    });
  }

  if (btnStorageDrive) {
    btnStorageDrive.addEventListener('click', () => {
      storageDestination = 'drive';
      localStorage.setItem('cctv_storage_dest', 'drive');
      updateStorageUiState();
      showToast('☁️ Target Rekaman: Google Drive Cloud Backup');
    });
  }

  if (recordingBitrateSelect) {
    recordingBitrateSelect.addEventListener('change', () => {
      recordingBitrate = parseInt(recordingBitrateSelect.value, 10);
      localStorage.setItem('cctv_rec_bitrate', recordingBitrate.toString());
      showToast(`Bitrate Rekaman Diperbarui: ${(recordingBitrate / 1000000).toFixed(1)} Mbps`);
    });
  }

  if (recordingModeSelect) {
    recordingModeSelect.addEventListener('change', () => {
      recordingMode = recordingModeSelect.value;
      localStorage.setItem('cctv_rec_mode', recordingMode);
      showToast(recordingMode === 'annotated' ? '🎯 Mode Rekam: Lengkap Anotasi AI & Watermark' : '📹 Mode Rekam: Raw Clean Stream Asli');
    });
  }

  if (autoDownloadRecordingToggle) {
    autoDownloadRecordingToggle.addEventListener('change', () => {
      autoDownloadRecording = autoDownloadRecordingToggle.checked;
      localStorage.setItem('cctv_auto_dl_rec', autoDownloadRecording.toString());
      showToast(autoDownloadRecording ? 'Auto-Download Rekaman: AKTIF' : 'Auto-Download Rekaman: NONAKTIF');
    });
  }

  updateStorageUiState();

  function formatTime(totalSec) {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  let recFrameInterval = null;

  function getOptimalRecordingMimeType() {
    const types = [
      'video/webm;codecs=vp8',
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=h264',
      'video/webm',
      'video/webm;codecs=vp9'
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'video/webm';
  }

  let recAnimationFrameId = null;

  function runRecordingLoop() {
    if (!isRecording) return;
    drawRecordingFrame();
    recAnimationFrameId = requestAnimationFrame(runRecordingLoop);
  }

  function drawRecordingFrame() {
    if (!isRecording) return;

    const w = canvas.width || video.videoWidth || 640;
    const h = canvas.height || video.videoHeight || 360;

    if (recCompositeCanvas.width !== w || recCompositeCanvas.height !== h) {
      recCompositeCanvas.width = w;
      recCompositeCanvas.height = h;
    }

    // 1. Draw raw video frame (Hardware Video Surface)
    try {
      if (video.readyState >= 2 && !video.paused) {
        recCompositeCtx.drawImage(video, 0, 0, w, h);
      }
    } catch (e) {}

    // 2. Overlay live AI Detection Bounding Boxes & HUD if annotated mode is active
    if (recordingMode === 'annotated') {
      try {
        recCompositeCtx.drawImage(canvas, 0, 0, w, h);
      } catch (e) {}

      // 3. Render High-Tech Watermark & Timestamp banner
      recCompositeCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      recCompositeCtx.fillRect(0, h - 34, w, 34);

      recCompositeCtx.fillStyle = '#ef4444';
      recCompositeCtx.beginPath();
      recCompositeCtx.arc(16, h - 17, 5, 0, Math.PI * 2);
      recCompositeCtx.fill();

      recCompositeCtx.fillStyle = '#ffffff';
      recCompositeCtx.font = 'bold 12px monospace';
      recCompositeCtx.fillText(`REC ${formatTime(recordingSeconds)}`, 28, h - 13);

      recCompositeCtx.fillStyle = '#38bdf8';
      const camLabel = osdCamName ? osdCamName.textContent : 'CCTV Live';
      recCompositeCtx.fillText(`| ${camLabel} | ${new Date().toLocaleString('id-ID')}`, 110, h - 13);
    }
  }

  function startLiveRecording() {
    if (video.readyState < 2) {
      showToast('⚠️ Video belum siap diputar untuk direkam.');
      return;
    }

    try {
      recordedChunks = [];
      recordingSeconds = 0;
      isRecording = true;

      const w = canvas.width || video.videoWidth || 640;
      const h = canvas.height || video.videoHeight || 360;
      recCompositeCanvas.width = w;
      recCompositeCanvas.height = h;

      drawRecordingFrame();

      // Launch vsync-synchronized 60 FPS recording loop for silky-smooth motion
      if (recAnimationFrameId) cancelAnimationFrame(recAnimationFrameId);
      recAnimationFrameId = requestAnimationFrame(runRecordingLoop);

      const stream = recCompositeCanvas.captureStream(60);
      const mimeType = getOptimalRecordingMimeType();

      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: Math.min(recordingBitrate, 3500000) // 3.5 Mbps high-fidelity bitrate
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingComplete;
      mediaRecorder.start(1000); // 1s slice chunks

      // Update UI to active recording state
      if (btnRecord) {
        btnRecord.classList.add('recording');
        if (recordBtnText) recordBtnText.textContent = 'Stop (00:00)';
      }
      if (osdRecBadge) {
        osdRecBadge.classList.remove('hidden');
        if (osdRecTimer) osdRecTimer.textContent = '00:00';
      }

      recordingTimerInterval = setInterval(() => {
        recordingSeconds++;
        const timeStr = formatTime(recordingSeconds);
        if (osdRecTimer) osdRecTimer.textContent = timeStr;
        if (recordBtnText) recordBtnText.textContent = `Stop (${timeStr})`;
      }, 1000);

      const targetLabel = storageDestination === 'drive' ? 'Target: Google Drive' : 'Target: Local Disk Laptop';
      showToast(`🔴 Perekaman Dimulai 60 FPS (${targetLabel})...`);
    } catch (err) {
      console.error('Recording initialization failed:', err);
      showToast('❌ Browser tidak mendukung perekaman canvas stream.');
      isRecording = false;
    }
  }

  function stopLiveRecording() {
    if (!isRecording || !mediaRecorder) return;

    clearInterval(recordingTimerInterval);
    if (recAnimationFrameId) {
      cancelAnimationFrame(recAnimationFrameId);
      recAnimationFrameId = null;
    }

    if (btnRecord) {
      btnRecord.classList.remove('recording');
      if (recordBtnText) recordBtnText.textContent = 'Rekam';
    }
    if (osdRecBadge) {
      osdRecBadge.classList.add('hidden');
    }

    isRecording = false;
    mediaRecorder.stop();
    showToast('⏹️ Perekaman Selesai — Menyimpan Hasil...');
  }

  function handleRecordingComplete() {
    const mimeType = mediaRecorder.mimeType || 'video/webm';
    const blob = new Blob(recordedChunks, { type: mimeType });
    const videoUrl = URL.createObjectURL(blob);

    if (recordingPreviewVideo) {
      recordingPreviewVideo.src = videoUrl;
    }

    const camTitle = (osdCamName ? osdCamName.textContent : 'CCTV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `CCTV_Rekaman_${camTitle}_${timestampStr}.webm`;

    if (btnDownloadRecording) {
      btnDownloadRecording.href = videoUrl;
      btnDownloadRecording.download = filename;
    }

    // Populate metadata
    if (recMetaCamName) recMetaCamName.textContent = osdCamName ? osdCamName.textContent : 'CCTV Live';
    if (recMetaDuration) recMetaDuration.textContent = formatTime(recordingSeconds);
    if (recMetaFileSize) {
      const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
      recMetaFileSize.textContent = `${sizeMb} MB`;
    }
    if (recMetaFormat) {
      recMetaFormat.textContent = mimeType.includes('mp4') ? 'MP4 Video' : 'WebM (VP9/VP8 HD)';
    }

    // Direct Google Drive Upload Action
    if (btnOpenGDriveUpload) {
      btnOpenGDriveUpload.onclick = () => {
        // Automatically trigger file download first so user has the local file
        btnDownloadRecording.click();
        // Open Google Drive in new tab
        window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
        showToast('📂 Mengunduh video & membuka Google Drive...');
      };
    }

    // Destination Behavior Execution:
    if (storageDestination === 'local') {
      if (autoDownloadRecording) {
        btnDownloadRecording.click();
        showToast('💻 Video otomatis disimpan ke Local Disk (Downloads)!');
      }
    } else if (storageDestination === 'drive') {
      btnDownloadRecording.click();
      window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
      showToast('☁️ Video diunduh & Google Drive terbuka untuk upload!');
    }

    if (recordingModal) {
      recordingModal.style.display = 'flex';
    }
  }

  function closeRecordingModal() {
    if (recordingModal) recordingModal.style.display = 'none';
    if (recordingPreviewVideo) {
      recordingPreviewVideo.pause();
      recordingPreviewVideo.removeAttribute('src');
      recordingPreviewVideo.load();
    }
  }

  if (btnRecord) {
    btnRecord.addEventListener('click', () => {
      if (!isRecording) {
        startLiveRecording();
      } else {
        stopLiveRecording();
      }
    });
  }

  if (btnCloseRecordingModalX) {
    btnCloseRecordingModalX.addEventListener('click', closeRecordingModal);
  }
  if (btnCloseRecordingModalFooter) {
    btnCloseRecordingModalFooter.addEventListener('click', closeRecordingModal);
  }
  if (recordingModal) {
    recordingModal.addEventListener('click', (e) => {
      if (e.target === recordingModal) closeRecordingModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSnapshotModal();
      closeCustomConfirmDialog();
      closeConfigModal();
    }
    // Quick toggle AI with 'd' or 'D' when not typing in text input/search
    if ((e.key === 'd' || e.key === 'D') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      if (btnToggleAi) btnToggleAi.click();
    }
  });

  // Custom Confirmation Dialog Manager
  const customConfirmModal = document.getElementById('customConfirmModal');
  const confirmModalTitle = document.getElementById('confirmModalTitle');
  const confirmModalMsg = document.getElementById('confirmModalMsg');
  const btnAcceptConfirm = document.getElementById('btnAcceptConfirm');
  const btnCancelConfirm = document.getElementById('btnCancelConfirm');
  const btnCancelConfirmX = document.getElementById('btnCancelConfirmX');

  let pendingConfirmCallback = null;

  function showCustomConfirmDialog(title, message, onConfirm) {
    if (!customConfirmModal) return;
    if (confirmModalTitle) confirmModalTitle.textContent = title;
    if (confirmModalMsg) confirmModalMsg.textContent = message;
    pendingConfirmCallback = onConfirm;
    customConfirmModal.style.display = 'flex';
  }

  function closeCustomConfirmDialog() {
    if (customConfirmModal) customConfirmModal.style.display = 'none';
    pendingConfirmCallback = null;
  }

  if (btnAcceptConfirm) {
    btnAcceptConfirm.addEventListener('click', () => {
      if (typeof pendingConfirmCallback === 'function') {
        pendingConfirmCallback();
      }
      closeCustomConfirmDialog();
    });
  }

  if (btnCancelConfirm) btnCancelConfirm.addEventListener('click', closeCustomConfirmDialog);
  if (btnCancelConfirmX) btnCancelConfirmX.addEventListener('click', closeCustomConfirmDialog);

  // 10. Reset Cumulative Counter Button with Custom Modal
  if (btnResetCounters) {
    btnResetCounters.addEventListener('click', () => {
      showCustomConfirmDialog(
        'Konfirmasi Reset Hitungan',
        'Apakah Anda yakin ingin mereset total akumulasi hitungan kendaraan untuk tanggal terpilih ke 0? Tindakan ini tidak dapat dibatalkan.',
        () => {
          window.trafficAnalytics.resetCumulative();
          showToast('Hitungan kumulatif berhasil direset ke 0');
        }
      );
    });
  }

  // HD Super-Resolution Upscaler Mode
  const hdUpscaleToggle = document.getElementById('hdUpscaleToggle');
  const osdHdBadge = document.getElementById('osdHdBadge');
  const videoContainer = document.getElementById('videoContainer');

  if (hdUpscaleToggle) {
    hdUpscaleToggle.addEventListener('change', () => {
      const isHd = hdUpscaleToggle.checked;
      if (videoContainer) videoContainer.classList.toggle('hd-upscaled-active', isHd);
      if (osdHdBadge) osdHdBadge.style.display = isHd ? 'inline-flex' : 'none';
      showToast(isHd ? '⚡ AI Super-Resolution HD Aktif' : 'Mode Standar Aktif');
    });
  }

  // 11. Dedicated AI & Video Configuration Modal Dialog Manager
  const configModal = document.getElementById('configModal');
  const btnOpenConfigModal = document.getElementById('btnOpenConfigModal');
  const btnCloseConfigModalX = document.getElementById('btnCloseConfigModalX');
  const btnSaveConfigModal = document.getElementById('btnSaveConfigModal');
  const btnToggleConfigFullscreen = document.getElementById('btnToggleConfigFullscreen');
  const modalConfigCard = configModal ? configModal.querySelector('.modal-card-config') : null;

  // Config Modal Tabs (AI / Display / Recording / About)
  const configTabBtns = document.querySelectorAll('.config-tab-btn');
  const tabPaneAi = document.getElementById('tabPaneAi');
  const tabPaneDisplay = document.getElementById('tabPaneDisplay');
  const tabPaneRecording = document.getElementById('tabPaneRecording');
  const tabPaneAbout = document.getElementById('tabPaneAbout');

  configTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      configTabBtns.forEach(b => b.classList.toggle('active', b === btn));
      if (tabPaneAi) tabPaneAi.classList.toggle('active', targetTab === 'ai');
      if (tabPaneDisplay) tabPaneDisplay.classList.toggle('active', targetTab === 'display');
      if (tabPaneRecording) tabPaneRecording.classList.toggle('active', targetTab === 'recording');
      if (tabPaneAbout) tabPaneAbout.classList.toggle('active', targetTab === 'about');
    });
  });

  if (btnOpenConfigModal && configModal) {
    btnOpenConfigModal.addEventListener('click', () => {
      configModal.style.display = 'flex';
    });
  }

  if (btnToggleConfigFullscreen && modalConfigCard) {
    btnToggleConfigFullscreen.addEventListener('click', () => {
      const isFull = modalConfigCard.classList.toggle('is-fullscreen');
      btnToggleConfigFullscreen.setAttribute('title', isFull ? 'Kecilkan Modal' : 'Layar Penuh Modal');
    });
  }

  function closeConfigModal() {
    if (configModal) configModal.style.display = 'none';
  }

  if (btnCloseConfigModalX) btnCloseConfigModalX.addEventListener('click', closeConfigModal);
  if (btnSaveConfigModal) {
    btnSaveConfigModal.addEventListener('click', () => {
      closeConfigModal();
      showToast('Konfigurasi AI & Video berhasil disimpan');
    });
  }

  if (configModal) {
    configModal.addEventListener('click', (e) => {
      if (e.target === configModal) closeConfigModal();
    });
  }

  // 11b. Switch Model Engine (YOLO11 / YOLOv8 / YOLO26 / COCO-SSD)
  const inferenceScaleSelect = document.getElementById('inferenceScaleSelect');

  if (modelEngineSelect) {
    modelEngineSelect.addEventListener('change', async () => {
      activeEngine = modelEngineSelect.value;
      await loadAiModel();
    });
  }

  const toggleHelmetDetection = document.getElementById('toggleHelmetDetection');
  const toggleAnomalyDetection = document.getElementById('toggleAnomalyDetection');
  const toggleOvercapacity = document.getElementById('toggleOvercapacity');
  const toggleByteTrack = document.getElementById('toggleByteTrack');

  if (toggleHelmetDetection) {
    toggleHelmetDetection.addEventListener('change', () => {
      isHelmetDetectionEnabled = toggleHelmetDetection.checked;
      showToast(isHelmetDetectionEnabled ? '🪖 Deteksi Pengendara Tanpa Helm Aktif' : 'Deteksi Helm Dinonaktifkan');
    });
  }

  if (toggleAnomalyDetection) {
    toggleAnomalyDetection.addEventListener('change', () => {
      isAnomalyDetectionEnabled = toggleAnomalyDetection.checked;
      showToast(isAnomalyDetectionEnabled ? '🚨 Deteksi Anomali Lawan Arah & Mogok Aktif' : 'Deteksi Anomali Dinonaktifkan');
    });
  }

  if (toggleOvercapacity) {
    toggleOvercapacity.addEventListener('change', () => {
      isOvercapacityEnabled = toggleOvercapacity.checked;
      showToast(isOvercapacityEnabled ? '👥 Deteksi Boncengan Berlebih Aktif' : 'Deteksi Boncengan Dinonaktifkan');
    });
  }

  if (toggleByteTrack) {
    toggleByteTrack.addEventListener('change', () => {
      isByteTrackEnabled = toggleByteTrack.checked;
      showToast(isByteTrackEnabled ? '🎯 ByteTrack Spatial Re-ID Aktif' : 'ByteTrack Dinonaktifkan');
    });
  }

  // 12. UI Controls
  btnPlayPause.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    } else {
      video.pause();
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
  });

  btnToggleAi.addEventListener('click', () => {
    isAiRunning = !isAiRunning;
    btnToggleAi.classList.toggle('active', isAiRunning);
    btnToggleAi.querySelector('span').textContent = isAiRunning ? 'AI Deteksi: ON' : 'AI Deteksi: OFF';
  });

  // Fullscreen Handlers (Video, Map, and Entire App)
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      const container = document.getElementById('videoContainer');
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => alert(err.message));
      } else {
        document.exitFullscreen();
      }
    });
  }

  const btnFullscreenMap = document.getElementById('btnFullscreenMap');
  if (btnFullscreenMap) {
    btnFullscreenMap.addEventListener('click', () => {
      const mapContainer = document.querySelector('.map-wrapper');
      if (!document.fullscreenElement) {
        mapContainer.requestFullscreen().catch(err => alert(err.message));
      } else {
        document.exitFullscreen();
      }
    });
  }

  const btnAppFullscreen = document.getElementById('btnAppFullscreen');
  if (btnAppFullscreen) {
    btnAppFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => alert(err.message));
      } else {
        document.exitFullscreen();
      }
    });
  }

  btnLoadStream.addEventListener('click', () => {
    const url = streamUrlInput.value.trim();
    if (url) loadStream(url);
  });

  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    streamUrlInput.value = val;
    loadStream(val);
    updateActiveChip(val);
  });

  // Dynamic Online-Only Favorite Chips
  function updateActiveChip(url) {
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-url') === url);
    });
  }

  function bindChipListeners() {
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (url) {
          presetSelect.value = url;
          streamUrlInput.value = url;
          loadStream(url);
          updateActiveChip(url);
        }
      });
    });
  }
  bindChipListeners();

  // Rebuild favorites list using verified online cameras from health scanner
  function rebuildOnlineFavorites(healthData = {}) {
    const favoritesList = document.getElementById('quickFavoritesList');
    const currentCams = getCurrentCityCameras();
    if (!favoritesList || currentCams.length === 0) return;
    const onlineCams = currentCams.filter(c => healthData[c.id] && healthData[c.id].online);
    const pool = onlineCams.length > 0 ? onlineCams : currentCams;
    favoritesList.innerHTML = pool.slice(0, 3).map(c => `
      <button type="button" class="chip-btn" data-url="${c.url}">
        <span class="dot-online-chip"></span>CAM ${c.id} ${(c.alias || c.name).substring(0, 18)}
      </button>`).join('');
    bindChipListeners();
  }

  window.addEventListener('cctv-health-updated', e => {
    if (e.detail && e.detail.cameras) rebuildOnlineFavorites(e.detail.cameras);
  });

  // 13. View Mode Switcher (Peta CCTV / Konsol AI / Split)
  const mainLayout = document.getElementById('mainLayout');
  const tabBtns = document.querySelectorAll('.view-mode-tabs .tab-btn');
  const btnMaximizeConsole = document.getElementById('btnMaximizeConsole');

  const warRoomView = document.getElementById('warRoomView');
  const consoleSection = document.querySelector('.console-section') || document.querySelector('section.console-section');

  function setViewMode(mode) {
    if (!mainLayout) return;
    // The CSS handles show/hide of all panels via .mode-* classes
    mainLayout.className = `main-layout mode-${mode}`;
    tabBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });

    // War Room: show/hide panel and initialize players on first open
    const wrPanel = document.getElementById('warRoomView');
    if (wrPanel) {
      if (mode === 'warroom') {
        wrPanel.classList.remove('hidden');   // must remove BEFORE adding active
        wrPanel.classList.add('war-room-active');
        initWarRoom();
      } else {
        wrPanel.classList.remove('war-room-active');
        wrPanel.classList.add('hidden');
      }
    }

    // Map needs size invalidation after DOM changes
    if (mode === 'map' || mode === 'split') {
      setTimeout(() => {
        if (window.medanCCTVMap) window.medanCCTVMap.invalidateSize();
      }, 80);
    }

    // Automatically reset currently playing camera when moving to Map view
    if (mode === 'map') {
      resetActiveCameraMonitoring();
    }
  }

  window.setViewModeGlobal = setViewMode;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode) setViewMode(mode);
    });
  });

  if (btnMaximizeConsole) {
    btnMaximizeConsole.addEventListener('click', () => {
      setViewMode('console');
    });
  }

  // Map Layer Switcher
  const layerPillBtns = document.querySelectorAll('.layer-pill-btn');
  layerPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      layerPillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.getAttribute('data-theme');
      if (window.medanCCTVMap && theme) {
        window.medanCCTVMap.switchTileTheme(theme);
      }
    });
  });

  // 14. Dark / Light Mode Theme Switcher (Integrated into Settings Modal)
  const btnThemeDark = document.getElementById('btnThemeDark');
  const btnThemeLight = document.getElementById('btnThemeLight');

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      if (btnThemeLight) btnThemeLight.classList.add('active');
      if (btnThemeDark) btnThemeDark.classList.remove('active');
      if (window.medanCCTVMap && window.medanCCTVMap.isInitialized) {
        window.medanCCTVMap.switchTileTheme('dark'); // Clean Voyager for light theme
      }
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      if (btnThemeDark) btnThemeDark.classList.add('active');
      if (btnThemeLight) btnThemeLight.classList.remove('active');
      if (window.medanCCTVMap && window.medanCCTVMap.isInitialized) {
        window.medanCCTVMap.switchTileTheme('darkNight');
      }
    }
    localStorage.setItem('cctv_theme_preference', theme);
  }

  // Load saved theme (default dark)
  const savedTheme = localStorage.getItem('cctv_theme_preference') || 'dark';
  applyTheme(savedTheme);

  if (btnThemeDark) {
    btnThemeDark.addEventListener('click', () => {
      applyTheme('dark');
      showToast('🌙 Mode Gelap (Dark Mode) Aktif');
    });
  }

  if (btnThemeLight) {
    btnThemeLight.addEventListener('click', () => {
      applyTheme('light');
      showToast('☀️ Mode Terang (Light Mode) Aktif');
    });
  }

  // 15. City Selector Modal (Nusantara Multi-City Switcher)
  const citySelectorModal = document.getElementById('citySelectorModal');
  const btnOpenCityModal = document.getElementById('btnOpenCityModal');
  const btnCloseCityModal = document.getElementById('btnCloseCityModal');
  const currentCityLabel = document.getElementById('currentCityLabel');
  const tabMapLabel = document.getElementById('tabMapLabel');
  const cityCards = document.querySelectorAll('.city-card');

  function openCitySelectorModal() {
    if (citySelectorModal) {
      citySelectorModal.style.display = 'flex';
    }
  }

  function closeCitySelectorModal() {
    if (citySelectorModal) {
      citySelectorModal.style.display = 'none';
    }
  }

  const btnResetCitySelection = document.getElementById('btnResetCitySelection');

  function resetCitySelection() {
    isCityActivated = false;
    currentCityId = null;
    try {
      localStorage.removeItem('cctv_selected_city');
      localStorage.removeItem('cctv_last_active_stream');
    } catch (e) {}

    // 1. Reset active camera / stream & AI loop
    resetActiveCameraMonitoring();

    // 2. Update city label in header
    if (currentCityLabel) {
      currentCityLabel.textContent = 'Pilih Wilayah Kota';
    }

    // 3. Remove active class from all city cards
    cityCards.forEach(c => c.classList.remove('active'));

    // 4. Show standby overlay on map
    if (mapStandbyOverlay) {
      mapStandbyOverlay.classList.remove('hidden');
    }

    // 5. Hide scanner HUD on map
    const mapScannerHud = document.getElementById('mapScannerHud');
    const mapStreamScanBadge = document.getElementById('mapStreamScanBadge');
    if (mapScannerHud) mapScannerHud.classList.add('hidden');
    if (mapStreamScanBadge) mapStreamScanBadge.classList.add('hidden');

    // 6. Close modal & notify
    closeCitySelectorModal();
    showToast('🔄 Pilihan kota telah direset ke mode Standby.');
  }

  if (btnResetCitySelection) {
    btnResetCitySelection.addEventListener('click', resetCitySelection);
  }

  if (btnOpenCityModal) {
    btnOpenCityModal.addEventListener('click', openCitySelectorModal);
  }

  if (btnCloseCityModal) {
    btnCloseCityModal.addEventListener('click', closeCitySelectorModal);
  }

  if (citySelectorModal) {
    citySelectorModal.addEventListener('click', (e) => {
      if (e.target === citySelectorModal) closeCitySelectorModal();
    });
  }

  // 15b. Searchable City Filter & Region Filter Logic
  const searchCityInput = document.getElementById('searchCityInput');
  const btnClearCitySearch = document.getElementById('btnClearCitySearch');
  const cityNoResults = document.getElementById('cityNoResults');
  const gatewayRegionPills = document.querySelectorAll('.gateway-region-pill');
  let currentActiveRegion = 'all';

  function filterCityCards() {
    const query = searchCityInput ? searchCityInput.value.toLowerCase().trim() : '';
    let visibleCount = 0;

    cityCards.forEach(card => {
      const cardRegion = card.getAttribute('data-region') || '';
      const cardName = card.getAttribute('data-city-name') || '';
      const cardSearchData = card.getAttribute('data-search') || '';
      const cardText = (cardName + ' ' + cardSearchData + ' ' + card.innerText).toLowerCase();

      const matchesRegion = currentActiveRegion === 'all' || cardRegion === currentActiveRegion;
      const matchesSearch = !query || cardText.includes(query);

      if (matchesRegion && matchesSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (cityNoResults) {
      cityNoResults.classList.toggle('hidden', visibleCount > 0);
    }

    if (btnClearCitySearch) {
      btnClearCitySearch.classList.toggle('hidden', query.length === 0);
    }
  }

  if (searchCityInput) {
    searchCityInput.addEventListener('input', filterCityCards);
  }

  if (btnClearCitySearch) {
    btnClearCitySearch.addEventListener('click', () => {
      if (searchCityInput) {
        searchCityInput.value = '';
        searchCityInput.focus();
      }
      filterCityCards();
    });
  }

  gatewayRegionPills.forEach(pill => {
    pill.addEventListener('click', () => {
      gatewayRegionPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentActiveRegion = pill.getAttribute('data-region') || 'all';
      filterCityCards();
    });
  });

  // 15c. On-Demand City Activation & Map Standby Overlay
  const mapStandbyOverlay = document.getElementById('mapStandbyOverlay');
  const btnStandbySelectCity = document.getElementById('btnStandbySelectCity');
  let isCityActivated = false;

  if (btnStandbySelectCity) {
    btnStandbySelectCity.addEventListener('click', openCitySelectorModal);
  }

  async function activateCity(cityId, cityName, lat, lon) {
    if (cityId === 'medan' || cityId === 'jogja' || cityId === 'bandung') {
      currentCityId = cityId;
      localStorage.setItem('cctv_selected_city', cityId);
      if (currentCityLabel) currentCityLabel.textContent = cityName;
      closeCitySelectorModal();

      cityCards.forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-city-id') === cityId);
      });

      // Hide standby placeholder and reveal map
      if (mapStandbyOverlay) {
        mapStandbyOverlay.classList.add('hidden');
      }

      // Reveal scanner HUD and stream scan badge
      const mapScannerHud = document.getElementById('mapScannerHud');
      const mapStreamScanBadge = document.getElementById('mapStreamScanBadge');
      if (mapScannerHud) mapScannerHud.classList.remove('hidden');
      if (mapStreamScanBadge) mapStreamScanBadge.classList.remove('hidden');

      showToast(`🏙️ ${cityName} Terpilih — Memuat Data CCTV & Neural Engine...`);

      const currentCams = getCurrentCityCameras();

      // 1. Initialize Map / Switch City
      if (window.medanCCTVMap && !window.medanCCTVMap.isInitialized) {
        window.medanCCTVMap.cameras = currentCams;
        window.medanCCTVMap.init();
      } else if (window.medanCCTVMap) {
        window.medanCCTVMap.switchCity(cityId, currentCams, lat, lon, cityName);
      }

      // 2. Re-populate UI Dropdowns & Favorites
      initCameraDirectory();
      renderComboboxItems();
      rebuildOnlineFavorites();

      // 3. Rebuild War Room if active
      if (warRoomInitialized) {
        buildWarRoomGrid(warCurrentCols, warCurrentRows, true);
      }

      // 4. Lazy Load AI Model Engine
      if (!model) {
        await loadAiModel();
      }

      // 5. Auto-load primary camera for this city
      const primaryUrl = currentCams.length > 0 ? currentCams[0].url : 'simulation_traffic';
      loadStream(primaryUrl);

      // 6. Start AI detection loop
      if (!isDetecting) {
        detectLoop();
      }

      isCityActivated = true;
      showToast(`✅ ${currentCams.length}+ Kamera ATCS ${cityName} Siap Dipantau`);
    } else {
      showToast(`⏳ Node CCTV ${cityName} sedang dalam tahap integrasi pipeline stream.`);
    }
  }

  cityCards.forEach(card => {
    card.addEventListener('click', () => {
      const cityId = card.getAttribute('data-city-id');
      const cityName = card.getAttribute('data-city-name');
      const lat = parseFloat(card.getAttribute('data-lat'));
      const lon = parseFloat(card.getAttribute('data-lon'));
      activateCity(cityId, cityName, lat, lon);
    });
  });

  // 16. PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA Service Worker] Registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA Service Worker] Registration failed:', err);
        });
    });
  }

  // =========================================================================
  // 17. WAR ROOM MATRIX ENGINE — Dynamic Grid, Multi-Layout, Fullscreen
  // =========================================================================
  const WAR_ROOM_DEFAULTS = [
    { id: 31, url: 'https://atcsdishub.medan.go.id/stream/L31JAMINGINTINGISMUD/stream.m3u8', name: 'JAMIN GINTING - ISMUD' },
    { id: 1,  url: 'https://atcsdishub.medan.go.id/stream/L1RADENSALEHBALAIKOTA/stream.m3u8', name: 'RADEN SALEH - BALAI KOTA' },
    { id: 62, url: 'https://atcsdishub.medan.go.id/stream/L62SIMPANGPOS/stream.m3u8', name: 'SIMPANG POS FLYOVER' },
    { id: 18, url: 'https://atcsdishub.medan.go.id/stream/L18KATAMSOJUANDA/stream.m3u8', name: 'KATAMSO - JUANDA' },
    { id: 5,  url: 'https://atcsdishub.medan.go.id/stream/L5PANDUPALAPINORANGCIREBON/stream.m3u8', name: 'PANDU - CIREBON' },
    { id: 2,  url: 'https://atcsdishub.medan.go.id/stream/L2AHMADYANIPULAUPINANG/stream.m3u8', name: 'AHMAD YANI - PULAU PINANG' },
    { id: 3,  url: 'https://atcsdishub.medan.go.id/stream/L3KESAWANPALANGMERAH/stream.m3u8', name: 'KESAWAN - PALANG MERAH' },
    { id: 4,  url: 'https://atcsdishub.medan.go.id/stream/L4KATAMSOANIIDRUS/stream.m3u8', name: 'KATAMSO - ANI IDRUS' },
    { id: 7,  url: 'https://atcsdishub.medan.go.id/stream/L7SMRAJAAMALIUN/stream.m3u8', name: 'SM.RAJA - AMALIUN' },
    { id: 8,  url: 'https://atcsdishub.medan.go.id/stream/L8GURUPATIMPUSADAMMALIK/stream.m3u8', name: 'GURU PATIMPUS - ADAM MALIK' },
    { id: 19, url: 'https://atcsdishub.medan.go.id/stream/L19JUANDAPOLONIA/stream.m3u8', name: 'JUANDA - POLONIA' },
    { id: 20, url: 'https://atcsdishub.medan.go.id/stream/L20SMRAJAHALAT/stream.m3u8', name: 'SM.RAJA - HALAT' },
    { id: 21, url: 'https://atcsdishub.medan.go.id/stream/L21SMRAJAPELANGI/stream.m3u8', name: 'SM.RAJA - PELANGI' },
    { id: 22, url: 'https://atcsdishub.medan.go.id/stream/L22SMRAJAAHNASUTIONFLYOVER/stream.m3u8', name: 'SM.RAJA - AH.NASUTION' },
    { id: 24, url: 'https://atcsdishub.medan.go.id/stream/L24MTHARYONOSUTOMO/stream.m3u8', name: 'MT.HARYONO - SUTOMO' },
    { id: 16, url: 'https://atcsdishub.medan.go.id/stream/L16SUDIRMANDIPONEGORO/stream.m3u8', name: 'SUDIRMAN - DIPONEGORO' }
  ];

  // All HLS instances keyed by slot index (dynamic)
  const warHlsMap = {};
  let warRoomInitialized = false;
  let warOnlineCameras = [];
  let warCurrentCols = 2;
  let warCurrentRows = 2;
  let warTotalSlots = 4;

  function getWarOnlineCameras() {
    const all = getCurrentCityCameras();
    const health = window.medanCCTVMap && window.medanCCTVMap.healthStatus ? window.medanCCTVMap.healthStatus : {};
    let online = all.filter(c => health[c.id] && health[c.id].online);
    
    // Check localStorage cache if map healthStatus is not yet in memory
    if (online.length === 0) {
      try {
        const raw = localStorage.getItem(`cctv_health_cache_${currentCityId}_v2`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.cameras) {
            online = all.filter(c => parsed.cameras[c.id] && parsed.cameras[c.id].online);
          }
        }
      } catch(e) {}
    }

    return online.length > 0 ? online : (all.length > 0 ? all : WAR_ROOM_DEFAULTS);
  }

  // ---- Slot HTML Factory ----
  function buildSlotHtml(idx, cam = null) {
    if (!cam) cam = WAR_ROOM_DEFAULTS[idx % WAR_ROOM_DEFAULTS.length];
    const slotNum = idx + 1;
    const label = cam ? `CAM #${cam.id}: ${cam.name || cam.alias || ''}` : `SLOT ${slotNum}`;
    return `
      <div class="war-slot" id="warSlot${slotNum}" data-slot="${slotNum}">
        <div class="slot-header">
          <span class="slot-badge">S${slotNum}</span>
          <div class="slot-cam-combo" id="warCombo${slotNum}">
            <button type="button" class="slot-combo-trigger" id="warComboTrigger${slotNum}">
              <span class="combo-label" id="warComboLabel${slotNum}">${label}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="slot-combo-dropdown" id="warComboDropdown${slotNum}">
              <div class="combo-search-wrap">
                <input type="text" class="combo-search-input" placeholder="Cari kamera..." data-slot="${slotNum}" autocomplete="off" />
              </div>
              <div class="combo-list" id="warComboList${slotNum}"></div>
            </div>
          </div>
          <button type="button" class="btn-slot-expand" data-slot="${slotNum}" title="Fokus Slot">⛶</button>
        </div>
        <div class="slot-video-box">
          <div class="slot-video-loader" id="warLoader${slotNum}">
            <div class="sleek-spinner-mini"></div>
            <span>Menghubungkan Stream...</span>
          </div>
          <video id="warVideo${slotNum}" playsinline muted autoplay crossOrigin="anonymous"></video>
          <canvas id="warCanvas${slotNum}"></canvas>
          <div class="slot-osd" id="warOsd${slotNum}">${label}</div>
        </div>
      </div>`;
  }

  // ---- Build / Rebuild Grid ----
  function buildWarRoomGrid(cols, rows, randomize = true) {
    const grid = document.getElementById('warRoomGrid');
    if (!grid) return;

    const newTotal = cols * rows;

    // Destroy HLS for slots that will be removed
    for (let i = newTotal; i < warTotalSlots; i++) {
      if (warHlsMap[i]) { try { warHlsMap[i].destroy(); } catch(e) {} delete warHlsMap[i]; }
    }

    warCurrentCols = cols;
    warCurrentRows = rows;
    warTotalSlots = newTotal;

    // Always retrieve freshest verified online cameras
    warOnlineCameras = getWarOnlineCameras();

    // Set CSS grid template
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    // ONLY pick from verified online cameras!
    let pool = warOnlineCameras.length > 0 ? warOnlineCameras : WAR_ROOM_DEFAULTS;
    if (randomize) {
      pool = shuffleArray(pool);
    }

    // Rebuild slot HTML (label from online pool)
    grid.innerHTML = Array.from({ length: newTotal }, (_, i) => {
      const cam = pool[i % pool.length];
      return buildSlotHtml(i, cam);
    }).join('');

    // Bind all slot interactions
    bindAllSlots();

    // Auto-load streams from online pool
    for (let i = 0; i < newTotal; i++) {
      const cam = pool[i % pool.length];
      if (cam) loadWarSlot(i, cam.url);
    }

    // Update badge
    const badge = document.getElementById('warRoomOnlineBadge');
    if (badge) badge.textContent = `🟢 ${warOnlineCameras.length} Online`;
  }

  // ---- Bind Slot Controls ----
  function bindAllSlots() {
    warOnlineCameras = getWarOnlineCameras();
    for (let s = 1; s <= warTotalSlots; s++) {
      const trigger = document.getElementById(`warComboTrigger${s}`);
      if (trigger) trigger.onclick = (e) => { e.stopPropagation(); openCombo(s); };
      const searchInput = document.querySelector(`#warComboDropdown${s} .combo-search-input`);
      if (searchInput) {
        searchInput.addEventListener('input', () => buildComboList(s, searchInput.value));
        searchInput.addEventListener('click', e => e.stopPropagation());
      }
      const expandBtn = document.querySelector(`.btn-slot-expand[data-slot="${s}"]`);
      if (expandBtn) {
        expandBtn.addEventListener('click', () => {
          const slotEl = document.getElementById(`warSlot${s}`);
          if (!slotEl) return;
          const isFs = slotEl.classList.contains('slot-focused');
          document.querySelectorAll('.war-slot').forEach(sl => sl.classList.remove('slot-focused'));
          if (!isFs) slotEl.classList.add('slot-focused');
        });
      }
      buildComboList(s, '');
    }
  }

  function buildComboList(slotIdx, filterText = '') {
    const list = document.getElementById(`warComboList${slotIdx}`);
    if (!list) return;
    const query = filterText.toLowerCase().trim();
    const currentCams = getCurrentCityCameras();
    const allCams = currentCams && currentCams.length > 0
      ? currentCams
      : WAR_ROOM_DEFAULTS;
    const health = window.medanCCTVMap && window.medanCCTVMap.healthStatus ? window.medanCCTVMap.healthStatus : {};

    // Filter cameras
    let filtered = query
      ? allCams.filter(c => `CAM ${c.id} ${c.name || c.alias || ''}`.toLowerCase().includes(query))
      : allCams;

    // Sort: Online cameras first, then by ID
    filtered = [...filtered].sort((a, b) => {
      const aOn = health[a.id]?.online ? 1 : 0;
      const bOn = health[b.id]?.online ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn; // online first
      return (a.id || 0) - (b.id || 0);
    });

    list.innerHTML = filtered.length === 0
      ? `<div class="combo-no-results">Tidak ada kamera ditemukan</div>`
      : filtered.map(c => {
          const isOnline = health[c.id] ? health[c.id].online : true;
          const label = `CAM #${c.id}: ${c.name || c.alias || ''}`;
          return `
            <div class="combo-item ${isOnline ? 'is-online' : 'is-offline'}" data-url="${c.url}" data-label="${label}" data-slot="${slotIdx}">
              <span class="combo-status-pill ${isOnline ? 'online' : 'offline'}">
                <span class="combo-dot ${isOnline ? 'online' : 'offline'}"></span>
                ${isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
              <span class="combo-item-text">${label}</span>
            </div>`;
        }).join('');

    list.querySelectorAll('.combo-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        const label = item.getAttribute('data-label');
        const s = parseInt(item.getAttribute('data-slot'));
        const labelEl = document.getElementById(`warComboLabel${s}`);
        const osdEl = document.getElementById(`warOsd${s}`);
        if (labelEl) labelEl.textContent = label;
        if (osdEl) osdEl.textContent = label;
        closeAllCombos();
        loadWarSlot(s - 1, url);
      });
    });
  }

  function openCombo(slotIdx) {
    closeAllCombos();
    const dropdown = document.getElementById(`warComboDropdown${slotIdx}`);
    if (dropdown) {
      dropdown.classList.add('open');
      const input = dropdown.querySelector('.combo-search-input');
      if (input) { input.value = ''; input.focus(); buildComboList(slotIdx, ''); }
    }
  }

  function closeAllCombos() {
    document.querySelectorAll('.slot-combo-dropdown').forEach(d => d.classList.remove('open'));
  }

  function loadWarSlot(idx, url) {
    const slotNum = idx + 1;
    const video = document.getElementById(`warVideo${slotNum}`);
    const loader = document.getElementById(`warLoader${slotNum}`);
    if (!video || !url) return;

    if (loader) loader.classList.remove('hidden');

    if (warHlsMap[idx]) { try { warHlsMap[idx].destroy(); } catch(e) {} warHlsMap[idx] = null; }

    const hideLoader = () => { if (loader) loader.classList.add('hidden'); };
    video.onplaying = hideLoader;
    video.onloadeddata = hideLoader;

    // Bandung uses the Koyeb remote proxy, Medan & Yogya are 100% direct native
    const REMOTE_PROXY_BASE = 'https://renewed-georgeanne-nekonode-1aa70c0c.koyeb.app/fetch/?url=';
    const isBandung = url.includes('bandung.go.id') || url.includes('pelindung');
    const finalUrl = isBandung && !url.includes('koyeb.app')
      ? `${REMOTE_PROXY_BASE}${encodeURIComponent(url)}`
      : url;

    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
        lowLatencyMode: true,
        enableWorker: true,
        xhrSetup: (xhr) => { xhr.withCredentials = false; }
      });
      hls.loadSource(finalUrl);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(hideLoader).catch(() => {});
      });
      hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data.fatal && finalUrl !== url) {
          // Fatal error with proxy → retry direct
          hls.destroy();
          const hlsDirect = new window.Hls({ liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 4, lowLatencyMode: true });
          hlsDirect.loadSource(url);
          hlsDirect.attachMedia(video);
          hlsDirect.on(window.Hls.Events.MANIFEST_PARSED, () => {
            video.play().then(hideLoader).catch(() => {});
          });
          warHlsMap[idx] = hlsDirect;
        }
      });
      warHlsMap[idx] = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = finalUrl;
      video.play().then(hideLoader).catch(() => {});
    }
  }

  // ---- Random shuffle helper ----
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function initWarRoom() {
    if (warRoomInitialized) return;
    warRoomInitialized = true;

    warOnlineCameras = getWarOnlineCameras();

    // Show picker screen first, hide grid + header controls
    showWarRoomPicker();

    // Back button in header: returns to dashboard / split mode
    const btnBack = document.getElementById('btnWarRoomBack');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (window.setViewModeGlobal) {
          window.setViewModeGlobal('split');
        }
      });
    }

    // Mode nav buttons in header (Peta / AI / Layar Ganda)
    document.querySelectorAll('.wr-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (mode && window.setViewModeGlobal) {
          window.setViewModeGlobal(mode);
        }
      });
    });

    // Layout switcher buttons in header — re-pick layout & re-randomize
    document.querySelectorAll('.wr-layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cols = parseInt(btn.getAttribute('data-cols'));
        const rows = parseInt(btn.getAttribute('data-rows'));
        document.querySelectorAll('.wr-layout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        buildWarRoomGrid(cols, rows, true);
        showToast(`⬛ Layout ${cols}×${rows} — ${cols * rows} kamera aktif`);
      });
    });

    // Global search
    const globalSearch = document.getElementById('warRoomGlobalSearch');
    if (globalSearch) {
      globalSearch.addEventListener('input', () => {
        for (let s = 1; s <= warTotalSlots; s++) buildComboList(s, globalSearch.value);
      });
    }

    // Click outside closes combos
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.slot-cam-combo') && !e.target.closest('.war-room-search-wrap')) closeAllCombos();
    });

    // Fullscreen button
    const btnFullscreen = document.getElementById('btnWarRoomFullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        const panel = document.getElementById('warRoomView');
        if (!document.fullscreenElement) {
          panel.requestFullscreen && panel.requestFullscreen();
          btnFullscreen.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg> Exit`;
        } else {
          document.exitFullscreen && document.exitFullscreen();
          btnFullscreen.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Fullscreen`;
        }
      });
    }

    // Re-populate combos on health update
    window.addEventListener('cctv-health-updated', () => {
      warOnlineCameras = getWarOnlineCameras();
      const badge = document.getElementById('warRoomOnlineBadge');
      if (badge) badge.textContent = `🟢 ${warOnlineCameras.length} Online`;
      for (let s = 1; s <= warTotalSlots; s++) buildComboList(s, '');
    });

    // AI toggle
    const btnAi = document.getElementById('btnToggleWarRoomAi');
    if (btnAi) {
      btnAi.addEventListener('click', () => {
        const on = btnAi.textContent.includes('AKTIF');
        btnAi.textContent = on ? '⚡ AI: OFF' : '⚡ AI: AKTIF';
        showToast(on ? '⏸ AI Matrix dinonaktifkan.' : '▶ AI Matrix aktif.');
      });
    }

    // Master Matrix Multi-Grid Video Recorder
    if (btnWarRecord) {
      btnWarRecord.addEventListener('click', () => {
        if (!isWarRecording) {
          startWarRoomRecording();
        } else {
          stopWarRoomRecording();
        }
      });
    }
  }

  // ---- War Room Master Grid Multi-Recorder Suite ----
  let isWarRecording = false;
  let warMediaRecorder = null;
  let warRecordedChunks = [];
  let warRecTimerInterval = null;
  let warRecSeconds = 0;
  let warRecCanvas = document.createElement('canvas');
  let warRecCtx = warRecCanvas.getContext('2d');
  let warRecAnimId = null;

  const btnWarRecord = document.getElementById('btnWarRecord');
  const warRecordBtnText = document.getElementById('warRecordBtnText');
  const warRecBadge = document.getElementById('warRecBadge');
  const warRecTimer = document.getElementById('warRecTimer');

  let warRecFrameInterval = null;

  function drawWarRecordingFrame() {
    if (!isWarRecording) return;

    const totalW = 1920;
    const totalH = 1080;
    if (warRecCanvas.width !== totalW || warRecCanvas.height !== totalH) {
      warRecCanvas.width = totalW;
      warRecCanvas.height = totalH;
    }

    // Fill sleek Command Center background
    warRecCtx.fillStyle = '#0a0d14';
    warRecCtx.fillRect(0, 0, totalW, totalH);

    const cols = warCurrentCols || 2;
    const rows = warCurrentRows || 2;
    const footerH = 40;
    const availH = totalH - footerH;
    const tileW = totalW / cols;
    const tileH = availH / rows;

    // Composite all active slot videos into multi-grid
    for (let i = 0; i < warTotalSlots; i++) {
      const slotNum = i + 1;
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = c * tileW;
      const y = r * tileH;

      const v = document.getElementById(`warVideo${slotNum}`);
      const textEl = document.getElementById(`warComboText${slotNum}`);
      const camLabel = textEl ? textEl.textContent.trim() : `Kamera #${slotNum}`;

      if (v && v.readyState >= 2) {
        try {
          warRecCtx.drawImage(v, x, y, tileW, tileH);
        } catch (e) {}
      } else {
        // Fallback tile pattern if loading
        warRecCtx.fillStyle = '#111827';
        warRecCtx.fillRect(x, y, tileW, tileH);
        warRecCtx.fillStyle = '#6b7280';
        warRecCtx.font = 'bold 16px sans-serif';
        warRecCtx.textAlign = 'center';
        warRecCtx.fillText(`[ Menghubungkan Kamera #${slotNum}... ]`, x + tileW / 2, y + tileH / 2);
        warRecCtx.textAlign = 'left';
      }

      // Tile border
      warRecCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      warRecCtx.lineWidth = 1.5;
      warRecCtx.strokeRect(x, y, tileW, tileH);

      // Tile Camera Badge Banner
      warRecCtx.fillStyle = 'rgba(0, 0, 0, 0.70)';
      warRecCtx.fillRect(x, y + tileH - 28, tileW, 28);

      warRecCtx.fillStyle = '#10b981';
      warRecCtx.beginPath();
      warRecCtx.arc(x + 14, y + tileH - 14, 4, 0, Math.PI * 2);
      warRecCtx.fill();

      warRecCtx.fillStyle = '#ffffff';
      warRecCtx.font = 'bold 12px sans-serif';
      warRecCtx.fillText(camLabel, x + 24, y + tileH - 10);
    }

    // Master Footer Command Center Watermark Banner
    warRecCtx.fillStyle = '#06080d';
    warRecCtx.fillRect(0, totalH - footerH, totalW, footerH);

    warRecCtx.fillStyle = '#ef4444';
    warRecCtx.beginPath();
    warRecCtx.arc(22, totalH - 20, 6, 0, Math.PI * 2);
    warRecCtx.fill();

    warRecCtx.fillStyle = '#ffffff';
    warRecCtx.font = 'bold 14px monospace';
    warRecCtx.fillText(`WAR ROOM MASTER MULTI-GRID REC [${formatTime(warRecSeconds)}]`, 36, totalH - 15);

    warRecCtx.fillStyle = '#38bdf8';
    let cityTitle = 'KOTA MEDAN';
    if (currentCityId === 'jogja') cityTitle = 'KOTA YOGYAKARTA';
    else if (currentCityId === 'bandung') cityTitle = 'KOTA BANDUNG';
    warRecCtx.fillText(`| NUSANTARA TRAFFIC VISION • ${cityTitle} (${warTotalSlots} KAMERA) | ${new Date().toLocaleString('id-ID')}`, 460, totalH - 15);
  }

  function startWarRoomRecording() {
    try {
      warRecordedChunks = [];
      warRecSeconds = 0;
      isWarRecording = true;

      drawWarRecordingFrame();

      // Dedicated 30 FPS Frame Pump for Multi-Grid
      if (warRecFrameInterval) clearInterval(warRecFrameInterval);
      warRecFrameInterval = setInterval(drawWarRecordingFrame, 1000 / 30);

      const stream = warRecCanvas.captureStream(30);
      const mimeType = getOptimalRecordingMimeType();

      warMediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3000000 // 3.0 Mbps smooth encoding
      });

      warMediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          warRecordedChunks.push(event.data);
        }
      };

      warMediaRecorder.onstop = handleWarRecordingComplete;
      warMediaRecorder.start(1000);

      if (btnWarRecord) {
        btnWarRecord.classList.add('recording');
        if (warRecordBtnText) warRecordBtnText.textContent = 'Stop (00:00)';
      }
      if (warRecBadge) {
        warRecBadge.classList.remove('hidden');
        if (warRecTimer) warRecTimer.textContent = '00:00';
      }

      warRecTimerInterval = setInterval(() => {
        warRecSeconds++;
        const timeStr = formatTime(warRecSeconds);
        if (warRecTimer) warRecTimer.textContent = timeStr;
        if (warRecordBtnText) warRecordBtnText.textContent = `Stop (${timeStr})`;
      }, 1000);

      const targetLabel = storageDestination === 'drive' ? 'Target: Google Drive' : 'Target: Local Disk Laptop';
      showToast(`🔴 Perekaman War Room Matriks Dimulai (${warTotalSlots} Kamera, ${targetLabel})...`);
    } catch (err) {
      console.error('War Room recording initialization failed:', err);
      showToast('❌ Gagal memulai perekaman matriks.');
      isWarRecording = false;
    }
  }

  function stopWarRoomRecording() {
    if (!isWarRecording || !warMediaRecorder) return;

    clearInterval(warRecTimerInterval);
    if (warRecFrameInterval) {
      clearInterval(warRecFrameInterval);
      warRecFrameInterval = null;
    }
    cancelAnimationFrame(warRecAnimId);

    if (btnWarRecord) {
      btnWarRecord.classList.remove('recording');
      if (warRecordBtnText) warRecordBtnText.textContent = 'Rekam Matriks';
    }
    if (warRecBadge) {
      warRecBadge.classList.add('hidden');
    }

    isWarRecording = false;
    warMediaRecorder.stop();
    showToast('⏹️ Perekaman Matriks Selesai — Menyimpan Video Komposit...');
  }

  function handleWarRecordingComplete() {
    const mimeType = warMediaRecorder.mimeType || 'video/webm';
    const blob = new Blob(warRecordedChunks, { type: mimeType });
    const videoUrl = URL.createObjectURL(blob);

    if (recordingPreviewVideo) {
      recordingPreviewVideo.src = videoUrl;
    }

    let cityPrefix = 'Medan';
    if (currentCityId === 'jogja') cityPrefix = 'Jogja';
    else if (currentCityId === 'bandung') cityPrefix = 'Bandung';
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `CCTV_WarRoom_Matrix_${cityPrefix}_${warTotalSlots}Cam_${timestampStr}.webm`;

    if (btnDownloadRecording) {
      btnDownloadRecording.href = videoUrl;
      btnDownloadRecording.download = filename;
    }

    if (recMetaCamName) recMetaCamName.textContent = `War Room Command Center (${warTotalSlots} Kamera Grid)`;
    if (recMetaDuration) recMetaDuration.textContent = formatTime(warRecSeconds);
    if (recMetaFileSize) {
      const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
      recMetaFileSize.textContent = `${sizeMb} MB`;
    }
    if (recMetaFormat) {
      recMetaFormat.textContent = 'Master Multi-Grid HD (VP9/VP8)';
    }

    // Direct Google Drive Upload Action
    if (btnOpenGDriveUpload) {
      btnOpenGDriveUpload.onclick = () => {
        btnDownloadRecording.click();
        window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
        showToast('📂 Mengunduh video matriks & membuka Google Drive...');
      };
    }

    // Destination Behavior Execution
    if (storageDestination === 'local') {
      if (autoDownloadRecording) {
        btnDownloadRecording.click();
        showToast('💻 Video Matriks otomatis disimpan ke Local Disk (Downloads)!');
      }
    } else if (storageDestination === 'drive') {
      btnDownloadRecording.click();
      window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
      showToast('☁️ Video Matriks diunduh & Google Drive terbuka untuk upload!');
    }

    if (recordingModal) {
      recordingModal.style.display = 'flex';
    }
  }

  // ---- Grid Picker Screen ----
  const GRID_OPTIONS = [
    { cols: 1, rows: 1, label: '1',  desc: 'Fokus Tunggal',   icon: '▪' },
    { cols: 2, rows: 1, label: '2',  desc: 'Dual View',       icon: '▪▪' },
    { cols: 2, rows: 2, label: '4',  desc: 'Quad Screen',     icon: '▪▪\n▪▪' },
    { cols: 3, rows: 2, label: '6',  desc: 'Hexa Screen',     icon: '▪▪▪\n▪▪▪' },
    { cols: 4, rows: 2, label: '8',  desc: 'Octa Screen',     icon: '▪▪▪▪\n▪▪▪▪' },
    { cols: 3, rows: 3, label: '9',  desc: '9 Screen',        icon: '▪▪▪\n▪▪▪\n▪▪▪' },
    { cols: 4, rows: 3, label: '12', desc: '12 Screen',       icon: '▪▪▪▪\n▪▪▪▪\n▪▪▪▪' },
    { cols: 4, rows: 4, label: '16', desc: 'Mega Wall',       icon: '▪▪▪▪\n▪▪▪▪\n▪▪▪▪\n▪▪▪▪' },
  ];

  function showWarRoomPicker() {
    const grid = document.getElementById('warRoomGrid');
    const header = document.getElementById('warRoomHeader');
    if (header) header.style.display = 'none';  // hide top controls during picking

    // Inject picker into grid area
    if (grid) {
      grid.style.gridTemplateColumns = '';
      grid.style.gridTemplateRows = '';
      grid.innerHTML = `
        <div class="wr-picker-screen" id="wrPickerScreen">
          <div class="wr-picker-topbar">
            <button type="button" class="btn-wr-picker-back" id="btnPickerBack" title="Kembali ke Layar Utama">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>Kembali ke Dashboard</span>
            </button>
            <div class="wr-picker-mode-nav">
              <button type="button" class="wr-nav-btn" data-mode="split">📑 Layar Ganda</button>
              <button type="button" class="wr-nav-btn" data-mode="map">🗺️ Peta</button>
              <button type="button" class="wr-nav-btn" data-mode="console">🖥️ Live View AI</button>
            </div>
          </div>
          <div class="wr-picker-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <h2>Pilih Jumlah Kamera</h2>
            <p>Pilih layout tampilan, kamera online akan dipilih secara otomatis</p>
            <span class="wr-picker-badge" id="wrPickerOnlineBadge">🟢 ${warOnlineCameras.length} Kamera Online Tersedia</span>
          </div>
          <div class="wr-picker-grid">
            ${GRID_OPTIONS.map(opt => `
              <button class="wr-picker-card" data-cols="${opt.cols}" data-rows="${opt.rows}">
                <div class="wr-picker-icon wr-icon-${opt.cols}x${opt.rows}">
                  ${buildPickerIconSvg(opt.cols, opt.rows)}
                </div>
                <div class="wr-picker-num">${opt.label}</div>
                <div class="wr-picker-desc">${opt.desc}</div>
              </button>
            `).join('')}
          </div>
        </div>`;

      // Bind picker Back button
      const btnPickerBack = document.getElementById('btnPickerBack');
      if (btnPickerBack) {
        btnPickerBack.addEventListener('click', () => {
          if (window.setViewModeGlobal) window.setViewModeGlobal('split');
        });
      }

      // Bind picker mode shortcuts
      grid.querySelectorAll('.wr-picker-mode-nav .wr-nav-btn').forEach(b => {
        b.addEventListener('click', () => {
          const mode = b.getAttribute('data-mode');
          if (mode && window.setViewModeGlobal) window.setViewModeGlobal(mode);
        });
      });

      // Bind picker card clicks
      grid.querySelectorAll('.wr-picker-card').forEach(card => {
        card.addEventListener('click', () => {
          const cols = parseInt(card.getAttribute('data-cols'));
          const rows = parseInt(card.getAttribute('data-rows'));
          // Remove picker, show header, build grid with random cameras
          if (header) header.style.display = '';
          buildWarRoomGrid(cols, rows, true); // true = randomize
          // Sync layout switcher active state
          document.querySelectorAll('.wr-layout-btn').forEach(b => {
            b.classList.toggle('active',
              parseInt(b.getAttribute('data-cols')) === cols &&
              parseInt(b.getAttribute('data-rows')) === rows);
          });
        });
      });
    }
  }

  function buildPickerIconSvg(cols, rows) {
    const pad = 1, gap = 1;
    const W = 48, H = 36;
    const cellW = (W - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (H - pad * 2 - gap * (rows - 1)) / rows;
    let rects = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * (cellW + gap);
        const y = pad + r * (cellH + gap);
        rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" rx="1"/>`;
      }
    }
    return `<svg viewBox="0 0 ${W} ${H}" fill="currentColor">${rects}</svg>`;
  }

  // Restore saved city on boot if available
  const savedCity = localStorage.getItem('cctv_selected_city');
  if (savedCity === 'jogja' || savedCity === 'medan' || savedCity === 'bandung') {
    const card = document.querySelector(`.city-card[data-city-id="${savedCity}"]`);
    if (card) {
      const cityName = card.getAttribute('data-city-name');
      const lat = parseFloat(card.getAttribute('data-lat'));
      const lon = parseFloat(card.getAttribute('data-lon'));
      activateCity(savedCity, cityName, lat, lon);
    }
  }
});
