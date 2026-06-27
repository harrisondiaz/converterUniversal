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
    const localBin = path.join(__dirname, '..', '..', 'bin',
      process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

    if (fs.existsSync(localBin)) return localBin;

    return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  }

  getInstallHint() {
    if (process.platform === 'win32') {
      return 'Run: npm run setup   (downloads yt-dlp to bin/)';
    }
    return 'Run: npm run setup   OR   pip install yt-dlp';
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
        installHint: this.getInstallHint(),
      };
    }
  }

  async run(args, onProgress) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.binary, args, {
        shell: false,
        windowsHide: true,
      });
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
    const audioOnlyFormats = formats.filter((f) => f.has_audio && !f.has_video);

    const bestVideo = videoFormats
      .filter((f) => f.has_audio)
      .sort((a, b) => (parseInt(b.resolution) || 0) - (parseInt(a.resolution) || 0))[0];

    const bestVideoOnly = videoFormats
      .sort((a, b) => (parseInt(b.resolution) || 0) - (parseInt(a.resolution) || 0))[0];

    const bestAudio = audioOnlyFormats
      .sort((a, b) => (b.filesize || 0) - (a.filesize || 0))[0];

    presets.push({
      id: 'best',
      label: 'Best quality (MP4)',
      description: 'Highest available video + audio',
      format: 'bestvideo+bestaudio/best',
      ext: 'mp4',
      icon: 'video',
      category: 'video',
      mergeFormat: 'mp4',
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
          label: `${res}p MP4`,
          description: match.has_audio ? 'Video with audio' : 'Video (audio merged if needed)',
          format: match.has_audio ? match.format_id : `bestvideo[height<=${res}]+bestaudio/best[height<=${res}]`,
          ext: 'mp4',
          icon: 'video',
          category: 'video',
          mergeFormat: 'mp4',
        });
      }
    }

    presets.push({
      id: 'audio-best',
      label: 'Best audio (native)',
      description: 'Original audio without conversion',
      format: 'bestaudio/best',
      ext: 'm4a',
      icon: 'audio',
      category: 'audio',
    });

    presets.push({
      id: 'audio-mp3',
      label: 'MP3',
      description: 'Most compatible audio format',
      format: 'bestaudio/best',
      ext: 'mp3',
      icon: 'audio',
      category: 'audio',
      audioFormat: 'mp3',
    });

    const audioExportFormats = [
      { id: 'audio-wav', label: 'WAV', ext: 'wav', desc: 'Uncompressed, highest fidelity' },
      { id: 'audio-flac', label: 'FLAC', ext: 'flac', desc: 'Lossless compressed audio' },
      { id: 'audio-m4a', label: 'M4A / AAC', ext: 'm4a', desc: 'Apple & streaming quality' },
      { id: 'audio-aac', label: 'AAC', ext: 'aac', desc: 'High quality, small file size' },
      { id: 'audio-ogg', label: 'OGG Vorbis', ext: 'ogg', desc: 'Open-source audio' },
      { id: 'audio-opus', label: 'Opus', ext: 'opus', desc: 'Modern, efficient codec' },
    ];

    for (const af of audioExportFormats) {
      presets.push({
        id: af.id,
        label: af.label,
        description: af.desc,
        format: 'bestaudio/best',
        ext: af.ext,
        icon: 'audio',
        category: 'audio',
        audioFormat: af.ext === 'm4a' ? 'm4a' : af.ext,
      });
    }

    presets.push({
      id: 'video-webm',
      label: 'WebM (best)',
      description: 'Open web video format',
      format: 'bestvideo+bestaudio/best',
      ext: 'webm',
      icon: 'video',
      category: 'video',
      mergeFormat: 'webm',
    });

    presets.push({
      id: 'video-mkv',
      label: 'MKV (best)',
      description: 'Matroska container, flexible codecs',
      format: 'bestvideo+bestaudio/best',
      ext: 'mkv',
      icon: 'video',
      category: 'video',
      mergeFormat: 'mkv',
    });

    return presets.map((p) => ({
      ...p,
      category: p.category || (p.icon === 'audio' ? 'audio' : 'video'),
    }));
  }

  async download(options, onProgress) {
    const { url, format, ext, outputDir, title, audioFormat, mergeFormat, postProcess } = options;
    const audioFmt = audioFormat || postProcess;

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

    if (audioFmt) {
      args.push('-x', '--audio-format', audioFmt, '--audio-quality', '0');
    } else if (mergeFormat) {
      args.push('--merge-output-format', mergeFormat);
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
