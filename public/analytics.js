/**
 * CCTV AI Traffic Vision - Per-Device & Per-Date Telemetry Storage Engine
 * Handles Per-Camera Persistent Tracking, Date Switching, Live Multi-Scale In-Frame Counters,
 * Device-Specific Reset, Real-time Charts, Activity Logs, and Detailed Per-Device CSV Export.
 */

class TrafficAnalytics {
  constructor() {
    this.history = [];
    this.maxHistoryPoints = 30;
    this.audioContext = null;
    this.lastAlarmTime = 0;

    // Active Device tracking - default to selected/primary camera
    const savedStream = typeof localStorage !== 'undefined' ? localStorage.getItem('cctv_last_active_stream') : null;
    let initialCam = null;
    if (typeof window !== 'undefined' && window.ATCS_MEDAN_CAMERAS) {
      initialCam = window.ATCS_MEDAN_CAMERAS.find(c => c.url === savedStream) || window.ATCS_MEDAN_CAMERAS[0];
    }
    if (initialCam) {
      this.activeDeviceId = String(initialCam.id);
      this.activeDeviceName = `${initialCam.name} (${initialCam.alias})`;
    } else {
      this.activeDeviceId = '31';
      this.activeDeviceName = 'JAMIN GINTING - ISKANDAR MUDA (Simpang JM.GINTING - ISMUD)';
    }

    // Daily & Per-Device records storage keyed by YYYY-MM-DD -> { devices: { [camId]: { car, motor, total, name } } }
    this.todayKey = this.getTodayDateString();
    this.selectedDate = this.todayKey;
    this.records = this.loadRecordsFromStorage();

    this.chartCanvas = document.getElementById('trafficChart');
    this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext('2d') : null;
    
    this.setupResizeListener();
    this.setupDateSelector();
    this.setActiveCamera(this.activeDeviceId, this.activeDeviceName);
    this.updateDOMCounters(0, 0);
  }

  getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadRecordsFromStorage() {
    try {
      const saved = localStorage.getItem('cctv_ai_device_daily_traffic');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.ensureTodayRecordExists(parsed);
        return parsed;
      }

      // Migration from old daily format
      const oldDaily = localStorage.getItem('cctv_ai_daily_traffic_records');
      const initial = {};
      this.ensureTodayRecordExists(initial);

      if (oldDaily) {
        const oldParsed = JSON.parse(oldDaily);
        Object.keys(oldParsed).forEach(date => {
          if (!initial[date]) initial[date] = { devices: {} };
          initial[date].devices['global'] = {
            id: 'global',
            name: 'Akumulasi Umum',
            car: oldParsed[date].car || 0,
            motor: oldParsed[date].motor || 0,
            total: oldParsed[date].total || 0,
            updatedAt: new Date().toISOString()
          };
        });
      }

      localStorage.setItem('cctv_ai_device_daily_traffic', JSON.stringify(initial));
      return initial;
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
    const fallback = {};
    this.ensureTodayRecordExists(fallback);
    return fallback;
  }

  ensureTodayRecordExists(recordsObj) {
    const today = this.todayKey;
    if (!recordsObj[today]) {
      recordsObj[today] = { devices: {} };
    }
    if (!recordsObj[today].devices['global']) {
      recordsObj[today].devices['global'] = {
        id: 'global',
        name: 'Akumulasi Umum',
        car: 0,
        motor: 0,
        total: 0,
        updatedAt: new Date().toISOString()
      };
    }
  }

