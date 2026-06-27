const { applyCors } = require('../../../lib/http');
const jobs = require('../../../lib/jobs');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  const { jobId } = req.query;
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.status(200).json({
    status: job.status,
    percent: job.percent,
    error: job.error,
    ready: job.status === 'complete',
  });
};
