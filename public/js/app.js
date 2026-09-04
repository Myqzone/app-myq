/**
 * App MyQ - Media Studio & Adobe Downgrader
 * Powered by Sharp, LibVips, PDF-Lib, Lenis Smooth Scroll, and Lucide Icons
 */

// Global State
const state = {
  queue: [],
  selectedCompressFiles: [],
  selectedUpscaleFile: null,
  selectedPdfFiles: [],
  selectedAdobeFile: null,
  activeAdobeApp: 'prproj',
  selectedConvertFiles: [],
  upscaleResult: null
};

// ====================================================
// UTILITY FUNCTIONS & CUSTOM ALERT (ZERO SWEETALERT)
// ====================================================
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-circle';

  toast.innerHTML = `<i data-lucide="${iconName}" style="width: 16px; height: 16px; flex-shrink: 0;"></i><span>${message}</span>`;
  container.appendChild(toast);

  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s, transform 0.4s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Custom Modal System (Replacement for SweetAlert)
function showCustomAlert(title, message, type = 'info', onConfirm = null) {
  const backdrop = document.getElementById('custom-modal-backdrop');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const iconWrap = document.getElementById('modal-icon-wrap');
  const closeBtn = document.getElementById('modal-btn-close');

  if (!backdrop) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = message;
  iconWrap.className = `modal-icon-wrap ${type}`;

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  iconWrap.innerHTML = `<i data-lucide="${iconName}" style="width: 22px; height: 22px;"></i>`;
  if (window.lucide) lucide.createIcons();

  backdrop.style.display = 'flex';

  closeBtn.onclick = () => {
    backdrop.style.display = 'none';
    if (onConfirm) onConfirm();
  };
}

async function saveFileWithPickerOrDownload(url, filename) {
  try {
    if (window.showSaveFilePicker) {
      const ext = filename.split('.').pop().toLowerCase();
      const extMap = {
        'aep': { desc: 'After Effects Project', mime: 'application/octet-stream' },
        'aepx': { desc: 'After Effects XML Project', mime: 'application/xml' },
        'prproj': { desc: 'Premiere Pro Project', mime: 'application/octet-stream' },
        'psd': { desc: 'Photoshop Document', mime: 'image/vnd.adobe.photoshop' },
        'ai': { desc: 'Adobe Illustrator Artwork', mime: 'application/postscript' },
        'pdf': { desc: 'PDF Document', mime: 'application/pdf' },
        'zip': { desc: 'ZIP Archive', mime: 'application/zip' }
      };
      
      const fileInfo = extMap[ext] || { desc: 'File Output', mime: 'application/octet-stream' };
      
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: fileInfo.desc,
          accept: { [fileInfo.mime]: [`.${ext}`] }
        }]
      });

      showToast('Menyimpan file ke folder pilihan...', 'info');
      const res = await fetch(url);
      const blob = await res.blob();
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      showToast(`Berhasil menyimpan: ${filename}`, 'success');
      return true;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return false;
    }
    console.warn('showSaveFilePicker error, falling back to direct download:', err);
  }

  // Fallback: standard anchor download
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 1000);
  return true;
}

function showDownloadSuccessModal(title, message, filename, downloadUrl) {
  const backdrop = document.getElementById('custom-modal-backdrop');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const iconWrap = document.getElementById('modal-icon-wrap');
  const closeBtn = document.getElementById('modal-btn-close');

  if (!backdrop) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = `
    <p style="margin-bottom: 12px; color: var(--text-muted); font-size: 13px;">${message}</p>
    <div style="background: #18181c; border: 1px solid var(--border-hover); border-radius: 6px; padding: 14px 16px; margin: 14px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
        <i data-lucide="file-check" style="width: 22px; height: 22px; color: #ffffff; flex-shrink: 0;"></i>
        <div style="overflow: hidden; text-align: left;">
          <div style="font-size: 13px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${filename}</div>
          <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">File Output Siap Disimpan</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <button class="btn-primary" id="modal-save-as-btn" style="padding: 8px 16px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
          <i data-lucide="save" style="width: 14px; height: 14px;"></i>
          <span>Simpan File</span>
        </button>
      </div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
      <p style="font-size: 11px; color: var(--text-dim); line-height: 1.5; margin: 0;">Klik <strong>Simpan File</strong> untuk memilih lokasi penyimpanan dengan nama <strong>${filename}</strong>.</p>
      <a href="${downloadUrl}" download="${filename}" id="modal-direct-dl-link" style="font-size: 11px; color: var(--text-muted); text-decoration: underline; white-space: nowrap; margin-left: 10px;">Atau Unduh Langsung</a>
    </div>
  `;

  iconWrap.className = 'modal-icon-wrap success';
  iconWrap.innerHTML = `<i data-lucide="check-circle" style="width: 22px; height: 22px;"></i>`;
  if (window.lucide) lucide.createIcons();

  backdrop.style.display = 'flex';

  const saveBtn = document.getElementById('modal-save-as-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i data-lucide="loader" style="width: 14px; height: 14px;"></i> <span>Menyimpan...</span>`;
      if (window.lucide) lucide.createIcons();
      await saveFileWithPickerOrDownload(downloadUrl, filename);
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px;"></i> <span>Tersimpan</span>`;
      if (window.lucide) lucide.createIcons();
    };
  }

  closeBtn.onclick = () => {
    backdrop.style.display = 'none';
  };
}

// ====================================================
// REAL-TIME HARDWARE MONITORING & PROCESSING HUD
// ====================================================
let hardwareStatsCache = null;
let hudTimerInterval = null;
let hudStartTime = 0;

