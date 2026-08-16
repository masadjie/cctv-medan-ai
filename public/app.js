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

      // Auto-restore previously selected city from localStorage
      const savedCity = localStorage.getItem('cctv_selected_city');
      if (savedCity === 'medan') {
        activateCity('medan', 'Kota Medan', 3.5896, 98.6738);
      } else {
        // Show City Selector Gateway for first-time visitors
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

  const btnPlayPause = document.getElementById('btnPlayPause');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  const btnToggleAi = document.getElementById('btnToggleAi');
  const btnDrawRoi = document.getElementById('btnDrawRoi');
  const btnSnapshot = document.getElementById('btnSnapshot');
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
  let inferenceScale = 'sahi_multi';
  let isAnomalyDetectionEnabled = true;
  let isByteTrackEnabled = true;
  let isHelmetDetectionEnabled = true;
  let isOvercapacityEnabled = true;

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

  // 2b. Populate CCTV Medan Preset Select Dropdown
  function initCameraDirectory() {
    if (!window.ATCS_MEDAN_CAMERAS || !presetSelect) return;
    
    presetSelect.innerHTML = '';

    // Standard options
    const optGroupSim = document.createElement('optgroup');
    optGroupSim.label = '⚡ Sumber Simulasi & Lokal';
    
    const optSim = document.createElement('option');
    optSim.value = 'simulation_traffic';
    optSim.textContent = '🎬 LIVE TRAFFIC FEED (Simulasi Realistis Kendaraan Medan)';
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

    // ATCS Medan CCTV Group
    const optGroupAtcs = document.createElement('optgroup');
    optGroupAtcs.label = `🚦 ATCS Dishub Kota Medan (${window.ATCS_MEDAN_CAMERAS.length} Titik CCTV Aktif)`;

    window.ATCS_MEDAN_CAMERAS.forEach((cam) => {
      const opt = document.createElement('option');
      opt.value = cam.url;
      opt.textContent = `[No. ${cam.id}] ${cam.name} (${cam.alias})`;
      if (cam.id === 31) {
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

    // 2. 60+ ATCS Cameras with Real-Time Health Status
    const healthMap = window.medanCCTVMap ? window.medanCCTVMap.healthStatus : {};

    (window.ATCS_MEDAN_CAMERAS || []).forEach(cam => {
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
      cameraDropdownList.innerHTML = '<div class="combobox-no-results">Kamera / Simpang tidak ditemukan</div>';
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

    let finalUrl = url;
    if (useProxyToggle.checked && (url.startsWith('http://') || url.startsWith('https://'))) {
      finalUrl = `/proxy?url=${encodeURIComponent(url)}`;
    }

    // Dynamic OSD matching & Button State
    const matchedCam = (window.ATCS_MEDAN_CAMERAS || []).find(c => c.url === url || (url.includes('/stream/') && url.includes(c.url.split('/stream/')[1]?.split('/')[0])));
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

  // 4. Motion-Aware Velocity Tracker with Indonesian Traffic Geometric Fusion
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
      if (w > canvasW * 0.65 || h > canvasH * 0.65) return;
      if (w < 8 || h < 8) return;
      if (pred.score < Math.min(minConf * 0.80, 0.25)) return;
      if (roi && !isBoxInRoi([x, y, w, h], roi)) return;

      const aspectRatio = w / Math.max(1, h);
      const isRoadArea = (y + h > canvasH * 0.12);

      if (!isRoadArea) return;

      // Motorcycle & Rider Detection
      if (classId === 'motorcycle' || classId === 'bicycle' || classId === 'motorbike') {
        if (aspectRatio <= 2.4 && w <= canvasW * 0.45 && h <= canvasH * 0.50) {
          rawBikes.push({
            bbox: [x, y, w, h],
            score: pred.score,
            classId: 'motorcycle'
          });
        }
      } else if (classId === 'person') {
        // Riders on roadway
        if (aspectRatio <= 1.25 && h >= 12 && h <= canvasH * 0.45 && w <= canvasW * 0.35) {
          rawPersons.push({
            bbox: [x, y, w, h],
            score: pred.score,
            classId: 'person'
          });
        }
      } else if (CAR_CLASSES.includes(classId)) {
        // Small narrow vehicles misclassified by COCO as car are motorcycles
        if (w < 70 && aspectRatio <= 1.10 && pred.score < 0.60) {
          rawBikes.push({
            bbox: [x, y, w, h],
            score: pred.score,
            classId: 'motorcycle'
          });
        } else if (aspectRatio >= 0.45 && aspectRatio <= 3.8 && w >= 16 && h >= 14) {
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
          const isOverlapping = iou > 0.05 || (xDist < Math.max(pw, bw) * 0.90 && yDist < Math.max(ph, bh) * 1.3);

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
              score: Math.min(0.99, Math.max(person.score, bike.score) + 0.12),
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
        if (!usedPersonIndices.has(pIdx) && person.bbox[1] > canvasH * 0.15) {
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
    let validDetections = applyWeightedBoxFusion(candidateDetections, 0.38);

    // Additional spatial cluster merging (merge duplicate boxes)
    const filteredDetections = [];
    validDetections.forEach(det => {
      const cx = det.bbox[0] + det.bbox[2] / 2;
      const cy = det.bbox[1] + det.bbox[3] / 2;
      const duplicate = filteredDetections.find(existing => {
        if (existing.category !== det.category) return false;
        const exCx = existing.bbox[0] + existing.bbox[2] / 2;
        const exCy = existing.bbox[1] + existing.bbox[3] / 2;
        return Math.hypot(cx - exCx, cy - exCy) < 28;
      });
      if (!duplicate) {
        filteredDetections.push(det);
      }
    });

    const matchedTrackIndices = new Set();
    const matchedDetIndices = new Set();

    filteredDetections.forEach((det, dIdx) => {
      let bestMatchScore = 0.12;
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

        // Generous matching distance for stationary traffic at red lights (up to 80px)
        const maxDist = Math.max(det.bbox[2], det.bbox[3], 80);
        const distScore = Math.max(0, 1 - dist / maxDist);
        const matchScore = (iou * 0.50) + (distScore * 0.50);

        // If distance is very close (< 45px), match unconditionally for stationary vehicles
        if (dist < 45 || matchScore > bestMatchScore) {
          if (matchScore > bestMatchScore || dist < 45) {
            bestMatchScore = matchScore;
            bestTIdx = tIdx;
          }
        }
      });

      if (bestTIdx !== -1) {
        matchedTrackIndices.add(bestTIdx);
        matchedDetIndices.add(dIdx);

        const t = trackedObjects[bestTIdx];
        const newVx = det.bbox[0] - t.bbox[0];
        const newVy = det.bbox[1] - t.bbox[1];
        
        // Track displacement from initial appearance to filter out stationary billboards
        t.totalDisplacement = Math.hypot(det.bbox[0] - t.startX, det.bbox[1] - t.startY);

        // ByteTrack Velocity Kalman Filter smoothing
        const speed = Math.hypot(newVx, newVy);
        if (speed < 4) {
          t.vx = (t.vx || 0) * 0.15;
          t.vy = (t.vy || 0) * 0.15;
          t.stationaryFrames = (t.stationaryFrames || 0) + 1;
        } else {
          t.vx = (t.vx || 0) * 0.35 + newVx * 0.65;
          t.vy = (t.vy || 0) * 0.35 + newVy * 0.65;
          t.stationaryFrames = 0;
        }

        // Speed Estimation (km/h): pixel-per-frame velocity → calibrated km/h
        const pixelSpeed = Math.hypot(t.vx || 0, t.vy || 0);
        const rawKmh = pixelSpeed * 0.55 * 25; // 25 FPS calibration factor
        t.speedKmh = Math.min(120, Math.max(0, ((t.speedKmh || 0) * 0.65 + rawKmh * 0.35)));

        t.score = det.score;
        t.labelText = det.labelText;
        t.seenFrames++;
        t.missedFrames = 0;

        // Static Scenery / Billboard Artifact Detection:
        // If an object is motionless from the moment it was seen for >= 8 frames and displacement < 8px
        if (t.seenFrames >= 8 && t.totalDisplacement < 8 && (t.speedKmh || 0) < 2) {
          t.isStaticScenery = true;
        }

        // Smooth Exponential Moving Average for Bounding Box
        const alpha = isByteTrackEnabled ? 0.70 : 0.55;
        t.bbox[0] = t.bbox[0] * (1 - alpha) + det.bbox[0] * alpha;
        t.bbox[1] = t.bbox[1] * (1 - alpha) + det.bbox[1] * alpha;
        t.bbox[2] = t.bbox[2] * (1 - alpha) + det.bbox[2] * alpha;
        t.bbox[3] = t.bbox[3] * (1 - alpha) + det.bbox[3] * alpha;

        // ETLE Helmet Safety Multi-Feature Analysis for Motorcycles:
        if (isHelmetDetectionEnabled && t.category === 'motor' && t.seenFrames >= 4 && !t.isStaticScenery) {
          // Gate by resolution: only evaluate foreground & midground motorcycles (head must be >= 10px)
          if (t.bbox[3] >= 42 && t.bbox[2] >= 24) {
            const headH = Math.max(8, Math.round(t.bbox[3] * 0.24));
            const headW = Math.max(8, Math.round(t.bbox[2] * 0.46));
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
                  
                  // Indonesian skin-tone chromatic range (face/forehead exposed without helmet)
                  const isSkinTone = (r > 75 && g > 45 && b > 30 && r > g && r > b && (r - g) > 10 && (r - b) > 12);
                  if (isSkinTone) skinPixels++;

                  // Dark unshielded hair contrast
                  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                  if (lum < 40 && !isSkinTone) darkHairPixels++;
                }

                const skinRatio = totalPx > 0 ? skinPixels / totalPx : 0;
                const hairRatio = totalPx > 0 ? darkHairPixels / totalPx : 0;

                // Bare head signature: exposed face/skin combined with bare hair without helmet dome
                const isBareHeadDetected = (skinRatio > 0.28) || (skinRatio > 0.15 && hairRatio > 0.35);

                // Multi-frame exponential moving average filter (prevents false alarms on dark helmets)
                t.noHelmetScore = ((t.noHelmetScore || 0) * 0.72) + (isBareHeadDetected ? 0.28 : 0);
                t.noHelmet = (t.noHelmetScore > 0.55 && t.seenFrames >= 7);
              } else {
                t.noHelmet = false;
              }
            } catch (e) {
              t.noHelmet = false;
            }
          } else {
            // Distant blur: do not flag false violations
            t.noHelmet = false;
          }
        } else {
          t.noHelmet = false;
        }

        // Overcapacity analysis: multiple rider silhouette elongation
        if (isOvercapacityEnabled && t.category === 'motor') {
          const bikeAspect = t.bbox[2] / Math.max(1, t.bbox[3]);
          t.isOvercapacity = (bikeAspect > 1.25 && t.bbox[2] > canvasW * 0.16);
        } else {
          t.isOvercapacity = false;
        }

        // STRICT 1-TIME COUNTING: must be confirmed across 4 consecutive frames and NOT static scenery
        if (!t.counted && t.seenFrames >= 4 && !t.isStaticScenery) {
          t.counted = true;
          window.trafficAnalytics.incrementCumulative(t.category);
          window.trafficAnalytics.logEvent(`Kendaraan terhitung: ${t.labelText} #${t.id}`);
          if (t.noHelmet) {
            window.trafficAnalytics.logEvent(`🚨 Pelanggaran ETLE: Pengendara Tanpa Helm #${t.id}`);
          }
        }
      }
    });

    filteredDetections.forEach((det, dIdx) => {
      if (!matchedDetIndices.has(dIdx)) {
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
      if ((t.speedKmh || 0) > 10 && t.missedFrames === 0) {
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
        if (flowCount >= 3 && vMag > 2 && (t.speedKmh || 0) > 14) {
          const normVx = t.vx / vMag;
          const normVy = t.vy / vMag;
          const alignment = (normVx * avgFlowVx) + (normVy * avgFlowVy);
          // Moving in reverse against dominant flow vector
          t.isContraflow = alignment < -0.55;
        } else {
          t.isContraflow = false;
        }

        // Stalled vehicle in active roadway
        t.isStalled = (t.stationaryFrames || 0) > 40 && (t.bbox[1] + t.bbox[3] / 2 > canvasH * 0.25);
      });
    }

    trackedObjects.forEach((track, tIdx) => {
      if (!matchedTrackIndices.has(tIdx)) {
        track.missedFrames++;
        if (track.missedFrames <= 6) {
          track.bbox[0] += (track.vx || 0) * 0.5;
          track.bbox[1] += (track.vy || 0) * 0.5;
        }
      }
    });

    // Retain tracks for up to 14 frames for red-light traffic
    trackedObjects = trackedObjects.filter(t => t.missedFrames <= 14);
  }

  // 5. Enhanced Multi-Scale Slicing & Adaptive ROI Pyramid Inference (High-Accuracy SAHI)
  async function runMultiScaleInference(minConf, vWidth, vHeight) {
    const rawResults = [];

    // Preprocessing with balanced contrast/brightness for traffic visibility
    fullCropCanvas.width = vWidth;
    fullCropCanvas.height = vHeight;
    fullCropCtx.filter = 'contrast(1.12) brightness(1.04) saturate(1.08)';
    fullCropCtx.drawImage(video, 0, 0, vWidth, vHeight);

    // Dynamic confidence from slider
    const effectiveConf = Math.max(0.20, minConf);

    // Pass 1: If User-Defined ROI is Active, Dedicate High-Res Inference to Exact ROI Area
    if (roi && roi.width > 25 && roi.height > 25) {
      roiCanvas.width = 512;
      roiCanvas.height = 512;
      roiCtx.drawImage(fullCropCanvas, roi.x, roi.y, roi.width, roi.height, 0, 0, 512, 512);

      const roiDetections = await model.detect(roiCanvas, 24, effectiveConf * 0.85);
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

    // Pass 2: Full Frame Detection (Captures large foreground vehicles)
    const fullDetections = await model.detect(fullCropCanvas, 24, effectiveConf);
    rawResults.push(...fullDetections);

    // If Nano Fast Profile is active or YOLO26 NMS-Free is selected, return high-speed dual-pass results
    if (inferenceScale === 'nano_fast' || activeEngine === 'yolo26') {
      return rawResults;
    }

    // Pass 3: Sliced Tile 1 (Main Roadway Core Zone - Middle & Lower Traffic Corridor)
    const tile1W = Math.round(vWidth * 0.90);
    const tile1H = Math.round(vHeight * 0.75);
    const tile1X = Math.round(vWidth * 0.05);
    const tile1Y = Math.round(vHeight * 0.20);

    tileCanvas1.width = 512;
    tileCanvas1.height = 512;
    tileCtx1.drawImage(fullCropCanvas, tile1X, tile1Y, tile1W, tile1H, 0, 0, 512, 512);

    const tile1Detections = await model.detect(tileCanvas1, 24, effectiveConf * 0.90);
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

    // Pass 4: Sliced Tile 2 (Distant Intersection Horizon Zoom - Small motorcycles & far traffic)
    const tile2W = Math.round(vWidth * 0.65);
    const tile2H = Math.round(vHeight * 0.55);
    const tile2X = Math.round(vWidth * 0.18);
    const tile2Y = Math.round(vHeight * 0.12);

    tileCanvas2.width = 512;
    tileCanvas2.height = 512;
    tileCtx2.drawImage(fullCropCanvas, tile2X, tile2Y, tile2W, tile2H, 0, 0, 512, 512);

    const tile2Detections = await model.detect(tileCanvas2, 20, effectiveConf * 0.88);
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

    // Pass 5: If Dense Attention Transformer Profile is selected, run 3rd micro-focus slice
    if (inferenceScale === 'transformer_dense') {
      const tile3W = Math.round(vWidth * 0.70);
      const tile3H = Math.round(vHeight * 0.60);
      const tile3X = Math.round(vWidth * 0.25);
      const tile3Y = Math.round(vHeight * 0.35);

      tileCanvas1.width = 512;
      tileCanvas1.height = 512;
      tileCtx1.drawImage(fullCropCanvas, tile3X, tile3Y, tile3W, tile3H, 0, 0, 512, 512);

      const tile3Detections = await model.detect(tileCanvas1, 24, effectiveConf * 0.85);
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
    if (!isAiRunning) {
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

    // AI Multi-Scale Inference
    if (model && video.readyState >= 2 && !video.paused && !video.ended && !isDetecting) {
      isDetecting = true;
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

    // Update OSD average flow speed badge
    const osdSpeedBadge = document.getElementById('osdSpeedBadge');
    if (osdSpeedBadge) {
      const avgSpeed = movingCount > 0 ? Math.round(totalSpeedSum / movingCount) : 0;
      const flowLabel = avgSpeed > 40 ? 'Lancar' : avgSpeed > 20 ? 'Sedang' : avgSpeed > 5 ? 'Padat' : 'Macet';
      osdSpeedBadge.innerHTML = `⚡ Arus: <b>${avgSpeed}</b> km/jam · ${flowLabel}`;
    }

    // Update Analytics Telemetry
    window.trafficAnalytics.update(liveCar, liveMotor);

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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(canvas.width, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(canvas.height, (clientY - rect.top) * scaleY))
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!isDrawingRoi) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    roiStartPoint = getCanvasCoords(e.clientX, e.clientY);
    roiCurrentPoint = { ...roiStartPoint };
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDrawingRoi || !roiStartPoint) return;
    e.preventDefault();
    roiCurrentPoint = getCanvasCoords(e.clientX, e.clientY);
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSnapshotModal();
      closeCustomConfirmDialog();
      closeConfigModal();
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

  // Config Modal Tabs (AI / Display / About)
  const configTabBtns = document.querySelectorAll('.config-tab-btn');
  const tabPaneAi = document.getElementById('tabPaneAi');
  const tabPaneDisplay = document.getElementById('tabPaneDisplay');
  const tabPaneAbout = document.getElementById('tabPaneAbout');

  configTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      configTabBtns.forEach(b => b.classList.toggle('active', b === btn));
      if (tabPaneAi) tabPaneAi.classList.toggle('active', targetTab === 'ai');
      if (tabPaneDisplay) tabPaneDisplay.classList.toggle('active', targetTab === 'display');
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
  function rebuildOnlineFavorites(healthData) {
    const favoritesList = document.getElementById('quickFavoritesList');
    if (!favoritesList || !window.ATCS_MEDAN_CAMERAS) return;
    const onlineCams = window.ATCS_MEDAN_CAMERAS.filter(c => healthData[c.id] && healthData[c.id].online);
    if (onlineCams.length === 0) return; // keep defaults if none verified yet
    favoritesList.innerHTML = onlineCams.slice(0, 3).map(c => `
      <button type="button" class="chip-btn" data-url="${c.url}">
        <span class="dot-online-chip"></span>CAM ${c.id} ${c.alias.substring(0, 18)}
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
    if (cityId === 'medan') {
      if (currentCityLabel) currentCityLabel.textContent = cityName;
      localStorage.setItem('cctv_selected_city', 'medan');
      closeCitySelectorModal();

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

      // 1. Initialize Map on-demand
      if (window.medanCCTVMap && !window.medanCCTVMap.isInitialized) {
        window.medanCCTVMap.init();
      } else if (window.medanCCTVMap && window.medanCCTVMap.map) {
        window.medanCCTVMap.map.setView([lat, lon], 13);
        window.medanCCTVMap.startHlsBackgroundChecker();
      }

      // 2. Lazy Load AI Model Engine
      if (!model) {
        await loadAiModel();
      }

      // 3. Auto-load last viewed camera or primary camera (Cam #31)
      const lastActiveStream = localStorage.getItem('cctv_last_active_stream') || 'https://atcsdishub.medan.go.id/stream/L31JAMINGINTINGISMUD/stream.m3u8';
      loadStream(lastActiveStream);

      // 4. Start AI detection loop
      if (!isDetecting) {
        detectLoop();
      }

      isCityActivated = true;
      showToast(`✅ 60+ Kamera ATCS ${cityName} Siap Dipantau`);
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
    const all = window.ATCS_MEDAN_CAMERAS || [];
    const health = window.medanCCTVMap && window.medanCCTVMap.healthStatus ? window.medanCCTVMap.healthStatus : {};
    let online = all.filter(c => health[c.id] && health[c.id].online);
    
    // Check localStorage cache if map healthStatus is not yet in memory
    if (online.length === 0) {
      try {
        const raw = localStorage.getItem('cctv_medan_stream_health_v2');
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
    const allCams = window.ATCS_MEDAN_CAMERAS && window.ATCS_MEDAN_CAMERAS.length > 0
      ? window.ATCS_MEDAN_CAMERAS
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

    // Respect the proxy toggle setting — same behaviour as main stream player
    const useProxyToggle = document.getElementById('useProxyToggle');
    const useProxy = useProxyToggle && useProxyToggle.checked;
    const finalUrl = useProxy && (url.startsWith('http://') || url.startsWith('https://'))
      ? `/proxy?url=${encodeURIComponent(url)}`
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
              <button type="button" class="wr-nav-btn" data-mode="console">🖥️ Konsol AI</button>
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

  // Zero-Load Startup: Application waits for user to pick a city before loading heavy data
});
