# Converter Universal

A desktop app to download videos and audio from **YouTube**, **TikTok**, **Instagram**, and 300+ other sites — with automatic platform detection and format selection.

![Converter Universal](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt--dlp-powered-red?style=flat)

## Features

- **Auto-detect platform** from any pasted URL (YouTube, TikTok, Instagram, X, Facebook, and more)
- **Multiple format presets** — best quality, 1080p/720p/480p, audio-only, MP3
- **Modern UI** with smooth modal transitions and download progress
- **Choose save folder** or use the default `Downloads/ConverterUniversal`

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (required for downloads)
- [ffmpeg](https://ffmpeg.org/) (recommended for merging video + audio)

### Install yt-dlp (Windows — no winget/pip needed)

```powershell
npm run setup
```

This downloads `yt-dlp.exe` into the `bin/` folder. The app finds it automatically.

Alternative (if you have winget or pip):

```powershell
winget install yt-dlp
# OR
pip install yt-dlp
```

### Install ffmpeg (Windows)

```powershell
winget install ffmpeg
```

## Quick start

### Desktop app (Electron)

```powershell
npm install
npm start
```

### Web mode (browser)

Runs a local server — open it in Chrome, Firefox, Edge, etc.

```powershell
npm install
npm run web
```

Then open **http://localhost:3847** in your browser.

> **Note:** Web mode still needs `yt-dlp` and `ffmpeg` installed on the **server machine** (your PC). Downloads are processed locally and sent to your browser — nothing runs in the cloud unless you deploy the server elsewhere.

## Supported formats

| Type | Formats |
|------|---------|
| **Video** | MP4, WebM, MKV — best quality or 1080p / 720p / 480p / 360p |
| **Audio** | MP3, WAV, FLAC, M4A/AAC, OGG, Opus — plus native best audio |

All audio conversions use ffmpeg via yt-dlp. WAV and FLAC give the highest quality; MP3 is the most compatible.

## Usage

1. Paste a video link from YouTube, TikTok, Instagram, or any supported site
2. The platform is detected automatically
3. Click **Analyze** to load available formats
4. Pick a format and click **Download**

## Supported platforms

| Platform   | Example URL                                      |
|------------|--------------------------------------------------|
| YouTube    | `https://youtube.com/watch?v=…`                  |
| TikTok     | `https://tiktok.com/@user/video/…`               |
| Instagram  | `https://instagram.com/reel/…`                   |
| X/Twitter  | `https://x.com/user/status/…`                    |
| Facebook   | `https://facebook.com/watch/?v=…`                |
| +300 more  | Any URL supported by [yt-dlp](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) |

## Project structure

```
converterUniversal/
├── electron/
│   ├── main.js           # Electron main process
│   ├── preload.js        # Secure IPC bridge
│   └── services/
│       ├── platform.js   # URL platform detection
│       └── ytdlp.js      # yt-dlp wrapper
├── src/
│   ├── index.html
│   ├── js/app.js
│   └── styles/
└── package.json
```

## Deploy online (cloud)

**Vercel does not work** for this app — yt-dlp and ffmpeg need a real server, not serverless functions.

### Recommended: Railway (free tier)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select `converterUniversal` — Railway detects the `Dockerfile` automatically
3. Deploy — you get a URL like `https://converter-universal.up.railway.app`

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/harrisondiaz/converterUniversal)

### Alternative: Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect the GitHub repo
3. Set **Runtime: Docker** — uses the included `render.yaml`
4. Deploy

### Alternative: Docker anywhere

```bash
docker build -t converter-universal .
docker run -p 8080:8080 converter-universal
# Open http://localhost:8080
```

### Comparison

| Platform | Works? | Why |
|----------|--------|-----|
| **Your PC** (`npm run web`) | ✅ Best | No limits, full yt-dlp + ffmpeg |
| **Desktop** (`npm start`) | ✅ Best | Choose save folder |
| **Railway / Render / Docker** | ✅ Good | Real Linux server with yt-dlp |
| **Vercel** | ❌ No | Serverless — cannot run yt-dlp binaries |

## Deploy on Vercel (not recommended)

Vercel serverless functions **cannot reliably run yt-dlp**. The UI may deploy, but downloads will fail. Use Railway or Render instead.

<details>
<summary>Legacy Vercel setup (experimental)</summary>

```powershell
npm i -g vercel
vercel
```

Limitations: 10–60s timeout, no persistent binaries, downloads often fail.

</details>

## License

MIT — Harrison Diaz