async function fetchHardwareStats() {
  try {
    const res = await fetch('/api/system-hardware');
    if (!res.ok) return null;
    const data = await res.json();
    hardwareStatsCache = data;

    // Update Sidebar
    const sideRamPct = document.getElementById('side-ram-pct');
    const sideRamBar = document.getElementById('side-ram-bar');
    const sideRamVal = document.getElementById('side-ram-val');
    const sideCpuCores = document.getElementById('side-cpu-cores');

    if (sideRamPct) sideRamPct.textContent = `${data.ramPercent}%`;
    if (sideRamBar) sideRamBar.style.width = `${data.ramPercent}%`;
    if (sideRamVal) sideRamVal.textContent = `${data.usedRamGB} / ${data.totalRamGB} GB`;
    if (sideCpuCores) sideCpuCores.textContent = `${data.cpuCores} Cores`;

    // Update HUD if visible
    const hudValRam = document.getElementById('hud-val-ram');
    const hudBarRam = document.getElementById('hud-bar-ram');
    const hudValAppRam = document.getElementById('hud-val-app-ram');
    const hudValCpu = document.getElementById('hud-val-cpu');
    const hudValPlatform = document.getElementById('hud-val-platform');

    if (hudValRam) hudValRam.textContent = `${data.usedRamGB} / ${data.totalRamGB} GB (${data.ramPercent}%)`;
    if (hudBarRam) hudBarRam.style.width = `${data.ramPercent}%`;
    if (hudValAppRam) hudValAppRam.textContent = `${data.processRssMB} MB`;
    if (hudValCpu) hudValCpu.textContent = `${data.cpuCores} Cores`;
    if (hudValPlatform) hudValPlatform.textContent = data.platform === 'win32' ? 'Windows Desktop' : data.platform;

    return data;
  } catch (e) {
    // ignore
  }
}

function initHardwareMonitoring() {
  fetchHardwareStats();
  setInterval(fetchHardwareStats, 3000);
}

function showProcessingHUD(title, desc, stages = []) {
  const overlay = document.getElementById('processing-overlay');
  if (!overlay) return;

  const titleEl = document.getElementById('hud-title');
  const descEl = document.getElementById('hud-desc');
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;

  const defaultStages = stages.length > 0 ? stages : [
    'Alokasi Buffer RAM & Decoding Metadata',
    'Komputasi & Optimasi Algoritma Native',
    'Re-encoding Bitwise & Finalisasi Output'
  ];

  for (let i = 1; i <= 3; i++) {
    const textEl = document.getElementById(`hud-stage-${i}-text`);
    const stepEl = document.getElementById(`hud-stage-${i}`);
    if (textEl && defaultStages[i-1]) textEl.textContent = defaultStages[i-1];
    if (stepEl) {
      stepEl.className = i === 1 ? 'hud-stage-step active' : 'hud-stage-step';
      const icon = stepEl.querySelector('.hud-stage-icon');
      if (icon) icon.setAttribute('data-lucide', i === 1 ? 'circle-dot' : 'circle');
    }
  }

  // Timer
  hudStartTime = Date.now();
  const timerEl = document.getElementById('hud-val-timer');
  if (timerEl) timerEl.textContent = '0.0s';
  clearInterval(hudTimerInterval);
  hudTimerInterval = setInterval(() => {
    const elapsed = ((Date.now() - hudStartTime) / 1000).toFixed(1);
    if (timerEl) timerEl.textContent = `${elapsed}s`;
    if (elapsed >= 0.8 && elapsed < 1.8) {
      setHUDStage(2);
    } else if (elapsed >= 1.8) {
      setHUDStage(3);
    }
  }, 100);

  fetchHardwareStats();
  overlay.style.display = 'flex';
  if (window.lucide) lucide.createIcons();
}

function setHUDStage(stageNum) {
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`hud-stage-${i}`);
    if (!stepEl) continue;
    const icon = stepEl.querySelector('.hud-stage-icon');
    if (i < stageNum) {
      stepEl.className = 'hud-stage-step done';
      if (icon) icon.setAttribute('data-lucide', 'check-circle-2');
    } else if (i === stageNum) {
      stepEl.className = 'hud-stage-step active';
      if (icon) icon.setAttribute('data-lucide', 'circle-dot');
    } else {
      stepEl.className = 'hud-stage-step';
      if (icon) icon.setAttribute('data-lucide', 'circle');
    }
  }
  if (window.lucide) lucide.createIcons();
}

function hideProcessingHUD() {
  clearInterval(hudTimerInterval);
  const overlay = document.getElementById('processing-overlay');
  if (overlay) overlay.style.display = 'none';
}

function downloadDataUrl(dataUrl, filename) {
  if (!dataUrl) return;
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://') || dataUrl.startsWith('/')) {
    downloadViaHttpUrl(dataUrl, filename);
    return;
  }
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (e) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = dataUrl;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }
}

function updateQueueCount() {
  const countEl = document.getElementById('queue-count');
  if (countEl) countEl.textContent = state.queue.length;
}

function addToQueue(item) {
  state.queue.unshift({
    ...item,
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleTimeString()
  });
  updateQueueCount();
  renderGlobalQueue();
}

