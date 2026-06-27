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

## Deploy on Vercel

The project includes serverless API routes and a static frontend ready for Vercel.

### One-click deploy

1. Push this repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Vercel runs `npm run build:vercel` (downloads Linux yt-dlp binary)
4. Deploy

Or with the CLI:

```powershell
npm i -g vercel
vercel
```

### Vercel limitations

| Topic | Detail |
|-------|--------|
| **Timeout** | Downloads up to **60 seconds** (Pro plan). Long videos may fail on Hobby (10s). |
| **Storage** | Temp files in `/tmp` (~512 MB). Large 4K files may fail. |
| **Best for** | Short clips, audio, reels, TikToks |
| **Local use** | No limits — use `npm run web` or `npm start` on your PC |

> For heavy daily use, keep the desktop/local web mode. Vercel is best for sharing the UI publicly with light downloads.

## License

MIT — Harrison Diaz
