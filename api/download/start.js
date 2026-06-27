const { randomUUID } = require('crypto');
const { waitUntil } = require('@vercel/functions');
const { applyCors, readJsonBody } = require('../../lib/http');
const { getYtdlp } = require('../../lib/ytdlp');
const jobs = require('../../lib/jobs');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await readJsonBody(req);
    const { url, format, ext, title, audioFormat, mergeFormat } = body;
    if (!url || !format) return res.status(400).json({ error: 'Missing download options' });

    const jobId = randomUUID();
    jobs.create(jobId);
    const outputDir = jobs.jobDir(jobId);

    res.status(200).json({ jobId });

    waitUntil(
      getYtdlp().download(
        { url, format, ext, title, outputDir, audioFormat, mergeFormat },
        (progress) => jobs.update(jobId, progress),
      )
        .then((result) => jobs.complete(jobId, result))
        .catch((err) => jobs.fail(jobId, err.message)),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