function renderGlobalQueue() {
  const listEl = document.getElementById('global-queue-list');
  if (!listEl) return;

  if (state.queue.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 48px 24px; color: var(--text-dim);">
        <div style="margin-bottom: 12px; color: var(--text-dim);">
          <i data-lucide="folder" style="width: 48px; height: 48px;"></i>
        </div>
        <p>Belum ada file yang diproses pada sesi ini.</p>
        <p style="font-size: 12px; margin-top: 6px;">Pilih salah satu menu di bilah navigasi kiri untuk memulai.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  listEl.innerHTML = '';
  state.queue.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <img src="${item.previewUrl || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'><rect width=\'50\' height=\'50\' fill=\'%231a2337\'/><text x=\'50%\' y=\'50%\' fill=\'%2364748b\' font-size=\'10\' text-anchor=\'middle\' dy=\'.3em\'>FILE</text></svg>'}" class="result-thumb" alt="Preview">
      <div class="result-info">
        <div class="result-filename">${item.outputName || item.filename}</div>
        <div class="result-meta">
          <span>${item.tool || 'Proses'}</span>
          <span>•</span>
          <span>${formatBytes(item.newSize || item.compressedSize || item.convertedSize || item.originalSize)}</span>
          ${item.savedPercent ? `<span class="badge-saved">-${item.savedPercent}%</span>` : ''}
          <span>•</span>
          <span>${item.timestamp}</span>
        </div>
      </div>
      <button class="btn-primary" style="padding: 8px 16px; font-size: 12px;" onclick="downloadDataUrl('${item.previewUrl}', '${item.outputName || item.filename}')">
        <i data-lucide="download" style="width: 14px; height: 14px;"></i>
        Unduh
      </button>
    `;
    listEl.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

// ====================================================
// LENIS SMOOTH SCROLL INITIALIZATION
// ====================================================
let lenisInstance = null;
function initLenis() {
  try {
    if (window.Lenis) {
      const scrollWrapper = document.getElementById('scroll-wrapper');
      const scrollContent = document.getElementById('scroll-content');
      lenisInstance = new Lenis({
        wrapper: scrollWrapper,
        content: scrollContent,
        smoothWheel: true,
        duration: 1.2
      });

      function raf(time) {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  } catch (err) {
    console.warn('Lenis scroll warning:', err);
  }
}

// ====================================================
// TAB NAVIGATION
// ====================================================
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.tab-panel');
  const topTitle = document.getElementById('top-title');
  const topSubtitle = document.getElementById('top-subtitle');

  const titles = {
    'tab-compress': { title: 'Compress File', subtitle: 'Kompresi cerdas seluruh format gambar tanpa kehilangan kualitas kasat mata.' },
    'tab-upscale': { title: 'AI & HD Upscaler', subtitle: 'Perbesar resolusi hingga 8x dengan rekonstruksi garis tepi tajam.' },
    'tab-pdf': { title: 'Compress PDF', subtitle: 'Optimasi struktur dokumen PDF untuk WhatsApp & Email.' },
    'tab-convert': { title: 'Convert Format', subtitle: 'Konversi silang antar semua format media & Windows ICO generator.' },
    'tab-adobe': { title: 'Adobe Suite Downgrader', subtitle: 'Downgrade Premiere, After Effects, Photoshop, Illustrator & InDesign ke versi lama.' },
    'tab-queue': { title: 'Riwayat & Batch Queue', subtitle: 'Kumpulan seluruh file yang telah diproses dalam sesi ini.' }
  };

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      navBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      panels.forEach((p) => p.classList.remove('active'));
      const activePanel = document.getElementById(targetTab);
      if (activePanel) activePanel.classList.add('active');

      if (titles[targetTab] && topTitle) {
        topTitle.textContent = titles[targetTab].title;
      }

      if (window.lucide) lucide.createIcons();
    });
  });
}

// ====================================================
// TAB 1: COMPRESS IMAGE (ALL FORMATS & TARGET SIZE)
// ====================================================
function initCompressModule() {
  const dropzone = document.getElementById('compress-dropzone');
  const fileInput = document.getElementById('compress-file-input');
  const qualitySlider = document.getElementById('compress-quality');
  const qualityVal = document.getElementById('compress-quality-val');
  const processBtn = document.getElementById('btn-process-compress');
  const resultsSection = document.getElementById('compress-results');
  const cardsList = document.getElementById('compress-cards-list');
  const targetFormatSelect = document.getElementById('compress-target-format');
  const stripExifCheck = document.getElementById('compress-strip-exif');

  // Mode Toggle (Quality % vs Target Size KB/MB)
  let compressMode = 'quality';
  const btnModeQuality = document.getElementById('btn-mode-quality');
  const btnModeTarget = document.getElementById('btn-mode-target');
  const containerModeQuality = document.getElementById('container-mode-quality');
  const containerModeTarget = document.getElementById('container-mode-target');
  const targetSizeInput = document.getElementById('compress-target-size');
  const targetUnitSelect = document.getElementById('compress-target-unit');

  if (btnModeQuality && btnModeTarget) {
    btnModeQuality.addEventListener('click', () => {
      compressMode = 'quality';
      btnModeQuality.classList.add('active');
      btnModeTarget.classList.remove('active');
      if (containerModeQuality) containerModeQuality.style.display = 'block';
      if (containerModeTarget) containerModeTarget.style.display = 'none';
    });

    btnModeTarget.addEventListener('click', () => {
      compressMode = 'target';
      btnModeTarget.classList.add('active');
      btnModeQuality.classList.remove('active');
      if (containerModeQuality) containerModeQuality.style.display = 'none';
      if (containerModeTarget) containerModeTarget.style.display = 'block';
    });
  }

  qualitySlider.addEventListener('input', (e) => {
    qualityVal.textContent = `${e.target.value}%`;
    document.querySelectorAll('#tab-compress .segmented-btn').forEach(b => b.classList.remove('active'));
  });

  document.querySelectorAll('#container-mode-quality .segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#container-mode-quality .segmented-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const q = btn.getAttribute('data-quality');
      qualitySlider.value = q;
      qualityVal.textContent = `${q}%`;
    });
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleCompressFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleCompressFiles(Array.from(e.target.files));
    }
  });

  function handleCompressFiles(files) {
    state.selectedCompressFiles = files;
    dropzone.querySelector('h3').textContent = `${files.length} File Media Dipilih`;
    dropzone.querySelector('p').textContent = files.map(f => f.name).slice(0, 3).join(', ') + (files.length > 3 ? ` dan ${files.length - 3} lainnya` : '');
    showToast(`${files.length} file siap dikompres.`, 'info');
  }

  processBtn.addEventListener('click', async () => {
    if (state.selectedCompressFiles.length === 0) {
      showCustomAlert('File Belum Dipilih', 'Silakan pilih minimal 1 file gambar atau media terlebih dahulu.', 'error');
      return;
    }

    if (compressMode === 'target') {
      const sizeVal = parseFloat(targetSizeInput.value);
      if (!sizeVal || sizeVal <= 0) {
        showCustomAlert('Target Ukuran Belum Diisi', 'Silakan masukkan target ukuran file yang valid (misalnya: 300 KB atau 1.5 MB).', 'error');
        return;
      }
    }

    processBtn.disabled = true;
    processBtn.innerHTML = `<span>Sedang Mengompres...</span>`;

    const formData = new FormData();
    state.selectedCompressFiles.forEach(f => formData.append('files', f));
    formData.append('stripMetadata', stripExifCheck.checked);
    if (targetFormatSelect.value) {
      formData.append('format', targetFormatSelect.value);
    }

    if (compressMode === 'target') {
      formData.append('targetSize', targetSizeInput.value);
      formData.append('targetUnit', targetUnitSelect.value);
    } else {
      formData.append('quality', qualitySlider.value);
    }

    const hudTitle = compressMode === 'target' 
      ? `KOMPRESI TARGET: ${targetSizeInput.value} ${targetUnitSelect.value}`
      : `KOMPRESI MEDIA NATIVE (${qualitySlider.value}%)`;
    const hudDesc = compressMode === 'target'
      ? `Menjalankan algoritma biner adaptif untuk mencapai ukuran &le; ${targetSizeInput.value} ${targetUnitSelect.value}`
      : `Mengoptimasi bitrate, encoding stream, dan kompresi tanpa kehilangan detail esensial`;

    showProcessingHUD(hudTitle, hudDesc, [
      'Alokasi Buffer RAM & Profil Warna',
      compressMode === 'target' ? 'Iterasi Kompresi Adaptif Binary-Search' : 'Encoding Kompresi Native Sharp',
      'Verifikasi Stream & Stripping Metadata'
    ]);

    try {
      const res = await fetch('/api/compress/image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengompres gambar');
      }

      resultsSection.style.display = 'block';
      cardsList.innerHTML = '';

      let totalOrig = 0;
      let totalComp = 0;

      data.data.forEach((item) => {
        totalOrig += item.originalSize;
        totalComp += item.compressedSize;

        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
          <img src="${item.previewUrl}" class="result-thumb" alt="Preview">
          <div class="result-info">
            <div class="result-filename">${item.outputName}</div>
            <div class="result-meta">
              <span>${formatBytes(item.originalSize)} ➜ <strong>${formatBytes(item.compressedSize)}</strong></span>
              <span class="badge-saved">-${item.savedPercent}%</span>
              <span>${item.width}x${item.height} px</span>
            </div>
          </div>
          <button class="btn-primary" style="padding: 8px 16px; font-size: 12px;" onclick="downloadDataUrl('${item.previewUrl}', '${item.outputName}')">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            Unduh
          </button>
        `;
        cardsList.appendChild(card);

        addToQueue({
          tool: compressMode === 'target' ? `Kompresi Target (${targetSizeInput.value} ${targetUnitSelect.value})` : 'Kompresi Media',
          filename: item.filename,
          outputName: item.outputName,
          previewUrl: item.previewUrl,
          originalSize: item.originalSize,
          compressedSize: item.compressedSize,
          savedPercent: item.savedPercent
        });
      });

      const overallSaved = totalOrig > 0 ? (((totalOrig - totalComp) / totalOrig) * 100).toFixed(1) : 0;
      document.getElementById('compress-total-saved').textContent = `Total Hemat: -${overallSaved}% (${formatBytes(totalOrig - totalComp)})`;
      
      const successMsg = compressMode === 'target'
        ? `Berhasil mengompres ${data.data.length} file agar muat dalam target <strong>${targetSizeInput.value} ${targetUnitSelect.value}</strong>!`
        : `Berhasil mengompres ${data.data.length} file dengan penghematan ruang <strong>-${overallSaved}%</strong> (${formatBytes(totalOrig - totalComp)}).`;
      
      showCustomAlert('Kompresi Berhasil', successMsg, 'success');

      if (window.lucide) lucide.createIcons();

    } catch (err) {
      showCustomAlert('Terjadi Kesalahan', err.message, 'error');
    } finally {
      hideProcessingHUD();
      processBtn.disabled = false;
      processBtn.innerHTML = `
        <i data-lucide="play" style="width: 16px; height: 16px;"></i>
        <span>Kompres Sekarang</span>
      `;
      if (window.lucide) lucide.createIcons();
    }
  });
}

