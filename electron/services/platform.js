const PLATFORMS = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)/i,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\//i,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist/i,
    ],
    color: '#ff0033',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?tiktok\.com\//i,
      /(?:https?:\/\/)?(?:vm\.)?tiktok\.com\//i,
      /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^/]+\/video\//i,
    ],
    color: '#00f2ea',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels|tv|stories)\//i,
      /(?:https?:\/\/)?(?:www\.)?instagr\.am\//i,
    ],
    color: '#e1306c',
  },
  twitter: {
    id: 'twitter',
    name: 'X / Twitter',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\//i,
    ],
    color: '#1da1f2',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?facebook\.com\//i,
      /(?:https?:\/\/)?(?:www\.)?fb\.watch\//i,
    ],
    color: '#1877f2',
  },
};

function detectPlatform(url) {
  if (!url || typeof url !== 'string') {
    return { id: 'unknown', name: 'Unknown', color: '#64748b' };
  }

  const trimmed = url.trim();

  for (const platform of Object.values(PLATFORMS)) {
    for (const pattern of platform.patterns) {
      if (pattern.test(trimmed)) {
        return { id: platform.id, name: platform.name, color: platform.color };
      }
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { id: 'generic', name: 'Supported site', color: '#38bdf8' };
  }

  return { id: 'unknown', name: 'Unknown', color: '#64748b' };
}

module.exports = { detectPlatform, PLATFORMS };