  saveRecordsToStorage() {
    try {
      localStorage.setItem('cctv_ai_device_daily_traffic', JSON.stringify(this.records));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // Set the currently active camera to track specifically per device
  setActiveCamera(camId, camName) {
    this.activeDeviceId = String(camId || '31');
    this.activeDeviceName = camName || (camId ? `CAM #${camId}` : 'JAMIN GINTING - ISKANDAR MUDA');

    const badge = document.getElementById('telemetryDeviceLabel');
    if (badge) {
      badge.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;margin-right:6px;box-shadow:0 0 6px #10b981;"></span><b>CAM #${this.activeDeviceId}:</b> ${this.activeDeviceName}`;
    }

    // Refresh UI with this specific device's counts
    this.updateDOMCounters(0, 0);
    this.logEvent(`Telemetri aktif untuk kamera: ${this.activeDeviceName}`);
  }

  // Get current device counts for the selected date
  getActiveDeviceCounts() {
    const date = this.selectedDate;
    if (!this.records[date]) {
      this.records[date] = { devices: {} };
    }
    const devMap = this.records[date].devices;
    const devId = this.activeDeviceId;

    if (!devMap[devId]) {
      devMap[devId] = {
        id: devId,
        name: this.activeDeviceName,
        car: 0,
        motor: 0,
        total: 0,
        updatedAt: new Date().toISOString()
      };
    }
    return devMap[devId];
  }

  // Increment cumulative count for today on the ACTIVE CAMERA
  incrementCumulative(category) {
    const today = this.getTodayDateString();
    this.todayKey = today;
    this.ensureTodayRecordExists(this.records);

    const devMap = this.records[today].devices;
    const devId = this.activeDeviceId;

    // 1. Increment Active Device Record
    if (!devMap[devId]) {
      devMap[devId] = {
        id: devId,
        name: this.activeDeviceName,
        car: 0,
        motor: 0,
        total: 0,
        updatedAt: new Date().toISOString()
      };
    }

    if (category === 'car') {
      devMap[devId].car++;
      devMap[devId].total++;
    } else if (category === 'motor') {
      devMap[devId].motor++;
      devMap[devId].total++;
    }
    devMap[devId].updatedAt = new Date().toISOString();

    // 2. Also keep global aggregate synced
    if (devId !== 'global') {
      if (!devMap['global']) {
        devMap['global'] = { id: 'global', name: 'Akumulasi Umum', car: 0, motor: 0, total: 0 };
      }
      if (category === 'car') {
        devMap['global'].car++;
        devMap['global'].total++;
      } else if (category === 'motor') {
        devMap['global'].motor++;
        devMap['global'].total++;
      }
    }

    this.saveRecordsToStorage();

    // If currently viewing today, update active device counters on screen
    if (this.selectedDate === today) {
      const counts = devMap[devId];
      const countCarEl = document.getElementById('countCar');
      const countMotorEl = document.getElementById('countMotor');
      const countTotalEl = document.getElementById('countTotal');
      if (countCarEl) countCarEl.textContent = counts.car.toLocaleString('id-ID');
      if (countMotorEl) countMotorEl.textContent = counts.motor.toLocaleString('id-ID');
      if (countTotalEl) countTotalEl.textContent = counts.total.toLocaleString('id-ID');
    }
  }

  // Reset counts for the currently ACTIVE CAMERA on selected date
  resetCumulative() {
    const date = this.selectedDate;
    if (this.records[date] && this.records[date].devices[this.activeDeviceId]) {
      this.records[date].devices[this.activeDeviceId].car = 0;
      this.records[date].devices[this.activeDeviceId].motor = 0;
      this.records[date].devices[this.activeDeviceId].total = 0;
      this.records[date].devices[this.activeDeviceId].updatedAt = new Date().toISOString();
      this.saveRecordsToStorage();
      this.updateDOMCounters(0, 0);
      this.logEvent(`Hitungan kamera (${this.activeDeviceName}) tanggal ${date} direset ke 0.`);
    }
  }

  // Set the viewing date
  setSelectedDate(dateStr) {
    this.selectedDate = dateStr;
    if (!this.records[dateStr]) {
      this.records[dateStr] = { devices: {} };
    }
    this.updateDOMCounters(0, 0);
    this.logEvent(`Melihat data telemetri tanggal: ${dateStr}`);
  }

  setupDateSelector() {
    const dateInput = document.getElementById('dateFilterSelect');
    if (dateInput) {
      this.populateDateDropdown();
      dateInput.addEventListener('change', (e) => {
        this.setSelectedDate(e.target.value);
      });
    }
  }

  populateDateDropdown() {
    const dateSelect = document.getElementById('dateFilterSelect');
    if (!dateSelect) return;

    const availableDates = Object.keys(this.records).sort().reverse();
    if (!availableDates.includes(this.todayKey)) {
      availableDates.unshift(this.todayKey);
    }

    dateSelect.innerHTML = '';
    availableDates.forEach(dateStr => {
      const opt = document.createElement('option');
      opt.value = dateStr;
      const isToday = dateStr === this.todayKey;
      opt.textContent = isToday ? `📅 Hari Ini (${dateStr})` : `📅 ${dateStr}`;
      if (dateStr === this.selectedDate) {
        opt.selected = true;
      }
      dateSelect.appendChild(opt);
    });
  }

  setupResizeListener() {
    if (!this.chartCanvas) return;
    const resize = () => {
      const rect = this.chartCanvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.chartCanvas.width = rect.width * window.devicePixelRatio;
        this.chartCanvas.height = rect.height * window.devicePixelRatio;
        this.chartCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.renderChart();
      }
    };
    window.addEventListener('resize', resize);
    setTimeout(resize, 100);
  }

  // Update Live In-Frame counts & DOM
  update(liveCar, liveMotor) {
    const liveTotal = liveCar + liveMotor;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // Push timeline history
    this.history.push({
      time: timeStr,
      timestamp: now.getTime(),
      car: liveCar,
      motor: liveMotor,
      total: liveTotal
    });

    if (this.history.length > this.maxHistoryPoints) {
      this.history.shift();
    }

    // Update DOM Display
    this.updateDOMCounters(liveCar, liveMotor);
    this.renderChart();

    // Check density threshold
    this.evaluateDensity(liveTotal);
  }

  updateDOMCounters(liveCar, liveMotor) {
    const counts = this.getActiveDeviceCounts();
    const liveTotal = liveCar + liveMotor;

    const elLiveCar = document.getElementById('liveInFrameCar');
    const elLiveMotor = document.getElementById('liveInFrameMotor');
    const elLiveTotal = document.getElementById('liveInFrameTotal');

    const elCountCar = document.getElementById('countCar');
    const elCountMotor = document.getElementById('countMotor');
    const elCountTotal = document.getElementById('countTotal');

    const mapPreviewCar = document.getElementById('mapPreviewCar');
    const mapPreviewMotor = document.getElementById('mapPreviewMotor');

    if (elLiveCar) elLiveCar.textContent = liveCar;
    if (elLiveMotor) elLiveMotor.textContent = liveMotor;
    if (elLiveTotal) elLiveTotal.textContent = liveTotal;

    if (mapPreviewCar) mapPreviewCar.textContent = liveCar;
    if (mapPreviewMotor) mapPreviewMotor.textContent = liveMotor;

    if (elCountCar) elCountCar.textContent = counts.car.toLocaleString('id-ID');
    if (elCountMotor) elCountMotor.textContent = counts.motor.toLocaleString('id-ID');
    if (elCountTotal) elCountTotal.textContent = counts.total.toLocaleString('id-ID');
  }

  evaluateDensity(liveCount) {
    const label = document.getElementById('trafficDensityLabel');
    const osdDensity = document.getElementById('osdDensity');
    const mapPreviewDensity = document.getElementById('mapPreviewDensity');
    const alertBanner = document.getElementById('videoAlertBanner');
    const alertText = document.getElementById('alertBannerText');
    const audioToggle = document.getElementById('audioAlertToggle');

    let statusText = 'Lancar';
    let statusClass = 'density-low';
    let isHighAlert = false;

    if (liveCount >= 14) {
      statusText = 'Macet Padat';
      statusClass = 'density-critical';
      isHighAlert = true;
    } else if (liveCount >= 8) {
      statusText = 'Padat Merayap';
      statusClass = 'density-high';
      isHighAlert = true;
    } else if (liveCount >= 4) {
      statusText = 'Ramai Lancar';
      statusClass = 'density-medium';
    } else if (liveCount === 0 && this.activeDeviceId === 'global') {
      statusText = 'Standby';
    }

    if (label) {
      label.textContent = `Lalu Lintas: ${statusText}`;
      label.className = `metric-caption ${statusClass}`;
    }

    if (osdDensity) {
      osdDensity.innerHTML = `Status: <span class="${statusClass}">${statusText.toUpperCase()}</span>`;
    }

    if (mapPreviewDensity) {
      mapPreviewDensity.textContent = `Lalu Lintas: ${statusText}`;
      mapPreviewDensity.className = `density-indicator-pill ${statusClass}`;
    }

    // Congestion Alert Banner & Sound
    if (alertBanner && alertText) {
      if (isHighAlert) {
        alertBanner.style.display = 'flex';
        alertText.textContent = `Peringatan Kepadatan: ${statusText} (${liveCount} Kendaraan di Kamera)`;
        if (audioToggle && audioToggle.checked) {
          this.triggerAudioAlarm();
        }
      } else {
        alertBanner.style.display = 'none';
      }
    }
  }

  triggerAudioAlarm() {
    const now = Date.now();
    if (now - this.lastAlarmTime < 8000) return; // Cooldown 8s
    this.lastAlarmTime = now;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.35);

      gain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio alarm error:', e);
    }
  }

  renderChart() {
    if (!this.chartCtx || this.history.length < 2) return;
    const ctx = this.chartCtx;
    const w = this.chartCanvas.width / window.devicePixelRatio;
    const h = this.chartCanvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, w, h);

    const padding = { top: 12, bottom: 20, left: 24, right: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    let maxVal = 10;
    this.history.forEach(p => {
      if (p.car > maxVal) maxVal = p.car;
      if (p.motor > maxVal) maxVal = p.motor;
    });
    maxVal = Math.ceil(maxVal * 1.2);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(w - padding.right, padding.top);
    ctx.moveTo(padding.left, padding.top + chartH / 2);
    ctx.lineTo(w - padding.right, padding.top + chartH / 2);
    ctx.moveTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    const getX = (idx) => padding.left + (idx / (this.maxHistoryPoints - 1)) * chartW;
    const getY = (val) => h - padding.bottom - (val / maxVal) * chartH;

    // Draw Line: Mobil (White/Silver)
    this.drawLineSeries(ctx, this.history.map(p => p.car), getX, getY, '#ffffff', 'rgba(255, 255, 255, 0.08)');

    // Draw Line: Motor (Amber)
    this.drawLineSeries(ctx, this.history.map(p => p.motor), getX, getY, '#f59e0b', 'rgba(245, 158, 11, 0.12)');
  }

  drawLineSeries(ctx, data, getX, getY, strokeColor, fillColor) {
    if (data.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    data.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area under line
    const firstX = getX(0);
    const lastX = getX(data.length - 1);
    const bottomY = getY(0);

    ctx.lineTo(lastX, bottomY);
    ctx.lineTo(firstX, bottomY);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  logEvent(msg) {
    const list = document.getElementById('activityLogList');
    if (!list) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="entry-time">[${timeStr}]</span> <span class="entry-msg">${msg}</span>`;

    list.insertBefore(entry, list.firstChild);
    while (list.children.length > 20) {
      list.removeChild(list.lastChild);
    }
  }

  // Export Detailed Per-Device & Per-Date CSV Audit
  exportCsv() {
    const dates = Object.keys(this.records).sort().reverse();
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tanggal,ID Kamera,Nama Lokasi CCTV,Total Mobil & Truk,Total Sepeda Motor,Total Volume Kendaraan,Terakhir Diperbarui\n';

    dates.forEach(d => {
      const devMap = this.records[d].devices || {};
      Object.keys(devMap).forEach(devId => {
        const item = devMap[devId];
        const safeName = `"${(item.name || '').replace(/"/g, '""')}"`;
        const updated = item.updatedAt || d;
        csvContent += `${d},${item.id || devId},${safeName},${item.car},${item.motor},${item.total},${updated}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_lalu_lintas_cctv_medan_${this.todayKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Instantiate globally
window.trafficAnalytics = new TrafficAnalytics();

document.addEventListener('DOMContentLoaded', () => {
  const btnExport = document.getElementById('btnExportCsv');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      window.trafficAnalytics.exportCsv();
    });
  }
});
