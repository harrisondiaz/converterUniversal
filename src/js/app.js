(() => {
  const api = window.createApi();
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
    ytdlpStatus: $('#ytdlp-status'),
    emptyState: $('#empty-state'),
    resultPanel: $('#result-panel'),
    formatGrid: $('#format-grid'),
    formatTabs: $('#format-tabs'),
    folderPicker: $('#folder-picker'),
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
    formatFilter: 'all',
  };

  function openModal() {
    const backdrop = els.modalBackdrop;
    backdrop.classList.remove('is-resting', 'is-closing');
    backdrop.setAttribute('aria-hidden', 'false');
    void backdrop.offsetWidth;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => backdrop.classList.add('is-open'));
    });
  }

  function closeModal() {
    const backdrop = els.modalBackdrop;
    if (!backdrop.classList.contains('is-open')) return;

    backdrop.classList.remove('is-open');
    backdrop.classList.add('is-closing');
    backdrop.setAttribute('aria-hidden', 'true');

    const closeDur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--modal-close-dur')) || 180;
    setTimeout(() => {
      backdrop.classList.remove('is-closing');
      backdrop.classList.add('is-resting');
    }, closeDur);
  }

  let toastTimer;
  function showToast(message, type = 'info') {
    els.toast.textContent = message;
    els.toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3500);
  }

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

  function applyFormatFilter() {
    els.formatGrid.querySelectorAll('.format-card').forEach((card) => {
      const cat = card.dataset.category;
      const show = state.formatFilter === 'all' || cat === state.formatFilter;
      card.classList.toggle('hidden-filter', !show);
    });
  }

  async function updatePlatformBadge(url) {
    if (!url.trim()) {
      els.platformBadge.classList.add('hidden');
      els.btnAnalyze.disabled = true;
      return;
    }
    const platform = await api.detectPlatform(url);
    state.platform = platform;
    els.platformBadge.classList.remove('hidden');
    els.platformBadge.style.setProperty('--chip-color', platform.color);
    els.platformBadge.querySelector('.platform-dot').style.background = platform.color;
    els.platformBadge.querySelector('.platform-name').textContent = platform.name;
    const isValid = platform.id !== 'unknown' && /^https?:\/\//i.test(url.trim());
    els.btnAnalyze.disabled = !isValid || state.analyzing;
  }

  async function checkYtdlp() {
    const result = await api.checkYtdlp();
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
      const data = await api.getFormats(url);
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
    requestAnimationFrame(() => requestAnimationFrame(() => els.resultPanel.classList.add('is-visible')));

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
      card.dataset.category = preset.category || 'video';
      card.className = 'format-card' + (state.selectedPreset?.id === preset.id ? ' selected' : '');
      card.innerHTML = `
        <span class="format-card-label">${preset.label}</span>
        <span class="format-card-desc">${preset.description}</span>
        <span class="format-card-ext">.${preset.ext}</span>
      `;
      card.addEventListener('click', () => selectPreset(preset, card));
      els.formatGrid.appendChild(card);
    });

    applyFormatFilter();
    els.btnDownload.disabled = !state.selectedPreset;
    els.progressWrap.classList.add('hidden');
  }

  function selectPreset(preset, cardEl) {
    state.selectedPreset = preset;
    els.formatGrid.querySelectorAll('.format-card').forEach((c) => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    els.btnDownload.disabled = false;
  }

  function updateProgress(progress) {
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
  }

  async function startDownload() {
    if (!state.selectedPreset || !state.mediaData || state.downloading) return;

    state.downloading = true;
    els.btnDownload.disabled = true;
    els.progressWrap.classList.remove('hidden');
    els.progressFill.style.width = '0%';
    els.progressPercent.textContent = '0%';
    els.progressLabel.textContent = 'Starting…';

    const options = {
      url: state.url,
      format: state.selectedPreset.format,
      ext: state.selectedPreset.ext,
      title: state.mediaData.title,
      outputDir: state.outputDir,
      audioFormat: state.selectedPreset.audioFormat,
      mergeFormat: state.selectedPreset.mergeFormat,
    };

    const unsubscribe = api.isWeb
      ? null
      : api.onDownloadProgress((progress) => updateProgress(progress));

    try {
      if (api.isWeb) {
        await api.download(options, updateProgress);
      } else {
        await api.download(options);
      }
      showToast('Download complete!', 'success');
      els.progressLabel.textContent = 'Complete!';
      if (!api.isWeb) {
        setTimeout(() => api.openFolder(state.outputDir), 800);
      }
    } catch (err) {
      showToast(err.message || 'Download failed', 'error');
      els.progressWrap.classList.add('hidden');
    } finally {
      if (unsubscribe) unsubscribe();
      state.downloading = false;
      els.btnDownload.disabled = false;
    }
  }

  async function pickFolder() {
    const folder = await api.selectFolder();
    if (folder) {
      state.outputDir = folder;
      els.folderPath.textContent = truncatePath(folder);
      els.settingFolderPath.textContent = folder;
    }
  }

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

  els.formatTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.format-tab');
    if (!tab) return;
    els.formatTabs.querySelectorAll('.format-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.formatFilter = tab.dataset.filter;
    applyFormatFilter();
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

  async function init() {
    if (api.isWeb) {
      els.folderPicker.classList.add('hidden');
      document.querySelector('.setting-row:nth-of-type(2)')?.classList.add('hidden');
      state.outputDir = 'browser';
      els.settingFolderPath.textContent = 'Files download to your browser folder';
    } else {
      state.outputDir = await api.getDefaultFolder();
      els.folderPath.textContent = truncatePath(state.outputDir);
      els.settingFolderPath.textContent = state.outputDir;
    }
    await checkYtdlp();
  }

  init();
})();