// ====================================================
// TAB 2: AI & HD UPSCALER
// ====================================================
function initUpscaleModule() {
  const dropzone = document.getElementById('upscale-dropzone');
  const fileInput = document.getElementById('upscale-file-input');
  const processBtn = document.getElementById('btn-process-upscale');
  const comparisonBox = document.getElementById('upscale-comparison-box');
  const compOverlay = document.getElementById('comp-overlay');
  const compHandle = document.getElementById('comp-handle');
  const compBeforeImg = document.getElementById('comp-img-before');
  const compAfterImg = document.getElementById('comp-img-after');
  const rangeInput = document.getElementById('comp-range-input');
  const container = document.getElementById('comparison-slider-container');
  const downloadBtn = document.getElementById('btn-download-upscaled');
  const denoiseCheck = document.getElementById('upscale-denoise');
  const modeSelect = document.getElementById('upscale-mode');

  let activeScale = 2;

  document.querySelectorAll('#upscale-scale-group .segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#upscale-scale-group .segmented-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeScale = parseFloat(btn.getAttribute('data-scale'));
    });
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpscaleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpscaleFile(e.target.files[0]);
    }
  });

  function handleUpscaleFile(file) {
    state.selectedUpscaleFile = file;
    dropzone.querySelector('h3').textContent = file.name;
    dropzone.querySelector('p').textContent = `Ukuran awal: ${formatBytes(file.size)}`;
    showToast(`Gambar dipilih: ${file.name}`, 'info');
  }

  function setSliderPosition(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    compOverlay.style.width = `${clamped}%`;
    compHandle.style.left = `${clamped}%`;
    rangeInput.value = clamped;
  }

  rangeInput.addEventListener('input', (e) => {
    setSliderPosition(e.target.value);
  });

  let isDragging = false;
  const onPointerMove = (e) => {
    if (!isDragging) return;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX)) - rect.left;
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  container.addEventListener('mousedown', () => { isDragging = true; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', onPointerMove);

  processBtn.addEventListener('click', async () => {
    if (!state.selectedUpscaleFile) {
      showCustomAlert('File Belum Dipilih', 'Silakan pilih file gambar untuk di-upscale.', 'error');
      return;
    }

    processBtn.disabled = true;
    processBtn.innerHTML = `<span>Memproses Super-Resolution...</span>`;

    const formData = new FormData();
    formData.append('file', state.selectedUpscaleFile);
    formData.append('scale', activeScale);
    formData.append('mode', modeSelect.value);
    formData.append('denoise', denoiseCheck.checked);

    showProcessingHUD(`AI & HD UPSCALING (${activeScale}x)`, 'Sedang melakukan interpolasi spasial dan rekonstruksi ketajaman piksel', [
      'Alokasi Buffer High-Memory & Color Plane',
      'Komputasi Super-Resolution Interpolasi Lanczos-3',
      'Unsharp Mask Filtering & Re-encoding Output'
    ]);

    try {
      const res = await fetch('/api/upscale/image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal melakukan upscale');
      }

      state.upscaleResult = data;
      comparisonBox.style.display = 'block';

      compBeforeImg.src = data.originalPreview;
      compAfterImg.src = data.upscaledPreview;

      document.getElementById('upscale-factor-badge').textContent = `${data.scale}x Pembesaran`;
      document.getElementById('upscale-stat-orig').textContent = `${data.originalWidth}x${data.originalHeight} px (${formatBytes(data.originalSize)})`;
      document.getElementById('upscale-stat-new').textContent = `${data.upscaledWidth}x${data.upscaledHeight} px (${formatBytes(data.upscaledSize)})`;

      setSliderPosition(50);

      downloadBtn.onclick = () => {
        downloadDataUrl(data.upscaledPreview, data.outputName);
      };

      addToQueue({
        tool: `AI Upscale ${data.scale}x`,
        filename: data.filename,
        outputName: data.outputName,
        previewUrl: data.upscaledPreview,
        originalSize: data.originalSize,
        newSize: data.upscaledSize
      });

      showCustomAlert('Upscale Berhasil', `Resolusi berhasil ditingkatkan dari ${data.originalWidth}x${data.originalHeight} px menjadi <strong>${data.upscaledWidth}x${data.upscaledHeight} px</strong>. Geser divider untuk melihat perbandingannya!`, 'success');
      comparisonBox.scrollIntoView({ behavior: 'smooth' });

      if (window.lucide) lucide.createIcons();

    } catch (err) {
      showCustomAlert('Gagal Upscale', err.message, 'error');
    } finally {
      hideProcessingHUD();
      processBtn.disabled = false;
      processBtn.innerHTML = `
        <i data-lucide="play" style="width: 16px; height: 16px;"></i>
        <span>Mulai AI Upscaling</span>
      `;
      if (window.lucide) lucide.createIcons();
    }
  });
}

