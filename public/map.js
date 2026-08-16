/**
 * Nusantara Traffic Vision - High-Performance Interactive CCTV Map (Leaflet.js)
 * Clean, butter-smooth map module with dynamic Offline -> Online Stream Verification
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

    // 1. Initial State: Set ALL cameras to OFFLINE by default
    this.cameras.forEach(cam => {
      this.healthStatus[cam.id] = {
        online: false,
        latencyMs: 0,
        checkedAt: new Date().toISOString()
      };
    });

    // Render Markers with initial offline state (🔴 Red Pins)
    this.renderMarkers();
    this.setupSearch();
    this.setupPopupListener();
    this.isInitialized = true;

    // Pause checks during user drag / zoom to guarantee 60 FPS
    this.map.on('movestart zoomstart', () => {
      this.isMapMoving = true;
    });
    this.map.on('moveend zoomend', () => {
      this.isMapMoving = false;
    });

    // 2. Start Live Verification: checks streams and turns verified cameras into 🟢 ONLINE
    setTimeout(() => this.startHlsBackgroundChecker(), 300);
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
   * Sequential background verification loop: flips cameras from 🔴 OFFLINE -> 🟢 ONLINE
   * and reports real-time scan progress in the prominent UI Scanner HUD
   */
  async startHlsBackgroundChecker() {
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
    let onlineCount = 0;
    let offlineCount = 0;

    if (mapScannerHud) mapScannerHud.style.display = 'block';
    if (scanStatusTitle) scanStatusTitle.textContent = 'Memindai Status Live Stream CCTV...';

    for (let i = 0; i < totalCount; i++) {
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
          onlineCount++;
        } else {
          offlineCount++;
        }
        
        // Dynamically transition marker from OFFLINE to ONLINE
        this.updateSingleMarkerDom(cam.id, res.online);

        const scanned = i + 1;
        const percent = Math.round((scanned / totalCount) * 100);

        // Update Prominent Scanner HUD
        if (scanPercentPill) scanPercentPill.textContent = `${percent}%`;
        if (scanProgressFill) scanProgressFill.style.width = `${percent}%`;
        if (scanProcessedText) scanProcessedText.textContent = `Node: ${scanned} / ${totalCount}`;
        if (scanOnlineCount) scanOnlineCount.textContent = `🟢 ${onlineCount} Online`;
        if (scanOfflineCount) scanOfflineCount.textContent = `🔴 ${offlineCount} Offline`;

        // Update Toolbar Badge
        if (scanTextEl) {
          scanTextEl.innerHTML = `Pindai ${scanned}/${totalCount} &bull; <span style="color:#10b981">🟢 ${onlineCount}</span> <span style="color:#ef4444">🔴 ${offlineCount}</span>`;
        }
      }

      // Smooth spacing between probes
      await new Promise(r => setTimeout(r, 120));
    }

    this.isCheckingHls = false;
    if (scanStatusTitle) scanStatusTitle.textContent = '✅ Pemindaian CCTV Selesai';
    if (scanTextEl) {
      scanTextEl.innerHTML = `Node Selesai: <span style="color:#10b981">🟢 ${onlineCount} Online</span> &bull; <span style="color:#ef4444">🔴 ${offlineCount} Offline</span>`;
    }
    window.dispatchEvent(new CustomEvent('cctv-health-updated', { detail: { cameras: this.healthStatus } }));
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
    const isOnline = status ? status.online : false; // Default false (starts as offline)
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
