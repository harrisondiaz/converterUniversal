const fs = require('fs');
const path = require('path');
const { applyCors } = require('../../../lib/http');
const jobs = require('../../../lib/jobs');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  const { jobId } = req.query;
  const job = jobs.get(jobId);
  if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
    return res.status(404).json({ error: 'File not ready' });
  }

  const stat = fs.statSync(job.filePath);
  const fileName = job.fileName || path.basename(job.filePath);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Content-Length', stat.size);

  fs.createReadStream(job.filePath).pipe(res);

  res.on('finish', () => {
    setTimeout(() => jobs.cleanup(jobId), 5000);
  });
};