// ====================================================
// TAB 3: COMPRESS PDF
// ====================================================
function initPdfModule() {
  const dropzone = document.getElementById('pdf-dropzone');
  const fileInput = document.getElementById('pdf-file-input');
  const processBtn = document.getElementById('btn-process-pdf');
  const resultsSection = document.getElementById('pdf-results');
  const cardsList = document.getElementById('pdf-cards-list');
  const stripMetaCheck = document.getElementById('pdf-strip-meta');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePdfFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePdfFiles(Array.from(e.target.files));
    }
  });

  function handlePdfFiles(files) {
    state.selectedPdfFiles = files;
    dropzone.querySelector('h3').textContent = `${files.length} Dokumen PDF Dipilih`;
    dropzone.querySelector('p').textContent = files.map(f => f.name).join(', ');
    showToast(`${files.length} dokumen PDF siap dioptimasi.`, 'info');
  }

  processBtn.addEventListener('click', async () => {
    if (state.selectedPdfFiles.length === 0) {
      showCustomAlert('File Belum Dipilih', 'Silakan pilih file PDF terlebih dahulu.', 'error');
      return;
    }

    processBtn.disabled = true;
    processBtn.innerHTML = `<span>Mengompres PDF...</span>`;

    const formData = new FormData();
    state.selectedPdfFiles.forEach(f => formData.append('files', f));
    formData.append('stripMetadata', stripMetaCheck.checked);

    showProcessingHUD('KOMPRESI STRUKTUR PDF', 'Mengompres object streams, font subset, dan gambar internal PDF', [
      'Parsing PDF Document & Cross-Reference Table',
      'Deflate Object Streams & Kompresi Konten',
      'Serialisasi Binary PDF & Penyimpanan Buffer'
    ]);

    try {
      const res = await fetch('/api/compress/pdf', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengompres PDF');
      }

      resultsSection.style.display = 'block';
      cardsList.innerHTML = '';

      data.data.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
          <div class="result-thumb" style="display: flex; align-items: center; justify-content: center; color: var(--accent-rose);">
            <i data-lucide="file-text" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="result-info">
            <div class="result-filename">${item.outputName}</div>
            <div class="result-meta">
              <span>${item.pageCount} Halaman</span>
              <span>•</span>
              <span>${formatBytes(item.originalSize)} ➜ <strong>${formatBytes(item.compressedSize)}</strong></span>
              ${item.savedPercent > 0 ? `<span class="badge-saved">-${item.savedPercent}%</span>` : ''}
            </div>
          </div>
          <button class="btn-primary" style="padding: 8px 16px; font-size: 12px;" onclick="downloadDataUrl('${item.previewUrl}', '${item.outputName}')">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            Unduh
          </button>
        `;
        cardsList.appendChild(card);

        addToQueue({
          tool: 'Kompresi PDF',
          filename: item.filename,
          outputName: item.outputName,
          previewUrl: item.previewUrl,
          originalSize: item.originalSize,
          compressedSize: item.compressedSize,
          savedPercent: item.savedPercent
        });
      });

      showCustomAlert('PDF Berhasil Dioptimasi', `Berhasil mengompres ${data.data.length} dokumen PDF.`, 'success');
      if (window.lucide) lucide.createIcons();

    } catch (err) {
      showCustomAlert('Gagal Mengompres PDF', err.message, 'error');
    } finally {
      hideProcessingHUD();
      processBtn.disabled = false;
      processBtn.innerHTML = `
        <i data-lucide="play" style="width: 16px; height: 16px;"></i>
        <span>Kompres PDF Sekarang</span>
      `;
      if (window.lucide) lucide.createIcons();
    }
  });
}

// ====================================================
// TAB 4: ADOBE SUITE DOWNGRADER & INSPECTOR
// ====================================================
function initAdobeModule() {
  const dropzone = document.getElementById('adobe-dropzone');
  const fileInput = document.getElementById('adobe-file-input');
  const dropTitle = document.getElementById('adobe-drop-title');
  const dropDesc = document.getElementById('adobe-drop-desc');

  // Panels
  const prprojPanel = document.getElementById('prproj-downgrade-panel');
  const aePanel = document.getElementById('ae-downgrade-panel');
  const psdPanel = document.getElementById('psd-downgrade-panel');
  const aiPanel = document.getElementById('ai-downgrade-panel');
  const inddPanel = document.getElementById('indd-downgrade-panel');

  // Subnav buttons
  const subnavBtns = document.querySelectorAll('.adobe-subnav-btn');

  function hideAllAdobePanels() {
    prprojPanel.style.display = 'none';
    aePanel.style.display = 'none';
    psdPanel.style.display = 'none';
    aiPanel.style.display = 'none';
    inddPanel.style.display = 'none';
  }

  subnavBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      subnavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const app = btn.getAttribute('data-app');
      state.activeAdobeApp = app;

      if (app === 'prproj') {
        dropTitle.textContent = 'Pilih File Proyek Premiere Pro (.prproj)';
        dropDesc.textContent = 'Downgrade proyek Premiere agar bisa dibuka di Premiere versi lama.';
        fileInput.accept = '.prproj';
      } else if (app === 'aftereffects') {
        dropTitle.textContent = 'Pilih File Proyek After Effects (.aep, .aepx)';
        dropDesc.textContent = 'Downgrade proyek After Effects ke versi CC 2020, 2019, atau CS6.';
        fileInput.accept = '.aep,.aepx';
      } else if (app === 'photoshop') {
        dropTitle.textContent = 'Pilih File Desain Photoshop (.psd, .psb)';
        dropDesc.textContent = 'Patch kompatibilitas layer dan format agar bisa dibuka di Photoshop CS6/CC.';
        fileInput.accept = '.psd,.psb';
      } else if (app === 'illustrator') {
        dropTitle.textContent = 'Pilih File Vektor Illustrator (.ai)';
        dropDesc.textContent = 'Patch versi stream PDF internal agar kompatibel dengan Illustrator CS6/CC.';
        fileInput.accept = '.ai';
      } else if (app === 'indesign') {
        dropTitle.textContent = 'Pilih File Layout InDesign (.indd)';
        dropDesc.textContent = 'Panduan dan generator otomatisasi ekspor ke format IDML universal.';
        fileInput.accept = '.indd';
      }

      hideAllAdobePanels();
      if (window.lucide) lucide.createIcons();
    });
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAdobeFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAdobeFile(e.target.files[0]);
    }
  });

  async function handleAdobeFile(file) {
    state.selectedAdobeFile = file;
    const name = file.name.toLowerCase();

    dropzone.querySelector('h3').textContent = file.name;
    dropzone.querySelector('p').textContent = `Ukuran file: ${formatBytes(file.size)}`;

    hideAllAdobePanels();

    // 1. Premiere Pro (.prproj)
    if (name.endsWith('.prproj')) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/adobe/inspect-prproj', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memeriksa file Premiere Pro');

        document.getElementById('prproj-filename').textContent = data.filename;
        document.getElementById('prproj-current-ver').textContent = data.versionInfo ? data.versionInfo.name : `Versi ${data.currentVersion}`;
        prprojPanel.style.display = 'block';
        showToast(`Versi terdeteksi: ${data.versionInfo ? data.versionInfo.name : 'Unknown'}`, 'info');
      } catch (err) {
        showCustomAlert('Gagal Membaca File', err.message, 'error');
      }
    }
    // 2. After Effects (.aep / .aepx)
    else if (name.endsWith('.aep') || name.endsWith('.aepx')) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/adobe/inspect-after-effects', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memeriksa After Effects');

        document.getElementById('ae-filename').textContent = data.filename;
        document.getElementById('ae-current-ver').textContent = `${data.formatType} - ${data.currentVersion}`;
        aePanel.style.display = 'block';
        showToast(`After Effects Project: ${data.formatType}`, 'info');
      } catch (err) {
        showCustomAlert('Gagal Membaca File', err.message, 'error');
      }
    }
    // 3. Photoshop (.psd / .psb)
    else if (name.endsWith('.psd') || name.endsWith('.psb')) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/adobe/inspect-photoshop', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memeriksa Photoshop');

        document.getElementById('psd-filename').textContent = data.filename;
        document.getElementById('psd-meta-summary').innerHTML = `
          <p><strong>Resolusi Dokumen:</strong> ${data.width} x ${data.height} px (${data.colorMode} ${data.depth})</p>
          <p><strong>Jumlah Channels:</strong> ${data.channels} layer/alpha channels</p>
          <p style="margin-top: 6px; color: var(--accent-emerald);">Klik tombol di bawah untuk menstandarisasi header ke kompatibilitas penuh CS6 / CC tanpa merusak layer.</p>
        `;
        psdPanel.style.display = 'block';
        showToast('File Photoshop siap distandarisasi.', 'info');
      } catch (err) {
        showCustomAlert('Gagal Membaca File', err.message, 'error');
      }
    }
    // 4. Illustrator (.ai)
    else if (name.endsWith('.ai')) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/adobe/inspect-illustrator', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memeriksa Illustrator');

        document.getElementById('ai-filename').textContent = data.filename;
        document.getElementById('ai-meta-summary').innerHTML = `
          <p><strong>Kompatibilitas PDF:</strong> ${data.hasPdfCompatibility ? 'Aktif (Header ' + data.pdfVersion + ')' : 'Non-PDF PostScript'}</p>
          <p><strong>Rekomendasi Target:</strong> ${data.recommendedTarget}</p>
          <p style="margin-top: 6px; color: var(--accent-amber);">File dapat di-patch agar versi kompatibilitasnya turun ke standar CS6 (PDF 1.4).</p>
        `;
        aiPanel.style.display = 'block';
        showToast('File Illustrator siap di-downgrade.', 'info');
      } catch (err) {
        showCustomAlert('Gagal Membaca File', err.message, 'error');
      }
    }
    // 5. InDesign (.indd)
    else if (name.endsWith('.indd')) {
      document.getElementById('indd-filename').textContent = file.name;
      inddPanel.style.display = 'block';
      showToast('File InDesign dimuat.', 'info');
    }

    if (window.lucide) lucide.createIcons();
  }

  // Action: Premiere Pro Downgrade
  document.getElementById('btn-execute-downgrade').addEventListener('click', async () => {
    if (!state.selectedAdobeFile) return;
    const targetVer = document.getElementById('prproj-target-select').value;
    const formData = new FormData();
    formData.append('file', state.selectedAdobeFile);
    formData.append('targetVersion', targetVer);

    showProcessingHUD('DOWNGRADE PREMIERE PRO', 'Merekonstruksi schema XML dan version tag project', [
      'Dekompresi Stream GZIP Proyek ke Memory',
      'Patching Version Schema Tag ke Format Target',
      'Re-encoding GZIP & Validasi Header File'
    ]);

    try {
      showToast('Sedang merevisi struktur XML dan GZIP...', 'info');
      const res = await fetch('/api/adobe/downgrade-prproj', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mendowngrade file Premiere Pro');

      showDownloadSuccessModal('Downgrade Premiere Sukses', `Project Premiere Pro telah berhasil disesuaikan ke versi target.`, data.outputFilename, data.downloadUrl);
    } catch (err) {
      showCustomAlert('Gagal Downgrade', err.message, 'error');
    } finally {
      hideProcessingHUD();
    }
  });

  // Action: After Effects Downgrade
  document.getElementById('btn-execute-ae-downgrade').addEventListener('click', async () => {
    if (!state.selectedAdobeFile) return;
    const targetVer = document.getElementById('ae-target-select').value;
    const formData = new FormData();
    formData.append('file', state.selectedAdobeFile);
    formData.append('targetVersion', targetVer);

    showProcessingHUD('DOWNGRADE AFTER EFFECTS', 'Membaca binary RIFF / AEPX dan mengonversi format', [
      'Parsing RIFX Header & Version Chunks',
      'Modifikasi Version Code ke Target Rilis',
      'Validasi Integritas Chunk & Finalisasi'
    ]);

    try {
      showToast('Sedang mendowngrade project After Effects...', 'info');
      const res = await fetch('/api/adobe/downgrade-after-effects', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mendowngrade file After Effects');

      showDownloadSuccessModal('Downgrade After Effects Sukses', `Project After Effects telah berhasil disesuaikan ke versi target (${targetVer}).`, data.outputFilename, data.downloadUrl);
    } catch (err) {
      showCustomAlert('Gagal Downgrade', err.message, 'error');
    } finally {
      hideProcessingHUD();
    }
  });

  // Action: Photoshop Compatibility Downgrade
  document.getElementById('btn-execute-psd-downgrade').addEventListener('click', async () => {
    if (!state.selectedAdobeFile) return;
    const targetVer = document.getElementById('psd-target-select').value;
    const formData = new FormData();
    formData.append('file', state.selectedAdobeFile);
    formData.append('targetVersion', targetVer);

    showProcessingHUD('STANDARISASI PHOTOSHOP', 'Menyelaraskan header kompatibilitas layer PSD/PSB', [
      'Inspeksi Header Dimensi & Color Mode',
      'Standarisasi Header Kompatibilitas CS6/CC',
      'Rekonstruksi File Output'
    ]);

    try {
      showToast('Menstandarisasi header kompatibilitas Photoshop...', 'info');
      const res = await fetch('/api/adobe/downgrade-photoshop', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memproses file Photoshop');

      showDownloadSuccessModal('Standarisasi PSD Sukses', `File Photoshop telah disesuaikan ke mode kompatibilitas ${targetVer}.`, data.outputFilename, data.downloadUrl);
    } catch (err) {
      showCustomAlert('Gagal Memproses PSD', err.message, 'error');
    } finally {
      hideProcessingHUD();
    }
  });

  // Action: Illustrator Downgrade
  document.getElementById('btn-execute-ai-downgrade').addEventListener('click', async () => {
    if (!state.selectedAdobeFile) return;
    const targetVer = document.getElementById('ai-target-select').value;
    const formData = new FormData();
    formData.append('file', state.selectedAdobeFile);
    formData.append('targetVersion', targetVer);

    showProcessingHUD('DOWNGRADE ILLUSTRATOR', 'Menyesuaikan versi kompatibilitas PDF/PostScript', [
      'Inspeksi Stream Kompatibilitas AI',
      'Patching Header Kompatibilitas Target',
      'Finalisasi File AI'
    ]);

    try {
      showToast('Memodifikasi header PDF compatibility Illustrator...', 'info');
      const res = await fetch('/api/adobe/downgrade-illustrator', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memproses file Illustrator');

      showDownloadSuccessModal('Downgrade AI Sukses', `File Illustrator telah disesuaikan ke kompatibilitas ${targetVer}.`, data.outputFilename, data.downloadUrl);
    } catch (err) {
      showCustomAlert('Gagal Downgrade AI', err.message, 'error');
    } finally {
      hideProcessingHUD();
    }
  });

  // Helper JSX Script Generator
  async function downloadJsxScript(appType, targetYear = 'CS6') {
    try {
      const res = await fetch('/api/adobe/generate-jsx-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appType, targetYear })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('Gagal membuat script JSX');

      const blob = new Blob([data.script], { type: 'text/javascript' });
      const url = window.URL.createObjectURL(blob);
      downloadDataUrl(url, data.filename);
      showCustomAlert('Script JSX Berhasil Diunduh', `Script otomatisasi batch <strong>${data.filename}</strong> berhasil diunduh. Jalankan script ini langsung dari menu File ➜ Scripts pada ${appType} Anda.`, 'success');
    } catch (err) {
      showCustomAlert('Gagal Mengunduh Script', err.message, 'error');
    }
  }

  document.getElementById('btn-psd-jsx').addEventListener('click', () => {
    const targetVer = document.getElementById('psd-target-select').value;
    downloadJsxScript('Photoshop', targetVer);
  });
  document.getElementById('btn-ai-jsx').addEventListener('click', () => {
    const targetVer = document.getElementById('ai-target-select').value;
    downloadJsxScript('Illustrator', targetVer);
  });
  document.getElementById('btn-indd-jsx').addEventListener('click', () => downloadJsxScript('InDesign', 'IDML'));
}

// ====================================================
// TAB 5: UNIVERSAL FORMAT CONVERTER
// ====================================================
function initConvertModule() {
  const dropzone = document.getElementById('convert-dropzone');
  const fileInput = document.getElementById('convert-file-input');
  const targetSelect = document.getElementById('convert-target-format');
  const bgGroup = document.getElementById('convert-bg-group');
  const bgColorSelect = document.getElementById('convert-bg-color');
  const qualitySlider = document.getElementById('convert-quality');
  const qualityVal = document.getElementById('convert-quality-val');
  const processBtn = document.getElementById('btn-process-convert');
  const resultsSection = document.getElementById('convert-results');
  const cardsList = document.getElementById('convert-cards-list');

  qualitySlider.addEventListener('input', (e) => {
    qualityVal.textContent = `${e.target.value}%`;
  });

  targetSelect.addEventListener('change', () => {
    if (targetSelect.value === 'jpeg') {
      bgGroup.style.display = 'block';
    } else {
      bgGroup.style.display = 'none';
    }
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleConvertFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleConvertFiles(Array.from(e.target.files));
    }
  });

  function handleConvertFiles(files) {
    state.selectedConvertFiles = files;
    dropzone.querySelector('h3').textContent = `${files.length} File Dipilih`;
    dropzone.querySelector('p').textContent = files.map(f => f.name).slice(0, 3).join(', ') + (files.length > 3 ? ` dan ${files.length - 3} lainnya` : '');
    showToast(`${files.length} media siap dikonversi ke format ${targetSelect.value.toUpperCase()}.`, 'info');
  }

  processBtn.addEventListener('click', async () => {
    if (state.selectedConvertFiles.length === 0) {
      showCustomAlert('File Belum Dipilih', 'Silakan pilih file media untuk dikonversi.', 'error');
      return;
    }

    processBtn.disabled = true;
    processBtn.innerHTML = `<span>Sedang Mengonversi Format...</span>`;

    const formData = new FormData();
    state.selectedConvertFiles.forEach(f => formData.append('files', f));
    formData.append('targetFormat', targetSelect.value);
    formData.append('quality', qualitySlider.value);
    formData.append('bgColor', bgColorSelect.value);

    showProcessingHUD(`KONVERSI MEDIA (${targetSelect.value.toUpperCase()})`, 'Mengonversi pixel buffer dan encoding ke format tujuan', [
      'Decoding Buffer Media Sumber',
      'Transformasi Ruang Warna & Rasterisasi',
      `Encoding Output Format ${targetSelect.value.toUpperCase()}`
    ]);

    try {
      const res = await fetch('/api/convert/image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengonversi format');
      }

      resultsSection.style.display = 'block';
      cardsList.innerHTML = '';

      data.data.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
          <img src="${item.previewUrl}" class="result-thumb" alt="Preview">
          <div class="result-info">
            <div class="result-filename">${item.outputName}</div>
            <div class="result-meta">
              <span>Format: <strong>${item.format.toUpperCase()}</strong></span>
              <span>•</span>
              <span>${formatBytes(item.convertedSize)}</span>
              ${item.width ? `<span>• ${item.width}x${item.height} px</span>` : ''}
            </div>
          </div>
          <button class="btn-primary" style="padding: 8px 16px; font-size: 12px;" onclick="downloadDataUrl('${item.previewUrl}', '${item.outputName}')">
            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
            Unduh
          </button>
        `;
        cardsList.appendChild(card);

        addToQueue({
          tool: `Konversi ke ${item.format.toUpperCase()}`,
          filename: item.filename,
          outputName: item.outputName,
          previewUrl: item.previewUrl,
          originalSize: item.originalSize,
          convertedSize: item.convertedSize
        });
      });

      showCustomAlert('Konversi Sukses', `Berhasil mengonversi ${data.data.length} file ke format <strong>${targetSelect.value.toUpperCase()}</strong>!`, 'success');
      if (window.lucide) lucide.createIcons();

    } catch (err) {
      showCustomAlert('Gagal Mengonversi', err.message, 'error');
    } finally {
      hideProcessingHUD();
      processBtn.disabled = false;
      processBtn.innerHTML = `
        <i data-lucide="play" style="width: 16px; height: 16px;"></i>
        <span>Konversi Format Sekarang</span>
      `;
      if (window.lucide) lucide.createIcons();
    }
  });
}

