/**
 * Nusantara Traffic Vision - High-Performance Interactive CCTV Map (Leaflet.js)
 * Clean, butter-smooth map module with Resumable Progressive Stream Health Caching
 */

class MedanCCTVMap {
  constructor(mapContainerId, cameras) {
    this.containerId = mapContainerId;
    this.cameras = cameras || [];
    this.map = null;
    this.markers = [];
    this.selectedCameraId = null;
    this.isInitialized = false;
    this.healthStatus = {};
    this.isCheckingHls = false;
    this.isMapMoving = false;
    this.cacheKey = 'cctv_health_cache_medan_v2';
    this.onlineCount = 0;
    this.offlineCount = 0;
    this.currentScanIndex = -1;
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container || this.isInitialized) return;

    // Center on Medan City Hall / Lapangan Merdeka
    const medanCenter = [3.5896, 98.6738];
    this.map = L.map(this.containerId, {
      center: medanCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      wheelDebounceTime: 40,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true
    });

    // Custom Zoom Control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Map Tile Themes
    this.tileLayers = {
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }),
      darkNight: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }),
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      })
    };

    // Default to Dark theme for sleek surveillance aesthetic
    this.currentTileLayer = this.tileLayers.darkNight;
    this.currentTileLayer.addTo(this.map);

    // 1. Check LocalStorage Cache for Instant / Resumable Device Health
    const cacheState = this.loadCachedHealth();

    // Render Markers with cached or initial state
    this.renderMarkers();
    this.setupSearch();
    this.setupPopupListener();
    this.setupRescanButton();
    this.isInitialized = true;

    // Pause checks during user drag / zoom to guarantee 60 FPS
    this.map.on('movestart zoomstart', () => {
      this.isMapMoving = true;
    });
    this.map.on('moveend zoomend', () => {
      this.isMapMoving = false;
    });

    // Handle scan lifecycle: Resume if in-progress, or start from 0 if new
    if (cacheState === 'resume') {
      const nextIndex = this.currentScanIndex + 1;
      setTimeout(() => this.startHlsBackgroundChecker(nextIndex), 350);
    } else if (cacheState === false) {
      setTimeout(() => this.startHlsBackgroundChecker(0), 350);
    }
  }

  /**
   * Load and apply persisted online/offline camera status from localStorage.
   * Returns:
   *  - true: Scan was 100% complete, loaded fully from cache
   *  - 'resume': Scan was interrupted (e.g. by refresh), ready to continue from last index
   *  - false: No previous cache found
   */
  loadCachedHealth() {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return false;

      const cache = JSON.parse(raw);
      if (!cache || !cache.cameras) return false;

      this.healthStatus = cache.cameras;
      this.onlineCount = cache.onlineCount || 0;
      this.offlineCount = cache.offlineCount || 0;
      this.currentScanIndex = typeof cache.lastScannedIndex === 'number' ? cache.lastScannedIndex : -1;

      const totalCount = this.cameras.length;
      const isComplete = cache.isComplete === true || this.currentScanIndex >= totalCount - 1;

      const scanStatusTitle = document.getElementById('scanStatusTitle');
      const scanPercentPill = document.getElementById('scanPercentPill');
      const scanProgressFill = document.getElementById('scanProgressFill');
      const scanProcessedText = document.getElementById('scanProcessedText');
      const scanOnlineCount = document.getElementById('scanOnlineCount');
      const scanOfflineCount = document.getElementById('scanOfflineCount');
      const scanTextEl = document.getElementById('mapStreamScanText');

      if (isComplete) {
        if (scanStatusTitle) scanStatusTitle.textContent = 'Status CCTV Terverifikasi';
        if (scanPercentPill) scanPercentPill.textContent = '100%';
        if (scanProgressFill) scanProgressFill.style.width = '100%';
        if (scanProcessedText) scanProcessedText.textContent = `Node: ${totalCount}/${totalCount}`;
        if (scanOnlineCount) scanOnlineCount.textContent = `🟢 ${this.onlineCount} Online`;
        if (scanOfflineCount) scanOfflineCount.textContent = `🔴 ${this.offlineCount} Offline`;

        if (scanTextEl) {
          scanTextEl.innerHTML = `Node Terpindai &bull; <span style="color:#10b981">🟢 ${this.onlineCount}</span> <span style="color:#ef4444">🔴 ${this.offlineCount}</span>`;
        }

        // Auto-minimize into compact icon/pill when complete
        this.minimizeScannerHud();

        window.dispatchEvent(new CustomEvent('cctv-health-updated', { detail: { cameras: this.healthStatus } }));
        return true;
      } else {
        // Interrupted / Resumable State
        this.expandScannerHud();
        const processed = this.currentScanIndex + 1;
        const percent = Math.round((processed / totalCount) * 100);

        if (scanStatusTitle) scanStatusTitle.textContent = 'Melanjutkan Pemindaian CCTV...';
        if (scanPercentPill) scanPercentPill.textContent = `${percent}%`;
        if (scanProgressFill) scanProgressFill.style.width = `${percent}%`;
        if (scanProcessedText) scanProcessedText.textContent = `Node: ${processed}/${totalCount}`;
        if (scanOnlineCount) scanOnlineCount.textContent = `🟢 ${this.onlineCount} Online`;
        if (scanOfflineCount) scanOfflineCount.textContent = `🔴 ${this.offlineCount} Offline`;

        if (scanTextEl) {
          scanTextEl.innerHTML = `Lanjut ${processed}/${totalCount} &bull; <span style="color:#10b981">🟢 ${this.onlineCount}</span> <span style="color:#ef4444">🔴 ${this.offlineCount}</span>`;
        }

        window.dispatchEvent(new CustomEvent('cctv-health-updated', { detail: { cameras: this.healthStatus } }));
        return 'resume';
      }
    } catch (e) {
      console.warn('Failed to load cached CCTV health:', e);
      return false;
    }
  }

  /**
   * Save incremental scan progress to persistent localStorage after every single camera probe
   */
  saveHealthProgress(lastScannedIndex, isComplete = false) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        timestamp: Date.now(),
        lastScannedIndex,
        totalCount: this.cameras.length,
        onlineCount: this.onlineCount,
        offlineCount: this.offlineCount,
        isComplete,
        cameras: this.healthStatus
      }));
    } catch (e) {}
  }

  /**
   * Fast & Direct Native Stream Health Verifier (Direct browser connection, no proxy blocking)
   */
  checkHlsStreamHealth(url, timeoutMs = 3000) {
    return new Promise((resolve) => {
      if (!url) {
        resolve({ online: false, latencyMs: 0 });
        return;
      }

      const startTime = performance.now();
      const controller = new AbortController();
      let isSettled = false;

      const finalize = (isOnline, latency = null) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        const latencyMs = latency || Math.round(performance.now() - startTime);
        resolve({ online: isOnline, latencyMs });
      };

      const timer = setTimeout(() => {
        controller.abort();
        finalize(false, 0);
      }, timeoutMs);

      // 1. Direct browser fetch probe (atcsdishub has open CORS)
      fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal, headers: { 'Range': 'bytes=0-512' } })
        .then(res => {
          if (res.ok || res.status === 200 || res.status === 206 || res.status === 304) {
            finalize(true);
          } else {
            finalize(false, 0);
          }
        })
        .catch(() => {
          // 2. Direct Headless HLS probe if supported
          if (window.Hls && window.Hls.isSupported() && url.includes('.m3u8')) {
            let hlsTest;
            try {
              hlsTest = new window.Hls({
                manifestLoadingTimeOut: 2000,
                manifestLoadingMaxRetry: 0,
                enableWorker: false
              });
              hlsTest.on(window.Hls.Events.MANIFEST_PARSED, () => {
                try { hlsTest.destroy(); } catch (e) {}
                finalize(true);
              });
              hlsTest.on(window.Hls.Events.ERROR, () => {
                try { hlsTest.destroy(); } catch (e) {}
                finalize(false, 0);
              });
              hlsTest.loadSource(url);
            } catch (e) {
              finalize(false, 0);
            }
          } else {
            finalize(false, 0);
          }
        });
    });
  }

  /**
   * Resumable sequential verification loop:
   * Continues from startIndex and saves progress incrementally
   */
  async startHlsBackgroundChecker(startIndex = 0) {
    if (this.isCheckingHls) return;
    this.isCheckingHls = true;

    const scanTextEl = document.getElementById('mapStreamScanText');
    const scanStatusTitle = document.getElementById('scanStatusTitle');
    const scanPercentPill = document.getElementById('scanPercentPill');
    const scanProgressFill = document.getElementById('scanProgressFill');
    const scanProcessedText = document.getElementById('scanProcessedText');
    const scanOnlineCount = document.getElementById('scanOnlineCount');
    const scanOfflineCount = document.getElementById('scanOfflineCount');
    const mapScannerHud = document.getElementById('mapScannerHud');

    const totalCount = this.cameras.length;

    // Reset counts only if starting fresh from 0
    if (startIndex === 0) {
      this.onlineCount = 0;
      this.offlineCount = 0;
      this.currentScanIndex = -1;
    }

    if (mapScannerHud) mapScannerHud.style.display = 'block';
    if (scanStatusTitle) {
      scanStatusTitle.textContent = startIndex > 0 ? 'Melanjutkan Pemindaian CCTV...' : 'Memindai Status Live Stream...';
    }

    for (let i = startIndex; i < totalCount; i++) {
      // Pause if map is actively moving
      while (this.isMapMoving) {
        await new Promise(r => setTimeout(r, 150));
      }

      const cam = this.cameras[i];
      if (cam && cam.url) {
        const res = await this.checkHlsStreamHealth(cam.url);
        this.healthStatus[cam.id] = {
          online: res.online,
          latencyMs: res.latencyMs,
          checkedAt: new Date().toISOString()
        };

        if (res.online) {
          this.onlineCount++;
        } else {
          this.offlineCount++;
        }

        this.currentScanIndex = i;
        
        // Dynamically transition marker from OFFLINE to ONLINE
        this.updateSingleMarkerDom(cam.id, res.online);

        const scanned = i + 1;
        const percent = Math.round((scanned / totalCount) * 100);

        // Update Prominent Scanner HUD
        if (scanPercentPill) scanPercentPill.textContent = `${percent}%`;
        if (scanProgressFill) scanProgressFill.style.width = `${percent}%`;
        if (scanProcessedText) scanProcessedText.textContent = `Node: ${scanned}/${totalCount}`;
        if (scanOnlineCount) scanOnlineCount.textContent = `🟢 ${this.onlineCount} Online`;
        if (scanOfflineCount) scanOfflineCount.textContent = `🔴 ${this.offlineCount} Offline`;

        // Update Toolbar Badge
        if (scanTextEl) {
          scanTextEl.innerHTML = `Pindai ${scanned}/${totalCount} &bull; <span style="color:#10b981">🟢 ${this.onlineCount}</span> <span style="color:#ef4444">🔴 ${this.offlineCount}</span>`;
        }

        // Save incremental progress so refresh resumes here
        const isFinished = (scanned >= totalCount);
        this.saveHealthProgress(i, isFinished);
      }

      // Smooth spacing between probes
      await new Promise(r => setTimeout(r, 110));
    }

    this.isCheckingHls = false;
    if (scanStatusTitle) scanStatusTitle.textContent = '✅ Pemindaian Selesai (Tersimpan)';
    if (scanTextEl) {
      scanTextEl.innerHTML = `Node Selesai: <span style="color:#10b981">🟢 ${this.onlineCount} Online</span> &bull; <span style="color:#ef4444">🔴 ${this.offlineCount} Offline</span>`;
    }

    this.saveHealthProgress(totalCount - 1, true);
    window.dispatchEvent(new CustomEvent('cctv-health-updated', { detail: { cameras: this.healthStatus } }));

    // Automatically minimize to compact icon/badge after 2.5s of completion
    setTimeout(() => {
      if (!this.isCheckingHls) {
        this.minimizeScannerHud();
      }
    }, 2500);
  }

  minimizeScannerHud() {
    const mapScannerHud = document.getElementById('mapScannerHud');
    const mapScannerMiniBadge = document.getElementById('mapScannerMiniBadge');
    const miniBadgeText = document.getElementById('miniBadgeText');

    if (mapScannerHud) mapScannerHud.classList.add('hidden');
    if (mapScannerMiniBadge) {
      mapScannerMiniBadge.classList.remove('hidden');
      if (miniBadgeText) {
        miniBadgeText.innerHTML = `<span style="color:#10b981">🟢 ${this.onlineCount} Online</span> &bull; <span style="color:#ef4444">🔴 ${this.offlineCount} Offline</span>`;
      }
    }
  }

  expandScannerHud() {
    const mapScannerHud = document.getElementById('mapScannerHud');
    const mapScannerMiniBadge = document.getElementById('mapScannerMiniBadge');

    if (mapScannerMiniBadge) mapScannerMiniBadge.classList.add('hidden');
    if (mapScannerHud) {
      mapScannerHud.classList.remove('hidden');
      mapScannerHud.style.display = 'block';
    }
  }

  openScannerDetailModal() {
    const modal = document.getElementById('scannerDetailModal');
    if (!modal) return;

    modal.style.display = 'flex';

    // Populate KPI
    const modalKpiOnline = document.getElementById('modalKpiOnline');
    const modalKpiOffline = document.getElementById('modalKpiOffline');
    const modalKpiTotal = document.getElementById('modalKpiTotal');
    const modalKpiRate = document.getElementById('modalKpiRate');

    if (modalKpiOnline) modalKpiOnline.textContent = this.onlineCount;
    if (modalKpiOffline) modalKpiOffline.textContent = this.offlineCount;
    if (modalKpiTotal) modalKpiTotal.textContent = this.cameras.length;
    if (modalKpiRate) {
      const rate = this.cameras.length > 0 ? Math.round((this.onlineCount / this.cameras.length) * 100) : 0;
      modalKpiRate.textContent = `${rate}%`;
    }

    // Populate Tab Chip Labels
    const tabFilterAll = document.getElementById('tabFilterAll');
    const tabFilterOnline = document.getElementById('tabFilterOnline');
    const tabFilterOffline = document.getElementById('tabFilterOffline');

    if (tabFilterAll) tabFilterAll.textContent = `Semua (${this.cameras.length})`;
    if (tabFilterOnline) tabFilterOnline.textContent = `🟢 Online (${this.onlineCount})`;
    if (tabFilterOffline) tabFilterOffline.textContent = `🔴 Offline (${this.offlineCount})`;

    this.renderScannerModalList();
  }

  closeScannerDetailModal() {
    const modal = document.getElementById('scannerDetailModal');
    if (modal) modal.style.display = 'none';
  }

  renderScannerModalList() {
    const listContainer = document.getElementById('scannerCameraList');
    const searchInput = document.getElementById('scannerSearchInput');
    if (!listContainer) return;

    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const activeTab = document.querySelector('.scanner-tab.active');
    const filterType = activeTab ? activeTab.getAttribute('data-filter') : 'all';

    listContainer.innerHTML = '';

    const results = this.cameras.filter(cam => {
      const isOnline = this.streamStatusCache[cam.id] !== false;
      const matchesFilter = filterType === 'all' || 
        (filterType === 'online' && isOnline) || 
        (filterType === 'offline' && !isOnline);

      const text = `${cam.id} ${cam.name} ${cam.alias}`.toLowerCase();
      const matchesQuery = !query || text.includes(query);

      return matchesFilter && matchesQuery;
    });

    if (results.length === 0) {
      listContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 24px; color: var(--text-muted);">
          Tidak ada kamera yang cocok dengan kriteria pencarian atau filter.
        </div>
      `;
      return;
    }

    results.forEach(cam => {
      const isOnline = this.streamStatusCache[cam.id] !== false;
      const card = document.createElement('div');
      card.className = `scanner-cam-card ${this.activeCamId === cam.id ? 'is-active-cam' : ''}`;
      card.innerHTML = `
        <div class="scanner-cam-meta">
          <span class="cam-title">CAM #${cam.id}: ${cam.name}</span>
          <span class="cam-alias">${cam.alias}</span>
        </div>
        <div class="scanner-cam-right">
          <span class="cam-status-pill ${isOnline ? 'pill-online' : 'pill-offline'}">
            ${isOnline ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (typeof window.loadStream === 'function') {
          window.loadStream(cam.url);
        }
        if (this.map) {
          this.map.setView([cam.lat, cam.lon], 16, { animate: true });
          this.highlightCamera(cam.id);
        }
        this.closeScannerDetailModal();
      });

      listContainer.appendChild(card);
    });
  }

  setupRescanButton() {
    const btnRescan = document.getElementById('btnRescanStreams');
    const btnRescanModal = document.getElementById('btnRescanModal');
    const btnMinimize = document.getElementById('btnMinimizeScannerHud');
    const mapScannerMiniBadge = document.getElementById('mapScannerMiniBadge');
    const btnCloseScannerModalX = document.getElementById('btnCloseScannerModalX');
    const scannerDetailModal = document.getElementById('scannerDetailModal');
    const scannerSearchInput = document.getElementById('scannerSearchInput');
    const scannerTabs = document.querySelectorAll('.scanner-tab');

    if (btnRescan) {
      btnRescan.addEventListener('click', () => {
        if (!this.isCheckingHls) {
          localStorage.removeItem(this.cacheKey);
          this.expandScannerHud();
          this.startHlsBackgroundChecker(0);
        }
      });
    }

    if (btnRescanModal) {
      btnRescanModal.addEventListener('click', () => {
        this.closeScannerDetailModal();
        if (!this.isCheckingHls) {
          localStorage.removeItem(this.cacheKey);
          this.expandScannerHud();
          this.startHlsBackgroundChecker(0);
        }
      });
    }

    if (btnMinimize) {
      btnMinimize.addEventListener('click', () => {
        this.minimizeScannerHud();
      });
    }

    if (mapScannerMiniBadge) {
      mapScannerMiniBadge.addEventListener('click', () => {
        this.openScannerDetailModal();
      });
    }

    if (btnCloseScannerModalX) {
      btnCloseScannerModalX.addEventListener('click', () => {
        this.closeScannerDetailModal();
      });
    }

    if (scannerDetailModal) {
      scannerDetailModal.addEventListener('click', (e) => {
        if (e.target === scannerDetailModal) {
          this.closeScannerDetailModal();
        }
      });
    }

    if (scannerSearchInput) {
      scannerSearchInput.addEventListener('input', () => {
        this.renderScannerModalList();
      });
    }

    scannerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        scannerTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderScannerModalList();
      });
    });
  }

  // Fast direct DOM mutation with smooth radar activation
  updateSingleMarkerDom(camId, isOnline) {
    const el = document.getElementById(`marker-${camId}`);
    if (!el) return;

    el.classList.toggle('pin-online', isOnline);
    el.classList.toggle('pin-offline', !isOnline);

    const dot = el.querySelector('.pin-status-dot');
    if (dot) {
      dot.className = `pin-status-dot ${isOnline ? 'online' : 'offline'}`;
    }

    const radar = el.querySelector('.pin-radar');
    if (isOnline && !radar) {
      const newRadar = document.createElement('div');
      newRadar.className = 'pin-radar';
      el.insertBefore(newRadar, el.firstChild);
    } else if (!isOnline && radar) {
      radar.remove();
    }
  }

  // Update specific camera status on-demand (e.g. from live video player event)
  setCameraHealth(camId, isOnline, latency = 85) {
    this.healthStatus[camId] = {
      online: isOnline,
      latencyMs: latency,
      checkedAt: new Date().toISOString()
    };
    this.updateSingleMarkerDom(camId, isOnline);
    window.dispatchEvent(new CustomEvent('cctv-health-updated', { detail: { cameras: this.healthStatus } }));
  }

  createCustomIcon(camera, isSelected = false) {
    const activeClass = isSelected ? 'marker-active' : '';
    const status = this.healthStatus[camera.id];
    const isOnline = status ? status.online : false;
    const statusClass = isOnline ? 'pin-online' : 'pin-offline';

    return L.divIcon({
      className: 'custom-cctv-marker-wrapper',
      html: `
        <div class="cctv-pin ${activeClass} ${statusClass}" id="marker-${camera.id}">
          ${isOnline ? '<div class="pin-radar"></div>' : ''}
          <div class="pin-body">
            <span class="pin-status-dot ${isOnline ? 'online' : 'offline'}"></span>
            <span class="pin-id">${camera.id}</span>
          </div>
          <div class="pin-tip"></div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42],
      popupAnchor: [0, -40]
    });
  }

  renderMarkers(filterText = '') {
    // Clear existing markers
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    const query = filterText.toLowerCase().trim();

    this.cameras.forEach(cam => {
      if (!cam.lat || !cam.lon) return;

      const matches = !query || 
        cam.name.toLowerCase().includes(query) || 
        cam.alias.toLowerCase().includes(query) || 
        cam.id.toString().includes(query);

      if (!matches) return;

      const marker = L.marker([cam.lat, cam.lon], {
        icon: this.createCustomIcon(cam, cam.id === this.selectedCameraId)
      });

      const status = this.healthStatus[cam.id];
      const isOnline = status ? status.online : false;
      const latencyText = status && status.latencyMs ? ` (${status.latencyMs}ms)` : '';

      // Interactive Popup
      const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-head">
            <span class="popup-id-pill">CCTV #${cam.id}</span>
            <span class="popup-status-badge ${isOnline ? 'online' : 'offline'}">
              <span class="pulse-dot ${isOnline ? 'green' : 'red'}"></span> 
              ${isOnline ? `ONLINE${latencyText}` : 'OFFLINE / GANGGUAN'}
            </span>
          </div>
          <h4 class="popup-title">${cam.name}</h4>
          <p class="popup-alias">${cam.alias}</p>
          <div class="popup-actions">
            <button class="btn btn-sm btn-primary popup-play-btn" data-cam-id="${cam.id}" data-url="${cam.url}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Pantau AI Kamera Ini</span>
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'cctv-custom-leaflet-popup',
        maxWidth: 290,
        closeButton: true
      });

      marker.on('click', () => {
        this.selectCamera(cam);
      });

      marker.addTo(this.map);
      marker.camData = cam;
      this.markers.push(marker);
    });
  }

  selectCamera(cam) {
    this.highlightCamera(cam.id);

    // Update Mini HUD on map
    const previewCamName = document.getElementById('previewCamName');
    if (previewCamName) {
      previewCamName.textContent = `CAM ${cam.id}: ${cam.name}`;
    }

    // Trigger Stream load globally
    if (window.loadStreamGlobal) {
      window.loadStreamGlobal(cam.url);
    }

    // Automatically switch to AI Vision Console View
    if (window.setViewModeGlobal) {
      window.setViewModeGlobal('console');
    }
  }

  highlightCamera(cameraId) {
    this.selectedCameraId = cameraId;

    // Direct DOM highlight update
    this.markers.forEach(marker => {
      const isSel = marker.camData && marker.camData.id === cameraId;
      const el = document.getElementById(`marker-${marker.camData.id}`);
      if (el) {
        el.classList.toggle('marker-active', isSel);
      }
      if (isSel) {
        this.map.panTo([marker.camData.lat, marker.camData.lon], {
          animate: true,
          duration: 0.6
        });
      }
    });
  }

  clearHighlight() {
    this.selectedCameraId = null;
    this.markers.forEach(marker => {
      if (marker.camData) {
        const el = document.getElementById(`marker-${marker.camData.id}`);
        if (el) el.classList.remove('marker-active');
      }
    });
  }

  setupSearch() {
    const searchInput = document.getElementById('mapSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      this.renderMarkers(q);
    });
  }

  setupPopupListener() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.popup-play-btn');
      if (btn) {
        const url = btn.getAttribute('data-url');
        const camId = parseInt(btn.getAttribute('data-cam-id'), 10);
        if (url && window.loadStreamGlobal) {
          window.loadStreamGlobal(url);
          this.highlightCamera(camId);
          this.map.closePopup();
          if (window.setViewModeGlobal) {
            window.setViewModeGlobal('console');
          }
        }
      }
    });
  }

  switchTileTheme(themeName) {
    if (!this.tileLayers[themeName] || this.currentTileLayer === this.tileLayers[themeName]) return;
    this.map.removeLayer(this.currentTileLayer);
    this.currentTileLayer = this.tileLayers[themeName];
    this.currentTileLayer.addTo(this.map);
  }

  invalidateSize() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 150);
    }
  }
}

// Instantiate and expose globally
window.medanCCTVMap = new MedanCCTVMap('cctvMapContainer', window.ATCS_MEDAN_CAMERAS || []);
