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

  // Modal Elements
  const snapshotModal = document.getElementById('snapshotModal');
  const snapshotImg = document.getElementById('snapshotImg');
  const snapshotInfo = document.getElementById('snapshotInfo');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnDownloadSnapshot = document.getElementById('btnDownloadSnapshot');
  const toastContainer = document.getElementById('toastContainer');

  // State Variables
  let activeEngine = 'yolo';
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
  let activeEngine = 'yolo11';
  let inferenceScale = 'sahi_multi';

  const ENGINE_LABELS = {
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
    } else {
      const fallbackName = url.split('/').filter(Boolean).pop() || 'Lokal';
      osdCamName.textContent = 'CCTV: ' + fallbackName;
      if (window.trafficAnalytics) {
        window.trafficAnalytics.setActiveCamera(url, fallbackName);
      }
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

    // Step 1: Categorize raw detections
    rawDetections.forEach(pred => {
      const [x, y, w, h] = pred.bbox;
      const classId = pred.class.toLowerCase();

      // Filter out invalid bounding boxes
      if (w > canvasW * 0.70 || h > canvasH * 0.75) return;
      if (w < 8 || h < 8) return;
      if (roi && !isBoxInRoi([x, y, w, h], roi)) return;

      const aspectRatio = w / Math.max(1, h);
      const isSmallOrVertical = (w < 85 && h < 115 && aspectRatio <= 1.20);
      const isRoadArea = (y > canvasH * 0.10);

      // Classes identified in journal literature (car, truck, bus, motorbike/motorcycle, bicycle, person/rider)
      if (classId === 'motorcycle' || classId === 'bicycle' || classId === 'motorbike') {
        rawBikes.push({
          bbox: [x, y, w, h],
          score: Math.max(pred.score, 0.40),
          classId: 'motorcycle'
        });
      } else if (classId === 'person') {
        // In traffic camera POV, persons on the roadway are motorcycle riders
        if (isRoadArea && (aspectRatio <= 1.15 || h >= 14)) {
          rawPersons.push({
            bbox: [x, y, w, h],
            score: pred.score,
            classId: 'person'
          });
        }
      } else if (CAR_CLASSES.includes(classId)) {
        // Address small object classification challenge noted in YOLO research:
        // Small/narrow vehicles with lower confidence are motorcycles/scooters
        if (isSmallOrVertical && pred.score < 0.58 && classId === 'car' && (w < 65 || aspectRatio <= 0.95)) {
          rawBikes.push({
            bbox: [x, y, w, h],
            score: pred.score,
            classId: 'motorcycle'
          });
        } else {
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
      // 2a. Check for Person + Bike overlapping combinations
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
          const isOverlapping = iou > 0.05 || (xDist < Math.max(pw, bw) * 0.95 && yDist < Math.max(ph, bh) * 1.4);

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

      // 2b. Standalone Motorcycles/Bicycles (Actual vehicle bodies detected)
      rawBikes.forEach((bike, bIdx) => {
        if (!usedBikeIndices.has(bIdx)) {
          candidateDetections.push({
            category: 'motor',
            labelText: 'Sepeda Motor',
            strokeColor: COLOR_MOTOR,
            score: Math.max(bike.score, 0.35),
            bbox: [...bike.bbox]
          });
        }
      });

      // 2c. Standalone Riders on Roadway (Rider silhouettes whose bike chassis was merged in low light)
      rawPersons.forEach((person, pIdx) => {
        if (!usedPersonIndices.has(pIdx)) {
          const [px, py, pw, ph] = person.bbox;
          const pAspect = pw / Math.max(1, ph);
          if (pAspect <= 1.15 && ph >= 12 && py > canvasH * 0.10) {
            candidateDetections.push({
              category: 'motor',
              labelText: 'Sepeda Motor',
              strokeColor: COLOR_MOTOR,
              score: Math.max(person.score, 0.30),
              bbox: [px, py, pw, ph]
            });
          }
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

    // Step 4: Strict NMS per category to prevent duplicate bounding boxes
    const validDetections = applyNMS(candidateDetections, 0.40);
    const matchedTrackIndices = new Set();
    const matchedDetIndices = new Set();

    validDetections.forEach((det, dIdx) => {
      let bestMatchScore = 0.18;
      let bestTIdx = -1;

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
        const detCx = det.bbox[0] + det.bbox[2] / 2;
        const detCy = det.bbox[1] + det.bbox[3] / 2;
        const predCx = predictedBox[0] + predictedBox[2] / 2;
        const predCy = predictedBox[1] + predictedBox[3] / 2;
        const dist = Math.hypot(detCx - predCx, detCy - predCy);

        const maxDist = Math.max(det.bbox[2], det.bbox[3], 70);
        const distScore = Math.max(0, 1 - dist / maxDist);
        const matchScore = (iou * 0.65) + (distScore * 0.35);

        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestTIdx = tIdx;
        }
      });

      if (bestTIdx !== -1) {
        matchedTrackIndices.add(bestTIdx);
        matchedDetIndices.add(dIdx);

        const t = trackedObjects[bestTIdx];
        const newVx = det.bbox[0] - t.bbox[0];
        const newVy = det.bbox[1] - t.bbox[1];
        t.vx = (t.vx || 0) * 0.30 + newVx * 0.70;
        t.vy = (t.vy || 0) * 0.30 + newVy * 0.70;

        t.score = det.score;
        t.labelText = det.labelText;
        t.seenFrames++;
        t.missedFrames = 0;

        // Kalman-inspired Exponential Smoothing
        const alpha = 0.70;
        t.bbox[0] = t.bbox[0] * (1 - alpha) + det.bbox[0] * alpha;
        t.bbox[1] = t.bbox[1] * (1 - alpha) + det.bbox[1] * alpha;
        t.bbox[2] = t.bbox[2] * (1 - alpha) + det.bbox[2] * alpha;
        t.bbox[3] = t.bbox[3] * (1 - alpha) + det.bbox[3] * alpha;

        // Accurate Cumulative Counting: must be seen across 2 consecutive frames
        if (!t.counted && t.seenFrames >= 2) {
          t.counted = true;
          window.trafficAnalytics.incrementCumulative(t.category);
          window.trafficAnalytics.logEvent(`Objek terdeteksi: ${t.labelText} #${t.id}`);
        }
      }
    });

    validDetections.forEach((det, dIdx) => {
      if (!matchedDetIndices.has(dIdx)) {
        trackedObjects.push({
          id: nextTrackId++,
          category: det.category,
          labelText: det.labelText,
          strokeColor: det.strokeColor,
          score: det.score,
          bbox: [...det.bbox],
          vx: 0,
          vy: 0,
          seenFrames: 1,
          counted: false,
          missedFrames: 0
        });
      }
    });

    trackedObjects.forEach((track, tIdx) => {
      if (!matchedTrackIndices.has(tIdx)) {
        track.missedFrames++;
        if (track.missedFrames <= 2) {
          track.bbox[0] += (track.vx || 0) * 0.8;
          track.bbox[1] += (track.vy || 0) * 0.8;
        }
      }
    });

    trackedObjects = trackedObjects.filter(t => t.missedFrames <= 4);
  }

  // 5. Enhanced Multi-Scale Slicing & Adaptive ROI Pyramid Inference
  async function runMultiScaleInference(minConf, vWidth, vHeight) {
    const rawResults = [];

    // Preprocessing on full canvas with adaptive contrast & luminance equalizer
    fullCropCanvas.width = vWidth;
    fullCropCanvas.height = vHeight;
    fullCropCtx.filter = 'contrast(1.22) brightness(1.08) saturate(1.15)';
    fullCropCtx.drawImage(video, 0, 0, vWidth, vHeight);

    // Pass 1: If User-Defined ROI is Active, Dedicate High-Resolution Inference to Exact ROI Area
    if (roi && roi.width > 25 && roi.height > 25) {
      roiCanvas.width = 448;
      roiCanvas.height = 448;
      roiCtx.drawImage(fullCropCanvas, roi.x, roi.y, roi.width, roi.height, 0, 0, 448, 448);

      const roiDetections = await model.detect(roiCanvas, 25, minConf * 0.65);
      roiDetections.forEach(d => {
        const scaleX = roi.width / 448;
        const scaleY = roi.height / 448;
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
    const fullDetections = await model.detect(fullCropCanvas, 24, minConf * 0.75);
    rawResults.push(...fullDetections);

    // If Nano Fast Profile is active or YOLO26 NMS-Free is selected, return high-speed dual-pass results
    if (inferenceScale === 'nano_fast' || activeEngine === 'yolo26') {
      return rawResults;
    }

    // Pass 3: Sliced Tile 1 (Main Roadway Core Zone - Middle & Lower Frame)
    const tile1W = Math.round(vWidth * 0.88);
    const tile1H = Math.round(vHeight * 0.75);
    const tile1X = Math.round(vWidth * 0.06);
    const tile1Y = Math.round(vHeight * 0.20);

    tileCanvas1.width = 448;
    tileCanvas1.height = 448;
    tileCtx1.drawImage(fullCropCanvas, tile1X, tile1Y, tile1W, tile1H, 0, 0, 448, 448);

    const tile1Detections = await model.detect(tileCanvas1, 30, Math.min(minConf * 0.50, 0.22));
    tile1Detections.forEach(d => {
      const scaleX = tile1W / 448;
      const scaleY = tile1H / 448;
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

    // Pass 4: Sliced Tile 2 (Distant Intersection Horizon Zoom - Catches small distant motorcycles)
    const tile2W = Math.round(vWidth * 0.65);
    const tile2H = Math.round(vHeight * 0.55);
    const tile2X = Math.round(vWidth * 0.18);
    const tile2Y = Math.round(vHeight * 0.10);

    tileCanvas2.width = 448;
    tileCanvas2.height = 448;
    tileCtx2.drawImage(fullCropCanvas, tile2X, tile2Y, tile2W, tile2H, 0, 0, 448, 448);

    const tile2Detections = await model.detect(tileCanvas2, 28, Math.min(minConf * 0.48, 0.20));
    tile2Detections.forEach(d => {
      const scaleX = tile2W / 448;
      const scaleY = tile2H / 448;
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
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fillRect(roi.x, roi.y, roi.width, roi.height);
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
      
      // ROI Label Badge
      ctx.setLineDash([]);
      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      const roiLabel = '📍 ZONA DETEKSI AKTIF (ZOOM INFERENCE)';
      const roiTextW = ctx.measureText(roiLabel).width;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(roi.x, Math.max(0, roi.y - 24), roiTextW + 16, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(roiLabel, roi.x + 8, Math.max(16, roi.y - 8));
      ctx.restore();
    }

    // 2. Draw Live Interactive Selection while Dragging Mouse
    if (isDrawingRoi && roiStartPoint && roiCurrentPoint) {
      const selX = Math.min(roiStartPoint.x, roiCurrentPoint.x);
      const selY = Math.min(roiStartPoint.y, roiCurrentPoint.y);
      const selW = Math.abs(roiCurrentPoint.x - roiStartPoint.x);
      const selH = Math.abs(roiCurrentPoint.y - roiStartPoint.y);

      ctx.save();
      // Translucent cyan selection fill
      ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.fillRect(selX, selY, selW, selH);

      // Glowing animated dashed outline
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
      const dimLabel = `📐 ${Math.round(selW)} × ${Math.round(selH)} px (Lepaskan klik untuk mengunci zona)`;
      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      const dimW = ctx.measureText(dimLabel).width;
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(selX, Math.max(0, selY - 24), dimW + 14, 22);
      ctx.fillStyle = '#0b0f17';
      ctx.fillText(dimLabel, selX + 7, Math.max(16, selY - 8));
      ctx.restore();
    }

    // 3. Draw Tracked Vehicle & Pedestrian Bounding Boxes
    trackedObjects.forEach(obj => {
      const [x, y, w, h] = obj.bbox;
      const strokeColor = obj.strokeColor;

      if (obj.category === 'car') liveCar++;
      else if (obj.category === 'motor') liveMotor++;

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 8;

      // Draw Main Bounding Box
      ctx.strokeRect(x, y, w, h);

      // Draw Corner Accents
      const corner = Math.min(14, w / 4, h / 4);
      ctx.lineWidth = 3.5;
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

      // Draw Motion Trail Vector if moving
      if (Math.hypot(obj.vx || 0, obj.vy || 0) > 1.5) {
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(x + w / 2, y + h / 2);
        ctx.lineTo(x + w / 2 + (obj.vx || 0) * 3, y + h / 2 + (obj.vy || 0) * 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Badge Label
      if (showLabels) {
        const scorePercent = Math.round(obj.score * 100);
        const text = `${obj.labelText} #${obj.id} (${scorePercent}%)`;
        ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
        const textWidth = ctx.measureText(text).width;
        const badgeH = 20;

        ctx.fillStyle = strokeColor;
        ctx.shadowBlur = 0;
        ctx.fillRect(x, Math.max(0, y - badgeH), textWidth + 12, badgeH);

        ctx.fillStyle = '#0b0f17';
        ctx.fillText(text, x + 6, Math.max(14, y - 5));
      }

      ctx.restore();
    });

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

  // 8. ROI Interactive Drawing Listeners (mousedown, mousemove, mouseup)
  // 8. ROI Interactive Drawing Listeners (mousedown, mousemove, mouseup on window)
  btnDrawRoi.addEventListener('click', () => {
    if (roi) {
      roi = null;
      roiStartPoint = null;
      roiCurrentPoint = null;
      isDrawingRoi = false;
      btnDrawRoi.classList.remove('active');
      btnDrawRoi.querySelector('span').textContent = 'Set Zona Deteksi';
      canvas.classList.remove('drawing-roi');
      if (videoContainer) videoContainer.classList.remove('roi-drawing-mode');
      showToast('Zona deteksi direset ke seluruh layar');
      return;
    }

    isDrawingRoi = true;
    roiStartPoint = null;
    roiCurrentPoint = null;
    canvas.classList.add('drawing-roi');
    if (videoContainer) videoContainer.classList.add('roi-drawing-mode');
    showToast('Klik dan tarik kursor pada video untuk memilih zona deteksi spesifik');
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!isDrawingRoi) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    roiStartPoint = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
    roiCurrentPoint = { ...roiStartPoint };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDrawingRoi || !roiStartPoint) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const curX = Math.max(0, Math.min(canvas.width, (e.clientX - rect.left) * scaleX));
    const curY = Math.max(0, Math.min(canvas.height, (e.clientY - rect.top) * scaleY));
    roiCurrentPoint = { x: curX, y: curY };
  });

  window.addEventListener('mouseup', (e) => {
    if (!isDrawingRoi || !roiStartPoint) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const endX = Math.max(0, Math.min(canvas.width, (e.clientX - rect.left) * scaleX));
    const endY = Math.max(0, Math.min(canvas.height, (e.clientY - rect.top) * scaleY));

    const x = Math.min(roiStartPoint.x, endX);
    const y = Math.min(roiStartPoint.y, endY);
    const w = Math.abs(endX - roiStartPoint.x);
    const h = Math.abs(endY - roiStartPoint.y);

    if (w > 30 && h > 30) {
      roi = { x, y, width: w, height: h };
      btnDrawRoi.classList.add('active');
      btnDrawRoi.querySelector('span').textContent = 'Reset Zona Deteksi';
      showToast('Zona deteksi terkunci! Neural zoom presisi tinggi aktif pada area terpilih.');
    } else {
      roi = null;
      btnDrawRoi.classList.remove('active');
      btnDrawRoi.querySelector('span').textContent = 'Set Zona Deteksi';
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

  if (inferenceScaleSelect) {
    inferenceScaleSelect.addEventListener('change', () => {
      inferenceScale = inferenceScaleSelect.value;
      showToast(inferenceScale === 'sahi_multi' ? '🔬 Profil SAHI Multi-Scale Aktif' : '⚡ Profil Nano Real-time Aktif');
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

  // Favorite quick chips
  const chipBtns = document.querySelectorAll('.chip-btn');
  function updateActiveChip(url) {
    chipBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-url') === url);
    });
  }

  chipBtns.forEach(btn => {
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

  // 13. View Mode Switcher (Peta CCTV / Konsol AI / Split)
  const mainLayout = document.getElementById('mainLayout');
  const tabBtns = document.querySelectorAll('.view-mode-tabs .tab-btn');
  const btnMaximizeConsole = document.getElementById('btnMaximizeConsole');

  function setViewMode(mode) {
    if (!mainLayout) return;
    mainLayout.className = `main-layout mode-${mode}`;
    tabBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });

    if (mode === 'map' || mode === 'split') {
      if (window.medanCCTVMap) {
        window.medanCCTVMap.invalidateSize();
      }
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

      // 3. Start AI detection loop
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

  // Zero-Load Startup: Application waits for user to pick a city before loading heavy data
});