// ====================================================
// BATCH ZIP & CLEAR QUEUE
// ====================================================
function initQueueModule() {
  const clearBtn = document.getElementById('btn-clear-queue');
  const downloadZipBtn = document.getElementById('btn-download-all-zip');
  const openWorkspaceBtn = document.getElementById('btn-open-workspace');

  clearBtn.addEventListener('click', () => {
    state.queue = [];
    updateQueueCount();
    renderGlobalQueue();
    showToast('Daftar antrean berhasil dibersihkan.', 'info');
  });

  const handleDownloadZip = async () => {
    if (state.queue.length === 0) {
      showCustomAlert('Antrean Kosong', 'Belum ada file dalam antrean untuk diunduh sebagai arsip ZIP.', 'error');
      return;
    }

    showToast('Sedang mengemas file ke dalam ZIP...', 'info');

    const items = state.queue.map(q => ({
      filename: q.outputName || q.filename,
      data: q.previewUrl
    })).filter(i => i.data && i.data.startsWith('data:'));

    try {
      const res = await fetch('/api/batch/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, zipName: `appmyq_export_${Date.now()}` })
      });

      if (!res.ok) throw new Error('Gagal membuat file ZIP');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      downloadDataUrl(url, `appmyq_batch_${Date.now()}.zip`);
      showCustomAlert('Download ZIP Siap', 'Seluruh file dalam batch berhasil dikemas dan diunduh!', 'success');
    } catch (err) {
      showCustomAlert('Gagal Mengemas ZIP', err.message, 'error');
    }
  };

  downloadZipBtn.addEventListener('click', handleDownloadZip);
  openWorkspaceBtn.addEventListener('click', handleDownloadZip);
}

