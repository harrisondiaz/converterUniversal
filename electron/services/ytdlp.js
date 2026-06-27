const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

class YtDlpService {
  constructor() {
    this.binary = this.resolveBinary();
    this.activeProcess = null;
  }

  resolveBinary() {
    const candidates = process.platform === 'win32'
      ? ['yt-dlp.exe', 'yt-dlp']
      : ['yt-dlp', 'yt-dlp.exe'];

    return candidates[0];
  }

  async checkInstalled() {
    try {
      const { stdout } = await execFileAsync(this.binary, ['--version'], { timeout: 8000 });
      const version = stdout.trim().split('\n')[0];
      return { installed: true, version, binary: this.binary };
    } catch {
      return {
        installed: false,
        version: null,
        binary: this.binary,
        installHint: process.platform === 'win32'
          ? 'winget install yt-dlp  OR  pip install yt-dlp'
          : 'pip install yt-dlp  OR  brew install yt-dlp',
      };
    }
  }

  async run(args, onProgress) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.binary, args, { shell: process.platform === 'win32' });
      this.activeProcess = proc;

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;

        if (onProgress) {
          const progress = this.parseProgress(text);
          if (progress) onProgress(progress);
        }
      });

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;

        if (onProgress) {
          const progress = this.parseProgress(text);
          if (progress) onProgress(progress);
        }
      });

      proc.on('close', (code) => {
        this.activeProcess = null;
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(stderr.trim() || stdout.trim() || `yt-dlp exited with code ${code}`));
      });

      proc.on('error', (err) => {
        this.activeProcess = null;
        if (err.code === 'ENOENT') {
          reject(new Error('yt-dlp is not installed or not in PATH. Install it and restart the app.'));
        } else {
          reject(err);
        }
      });
    });
  }

  parseProgress(text) {
    const match = text.match(/\[download\]\s+([\d.]+)%/);
    if (match) {
      return { percent: parseFloat(match[1]), status: 'downloading' };
    }

    const mergeMatch = text.match(/\[Merger\]|Merging formats/);
    if (mergeMatch) {
      return { percent: 99, status: 'merging' };
    }

    const extractMatch = text.match(/\[ExtractAudio\]|Extracting audio/);
    if (extractMatch) {
      return { percent: 95, status: 'extracting' };
    }

    return null;
  }

  async getInfo(url) {
    const args = ['--dump-single-json', '--no-playlist', '--no-warnings', url];
    const { stdout } = await this.run(args);
    const data = JSON.parse(stdout);
    return {
      title: data.title || data.fulltitle || 'Untitled',
      thumbnail: data.thumbnail,
      duration: data.duration,
      uploader: data.uploader || data.channel,
      webpage_url: data.webpage_url || url,
    };
  }

  async getFormats(url) {
    const args = ['--dump-single-json', '--no-playlist', '--no-warnings', url];
    const { stdout } = await this.run(args);
    const data = JSON.parse(stdout);

    const formats = (data.formats || []).map((f) => ({
      format_id: f.format_id,
      ext: f.ext,
      resolution: f.resolution || (f.height ? `${f.height}p` : 'audio'),
      fps: f.fps,
      vcodec: f.vcodec,
      acodec: f.acodec,
      filesize: f.filesize || f.filesize_approx,
      format_note: f.format_note,
      has_video: f.vcodec && f.vcodec !== 'none',
      has_audio: f.acodec && f.acodec !== 'none',
    }));

    const presets = this.buildPresets(formats, data);

    return {
      title: data.title || data.fulltitle || 'Untitled',
      thumbnail: data.thumbnail,
      duration: data.duration,
      uploader: data.uploader || data.channel,
      formats,
      presets,
    };
  }

  buildPresets(formats, data) {
    const presets = [];

    const videoFormats = formats.filter((f) => f.has_video && f.resolution !== 'audio');
    const audioFormats = formats.filter((f) => f.has_audio && !f.has_video);

    const bestVideo = videoFormats
      .filter((f) => f.has_audio)
      .sort((a, b) => (parseInt(b.resolution) || 0) - (parseInt(a.resolution) || 0))[0];

    const bestVideoOnly = videoFormats
      .sort((a, b) => (parseInt(b.resolution) || 0) - (parseInt(a.resolution) || 0))[0];

    const bestAudio = audioFormats
      .sort((a, b) => (b.filesize || 0) - (a.filesize || 0))[0];

    presets.push({
      id: 'best',
      label: 'Best quality',
      description: 'Highest available video + audio',
      format: 'bestvideo+bestaudio/best',
      ext: 'mp4',
      icon: 'video',
    });

    if (bestVideo) {
      presets.push({
        id: 'best-merged',
        label: `${bestVideo.resolution} (merged)`,
        description: 'Best single-file video',
        format: bestVideo.format_id,
        ext: bestVideo.ext || 'mp4',
        icon: 'video',
      });
    }

    const resolutions = [1080, 720, 480, 360];
    for (const res of resolutions) {
      const match = videoFormats.find((f) => parseInt(f.resolution) === res);
      if (match) {
        presets.push({
          id: `video-${res}`,
          label: `${res}p video`,
          description: match.has_audio ? 'Video with audio' : 'Video (audio merged if needed)',
          format: match.has_audio ? match.format_id : `bestvideo[height<=${res}]+bestaudio/best[height<=${res}]`,
          ext: 'mp4',
          icon: 'video',
        });
      }
    }

    presets.push({
      id: 'audio-best',
      label: 'Audio only (best)',
      description: 'Best audio quality',
      format: 'bestaudio/best',
      ext: 'm4a',
      icon: 'audio',
    });

    presets.push({
      id: 'audio-mp3',
      label: 'MP3 audio',
      description: 'Convert to MP3',
      format: 'bestaudio/best',
      ext: 'mp3',
      icon: 'audio',
      postProcess: 'mp3',
    });

    return presets;
  }

  async download(options, onProgress) {
    const { url, format, ext, outputDir, title, postProcess } = options;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const safeTitle = (title || 'download')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);

    const outputTemplate = path.join(outputDir, `${safeTitle}.%(ext)s`);

    const args = [
      url,
      '-f', format,
      '--no-playlist',
      '--no-warnings',
      '--newline',
      '--progress',
      '-o', outputTemplate,
    ];

    if (postProcess === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else if (ext === 'mp4') {
      args.push('--merge-output-format', 'mp4');
    }

    if (onProgress) onProgress({ percent: 0, status: 'starting' });

    const { stdout, stderr } = await this.run(args, onProgress);

    const outputMatch = (stdout + stderr).match(/\[download\] Destination: (.+)/)
      || (stdout + stderr).match(/\[Merger\] Merging formats into "(.+)"/)
      || (stdout + stderr).match(/\[ExtractAudio\] Destination: (.+)/);

    let filePath = outputMatch ? outputMatch[1].trim() : null;

    if (!filePath) {
      const files = fs.readdirSync(outputDir)
        .filter((f) => f.startsWith(safeTitle.slice(0, 30)))
        .map((f) => ({ name: f, time: fs.statSync(path.join(outputDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);
      if (files.length) filePath = path.join(outputDir, files[0].name);
    }

    if (onProgress) onProgress({ percent: 100, status: 'complete' });

    return { filePath, outputDir };
  }

  cancel() {
    if (this.activeProcess) {
      this.activeProcess.kill();
      this.activeProcess = null;
    }
  }
}

module.exports = { YtDlpService };
