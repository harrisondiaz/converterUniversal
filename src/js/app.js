(() => {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    urlInput: $('#url-input'),
    btnAnalyze: $('#btn-analyze'),
    btnDownload: $('#btn-download'),
    btnFolder: $('#btn-folder'),
    btnSettings: $('#btn-settings'),
    btnCloseModal: $('#btn-close-modal'),
    btnModalFolder: $('#btn-modal-folder'),
    platformBadge: $('#platform-badge'),
    platformName: document.querySelector('.platform-name'),
    ytdlpStatus: $('#ytdlp-status'),
    emptyState: $('#empty-state'),
    resultPanel: $('#result-panel'),
    formatGrid: $('#format-grid'),
    mediaTitle: $('#media-title'),
    mediaUploader: $('#media-uploader'),
    mediaDuration: $('#media-duration'),
    thumbImg: $('#thumb-img'),
    thumbPlaceholder: $('#thumb-placeholder'),
    folderPath: $('#folder-path'),
    progressWrap: $('#progress-wrap'),
    progressFill: $('#progress-fill'),
    progressPercent: $('#progress-percent'),
    progressLabel: $('#progress-label'),
    modalBackdrop: $('#modal-backdrop'),
    settingsModal: $('#settings-modal'),
    settingYtdlpInfo: $('#setting-ytdlp-info'),
    settingYtdlpBadge: $('#setting-ytdlp-badge'),
    settingFolderPath: $('#setting-folder-path'),
    installHint: $('#install-hint'),
    installCommand: $('#install-command'),
    toast: $('#toast'),
  };

  const state = {
    url: '',
    platform: null,
    mediaData: null,
    selectedPreset: null,
    outputDir: '',
    ytdlpReady: false,
    analyzing: false,
    downloading: false,
  };

  // --- Modal (transitions.dev pattern) ---
  function openModal() {
    const backdrop = els.modalBackdrop;
    backdrop.classList.remove('hidden', 'is-closing');
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
  }

  function closeModal() {
    const backdrop = els.modalBackdrop;
    if (!backdrop.classList.contains('is-open')) return;

    backdrop.classList.remove('is-open');
    backdrop.classList.add('is-closing');

    const closeDur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--modal-close-dur')) || 150;
    setTimeout(() => {
      backdrop.classList.add('hidden');
      backdrop.classList.remove('is-closing');
    }, closeDur);
  }

  // --- Toast ---
  let toastTimer;
  function showToast(message, type = 'info') {
    els.toast.textContent = message;
    els.toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove('show');
    }, 3500);
  }

  // --- Format helpers ---
  function formatDuration(seconds) {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function truncatePath(p, max = 48) {
    if (!p || p.length <= max) return p;
    const parts = p.split(/[/\\]/);
    const name = parts.pop();
    return `…/${name}`.slice(-max);
  }

  // --- Platform detection ---
  async function updatePlatformBadge(url) {
    if (!url.trim()) {
      els.platformBadge.classList.add('hidden');
      els.btnAnalyze.disabled = true;
      return;
    }

    const platform = await window.api.detectPlatform(url);
    state.platform = platform;

    els.platformBadge.classList.remove('hidden');
    els.platformBadge.style.setProperty('--chip-color', platform.color);
    els.platformBadge.querySelector('.platform-dot').style.background = platform.color;
    els.platformBadge.querySelector('.platform-name').textContent = platform.name;

    const isValid = platform.id !== 'unknown' && /^https?:\/\//i.test(url.trim());
    els.btnAnalyze.disabled = !isValid || state.analyzing;
  }

  // --- yt-dlp status ---
  async function checkYtdlp() {
    const result = await window.api.checkYtdlp();
    state.ytdlpReady = result.installed;

    els.ytdlpStatus.classList.remove('ready', 'error');
    if (result.installed) {
      els.ytdlpStatus.classList.add('ready');
      els.ytdlpStatus.querySelector('.status-text').textContent = `yt-dlp ${result.version}`;
      els.settingYtdlpBadge.textContent = result.version;
      els.settingYtdlpBadge.className = 'setting-badge ok';
      els.settingYtdlpInfo.textContent = 'Ready for downloads';
      els.installHint.classList.add('hidden');
    } else {
      els.ytdlpStatus.classList.add('error');
      els.ytdlpStatus.querySelector('.status-text').textContent = 'yt-dlp missing';
      els.settingYtdlpBadge.textContent = 'Not found';
      els.settingYtdlpBadge.className = 'setting-badge err';
      els.settingYtdlpInfo.textContent = 'Install required';
      els.installHint.classList.remove('hidden');
      els.installCommand.textContent = result.installHint;
    }
  }

  // --- Analyze ---
  async function analyzeUrl() {
    const url = els.urlInput.value.trim();
    if (!url || state.analyzing) return;

    if (!state.ytdlpReady) {
      showToast('Install yt-dlp first — open Settings for instructions', 'error');
      openModal();
      return;
    }

    state.analyzing = true;
    state.url = url;
    els.btnAnalyze.disabled = true;
    els.btnAnalyze.querySelector('.btn-label').textContent = 'Analyzing…';
    els.btnAnalyze.querySelector('.btn-spinner').classList.remove('hidden');

    try {
      const data = await window.api.getFormats(url);
      state.mediaData = data;
      state.selectedPreset = data.presets[0] || null;
      renderResults(data);
    } catch (err) {
      showToast(err.message || 'Could not analyze this URL', 'error');
    } finally {
      state.analyzing = false;
      els.btnAnalyze.querySelector('.btn-label').textContent = 'Analyze';
      els.btnAnalyze.querySelector('.btn-spinner').classList.add('hidden');
      updatePlatformBadge(url);
    }
  }

  function renderResults(data) {
    els.emptyState.classList.add('hidden');
    els.resultPanel.classList.remove('hidden');
    els.resultPanel.classList.add('t-panel-reveal');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => els.resultPanel.classList.add('is-visible'));
    });

    els.mediaTitle.textContent = data.title;
    els.mediaUploader.textContent = data.uploader ? `by ${data.uploader}` : '';
    els.mediaDuration.textContent = data.duration ? formatDuration(data.duration) : '';

    if (data.thumbnail) {
      els.thumbImg.src = data.thumbnail;
      els.thumbImg.alt = data.title;
      els.thumbImg.classList.remove('hidden');
      els.thumbPlaceholder.classList.add('hidden');
    } else {
      els.thumbImg.classList.add('hidden');
      els.thumbPlaceholder.classList.remove('hidden');
    }

    els.formatGrid.innerHTML = '';
    data.presets.forEach((preset) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'format-card' + (state.selectedPreset?.id === preset.id ? ' selected' : '');
      card.innerHTML = `
        <span class="format-card-label">${preset.label}</span>
        <span class="format-card-desc">${preset.description}</span>
        <span class="format-card-ext">.${preset.ext}</span>
      `;
      card.addEventListener('click', () => selectPreset(preset, card));
      els.formatGrid.appendChild(card);
    });

    els.btnDownload.disabled = !state.selectedPreset;
    els.progressWrap.classList.add('hidden');
  }

  function selectPreset(preset, cardEl) {
    state.selectedPreset = preset;
    els.formatGrid.querySelectorAll('.format-card').forEach((c) => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    els.btnDownload.disabled = false;
  }

  // --- Download ---
  async function startDownload() {
    if (!state.selectedPreset || !state.mediaData || state.downloading) return;

    state.downloading = true;
    els.btnDownload.disabled = true;
    els.progressWrap.classList.remove('hidden');
    els.progressFill.style.width = '0%';
    els.progressPercent.textContent = '0%';
    els.progressLabel.textContent = 'Starting…';

    const unsubscribe = window.api.onDownloadProgress((progress) => {
      const pct = Math.min(100, Math.round(progress.percent || 0));
      els.progressFill.style.width = `${pct}%`;
      els.progressPercent.textContent = `${pct}%`;

      const labels = {
        starting: 'Starting…',
        downloading: 'Downloading…',
        merging: 'Merging formats…',
        extracting: 'Extracting audio…',
        complete: 'Complete!',
      };
      els.progressLabel.textContent = labels[progress.status] || 'Processing…';
    });

    try {
      const result = await window.api.download({
        url: state.url,
        format: state.selectedPreset.format,
        ext: state.selectedPreset.ext,
        title: state.mediaData.title,
        outputDir: state.outputDir,
        postProcess: state.selectedPreset.postProcess,
      });

      showToast('Download complete!', 'success');
      els.progressLabel.textContent = 'Complete!';

      if (result.filePath) {
        setTimeout(() => window.api.openFolder(state.outputDir), 800);
      }
    } catch (err) {
      showToast(err.message || 'Download failed', 'error');
      els.progressWrap.classList.add('hidden');
    } finally {
      unsubscribe();
      state.downloading = false;
      els.btnDownload.disabled = false;
    }
  }

  // --- Folder ---
  async function pickFolder() {
    const folder = await window.api.selectFolder();
    if (folder) {
      state.outputDir = folder;
      els.folderPath.textContent = truncatePath(folder);
      els.settingFolderPath.textContent = folder;
    }
  }

  // --- Events ---
  els.urlInput.addEventListener('input', (e) => {
    updatePlatformBadge(e.target.value);
    if (!e.target.value.trim()) {
      els.resultPanel.classList.add('hidden');
      els.resultPanel.classList.remove('is-visible', 't-panel-reveal');
      els.emptyState.classList.remove('hidden');
    }
  });

  els.urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !els.btnAnalyze.disabled) analyzeUrl();
  });

  els.urlInput.addEventListener('paste', () => {
    setTimeout(() => updatePlatformBadge(els.urlInput.value), 50);
  });

  els.btnAnalyze.addEventListener('click', analyzeUrl);
  els.btnDownload.addEventListener('click', startDownload);
  els.btnFolder.addEventListener('click', pickFolder);
  els.btnModalFolder.addEventListener('click', pickFolder);
  els.btnSettings.addEventListener('click', openModal);
  els.btnCloseModal.addEventListener('click', closeModal);

  els.modalBackdrop.addEventListener('click', (e) => {
    if (e.target === els.modalBackdrop) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // --- Init ---
  async function init() {
    state.outputDir = await window.api.getDefaultFolder();
    els.folderPath.textContent = truncatePath(state.outputDir);
    els.settingFolderPath.textContent = state.outputDir;
    await checkYtdlp();
  }

  init();
})();