function initSoftwareDownloads() {
  const downloadWrap = document.getElementById('download-dropdown-wrap');
  const downloadBtn = document.getElementById('btn-download-app');
  const downloadMenu = document.getElementById('download-dropdown-menu');
  const macModal = document.getElementById('mac-modal-backdrop');
  const btnDlMac = document.getElementById('btn-dl-mac');
  const btnCloseMac = document.getElementById('btn-close-mac-modal');
  const btnCloseMacOk = document.getElementById('btn-close-mac-modal-ok');
  const btnCopyMacCmd = document.getElementById('btn-copy-mac-cmd');
  const macCmdText = document.getElementById('mac-cmd-text');

  if (downloadBtn && downloadMenu) {
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!downloadWrap || !downloadWrap.contains(e.target)) {
        downloadMenu.classList.remove('show');
      }
    });
  }

  // macOS Info Modal
  if (btnDlMac && macModal) {
    btnDlMac.addEventListener('click', async (e) => {
      e.preventDefault();
      if (downloadMenu) downloadMenu.classList.remove('show');

      try {
        const res = await fetch('/api/download/macos-dmg');
        if (res.ok) {
          window.location.href = '/api/download/macos-dmg';
          return;
        }
      } catch (err) {
        // Fallthrough to modal dialog
      }

      macModal.classList.add('show');
      if (window.lucide) lucide.createIcons();
    });
  }

  const closeMacModal = () => {
    if (macModal) macModal.classList.remove('show');
  };

  if (btnCloseMac) btnCloseMac.addEventListener('click', closeMacModal);
  if (btnCloseMacOk) btnCloseMacOk.addEventListener('click', closeMacModal);
  if (macModal) {
    macModal.addEventListener('click', (e) => {
      if (e.target === macModal) closeMacModal();
    });
  }

  if (btnCopyMacCmd && macCmdText) {
    btnCopyMacCmd.addEventListener('click', () => {
      navigator.clipboard.writeText(macCmdText.innerText.trim()).then(() => {
        btnCopyMacCmd.textContent = 'Tersalin!';
        setTimeout(() => {
          btnCopyMacCmd.textContent = 'Salin';
        }, 2000);
      });
    });
  }
}

// ====================================================
// APP BOOTSTRAP
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  initLenis();
  initNavigation();
  initHardwareMonitoring();
  initCompressModule();
  initUpscaleModule();
  initPdfModule();
  initAdobeModule();
  initConvertModule();
  initQueueModule();
  initSoftwareDownloads();
  renderGlobalQueue();
});

