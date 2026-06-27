const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { randomUUID } = require('crypto');
const { getYtdlp } = require('../lib/ytdlp');
const { detectPlatform } = require('../lib/platform');
const jobs = require('../lib/jobs');

const DEFAULT_PORT = 3847;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const app = express();
const ytdlp = getYtdlp();

const tempRoot = path.join(os.tmpdir(), 'converter-universal');

if (!fs.existsSync(tempRoot)) fs.mkdirSync(tempRoot, { recursive: true });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'src')));

app.get('/api/ytdlp/status', async (_req, res) => {
  try {
    res.json(await ytdlp.checkInstalled());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/platform', (req, res) => {
  res.json(detectPlatform(req.query.url || ''));
});

app.post('/api/formats', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    res.json(await ytdlp.getFormats(url));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/download/start', async (req, res) => {
  try {
    const { url, format, ext, title, audioFormat, mergeFormat } = req.body;
    if (!url || !format) return res.status(400).json({ error: 'Missing download options' });

    const jobId = randomUUID();
    jobs.create(jobId);
    const outputDir = jobs.jobDir(jobId);

    res.json({ jobId });

    ytdlp.download(
      { url, format, ext, title, outputDir, audioFormat, mergeFormat },
      (progress) => jobs.update(jobId, progress),
    )
      .then((result) => jobs.complete(jobId, result))
      .catch((err) => jobs.fail(jobId, err.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download/:jobId/progress', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    status: job.status,
    percent: job.percent,
    error: job.error,
    ready: job.status === 'complete',
  });
});

app.get('/api/download/:jobId/file', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
    return res.status(404).json({ error: 'File not ready' });
  }

  res.download(job.filePath, job.fileName, (err) => {
    if (err) console.error('Download send error:', err.message);
    setTimeout(() => jobs.cleanup(req.params.jobId), 5000);
  });
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n  Converter Universal — Web mode`);
    console.log(`  Open http://localhost:${port} in your browser\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Port ${port} is already in use.`);
      console.error(`  → The web server may already be running: http://localhost:${port}`);
      console.error(`  → To restart, stop the other process first:`);
      console.error(`     netstat -ano | findstr :${port}`);
      console.error(`     taskkill /PID <pid> /F`);
      console.error(`  → Or use another port:  $env:PORT=3848; npm run web\n`);
      process.exit(1);
    }
    throw err;
  });
}

startServer(PORT);
