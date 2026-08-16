/**
 * Medan Traffic Vision - Interactive CCTV Map (Leaflet.js)
 * Clean, lightweight map module with seamless on-demand video stream linking
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
      attributionControl: false
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

    // Render Markers & Listeners
    this.renderMarkers();
    this.setupSearch();
    this.setupPopupListener();
    this.isInitialized = true;

    // Silent background sync from server status API (Zero console errors)
    this.syncHealthFromServer();
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => this.syncHealthFromServer(), 45000);
  }

  async syncHealthFromServer() {
    try {
      const res = await fetch('/api/cctv/status');
      if (res.ok) {
        const data = await res.json();
        if (data.cameras && Object.keys(data.cameras).length > 0) {
          this.healthStatus = data.cameras;
          this.updateMarkerStatuses();
          window.dispatchEvent(new CustomEvent('cctv-health-updated', { detail: { cameras: this.healthStatus } }));
        }
      }
    } catch (e) {}
  }

  // Update specific camera status on-demand (e.g. from live HLS player event)
  setCameraHealth(camId, isOnline, latency = 120) {
    this.healthStatus[camId] = {
      online: isOnline,
      latencyMs: latency,
      checkedAt: new Date().toISOString()
    };
    this.updateMarkerStatuses();
    window.dispatchEvent(new CustomEvent('cctv-health-updated', { detail: { cameras: this.healthStatus } }));
  }

  createCustomIcon(camera, isSelected = false) {
    const activeClass = isSelected ? 'marker-active' : '';
    const status = this.healthStatus[camera.id];
    const isOnline = status ? status.online : true;
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

  updateMarkerStatuses() {
    this.markers.forEach(marker => {
      const cam = marker.camData;
      if (cam) {
        marker.setIcon(this.createCustomIcon(cam, cam.id === this.selectedCameraId));
      }
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
      const isOnline = status ? status.online : true;
      const latencyText = status && status.latencyMs ? ` (${status.latencyMs}ms)` : '';

      // Interactive Popup
      const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-head">
            <span class="popup-id-pill">CCTV #${cam.id}</span>
            <span class="popup-status-badge ${isOnline ? 'online' : 'offline'}">
              <span class="pulse-dot ${isOnline ? 'green' : 'red'}"></span> 
              ${isOnline ? `ONLINE${latencyText}` : 'OFFLINE'}
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

    // Automatically switch to AI Vision Console View so video and detection are immediately shown
    if (window.setViewModeGlobal) {
      window.setViewModeGlobal('console');
    }
  }

  highlightCamera(cameraId) {
    this.selectedCameraId = cameraId;

    // Refresh all markers to toggle active state
    this.markers.forEach(marker => {
      const isSel = marker.camData && marker.camData.id === cameraId;
      marker.setIcon(this.createCustomIcon(marker.camData, isSel));
      if (isSel) {
        this.map.panTo([marker.camData.lat, marker.camData.lon], {
          animate: true,
          duration: 0.8
        });
      }
    });
  }

  clearHighlight() {
    this.selectedCameraId = null;
    this.markers.forEach(marker => {
      if (marker.camData) {
        marker.setIcon(this.createCustomIcon(marker.camData, false));
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
      setTimeout(() => this.map.invalidateSize(), 200);
    }
  }
}

// Instantiate and expose globally
window.medanCCTVMap = new MedanCCTVMap('cctvMapContainer', window.ATCS_MEDAN_CAMERAS || []);
