const PLATFORM_PATTERNS = {
  youtube: [/youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)/i, /youtu\.be\//i, /youtube\.com\/playlist/i],
  tiktok: [/tiktok\.com\//i, /vm\.tiktok\.com\//i],
  instagram: [/instagram\.com\/(?:p|reel|reels|tv|stories)\//i, /instagr\.am\//i],
  twitter: [/(?:twitter|x)\.com\/[^/]+\/status\//i],
  facebook: [/facebook\.com\//i, /fb\.watch\//i],
};

const PLATFORM_META = {
  youtube: { id: 'youtube', name: 'YouTube', color: '#ff0033' },
  tiktok: { id: 'tiktok', name: 'TikTok', color: '#00f2ea' },
  instagram: { id: 'instagram', name: 'Instagram', color: '#e1306c' },
  twitter: { id: 'twitter', name: 'X / Twitter', color: '#1da1f2' },
  facebook: { id: 'facebook', name: 'Facebook', color: '#1877f2' },
};

function detectPlatformClient(url) {
  if (!url || typeof url !== 'string') {
    return { id: 'unknown', name: 'Unknown', color: '#64748b' };
  }
  const trimmed = url.trim();
  for (const [key, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (patterns.some((p) => p.test(trimmed))) return PLATFORM_META[key];
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { id: 'generic', name: 'Supported site', color: '#38bdf8' };
  }
  return { id: 'unknown', name: 'Unknown', color: '#64748b' };
}

function createWebApi() {
  const base = '';

  async function jsonFetch(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  return {
    isWeb: true,

    checkYtdlp: () => jsonFetch(`${base}/api/ytdlp/status`),

    detectPlatform: (url) => Promise.resolve(detectPlatformClient(url)),

    getFormats: (url) => jsonFetch(`${base}/api/formats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

    getDefaultFolder: () => Promise.resolve('Browser downloads'),

    selectFolder: () => Promise.resolve(null),

    openFolder: () => Promise.resolve(),

    download: async (options, onProgress) => {
      const { jobId } = await jsonFetch(`${base}/api/download/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      return new Promise((resolve, reject) => {
        const poll = setInterval(async () => {
          try {
            const progress = await jsonFetch(`${base}/api/download/${jobId}/progress`);
            if (onProgress) onProgress(progress);

            if (progress.status === 'complete') {
              clearInterval(poll);
              const link = document.createElement('a');
              link.href = `${base}/api/download/${jobId}/file`;
              link.download = '';
              document.body.appendChild(link);
              link.click();
              link.remove();
              resolve({ filePath: true, outputDir: 'browser' });
            } else if (progress.status === 'error') {
              clearInterval(poll);
              reject(new Error(progress.error || 'Download failed'));
            }
          } catch (err) {
            clearInterval(poll);
            reject(err);
          }
        }, 800);
      });
    },

    onDownloadProgress: (callback) => {
      return () => {};
    },
  };
}

function createElectronApi() {
  return {
    isWeb: false,
    ...window.api,
    download: (options) => {
      return window.api.download({
        ...options,
        audioFormat: options.audioFormat || options.postProcess,
        mergeFormat: options.mergeFormat,
      });
    },
  };
}

window.createApi = function createApi() {
  if (window.api && typeof window.api.checkYtdlp === 'function') {
    return createElectronApi();
  }
  return createWebApi();
};
