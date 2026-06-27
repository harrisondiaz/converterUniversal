const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(os.tmpdir(), 'converter-universal', 'jobs');

function ensureRoot() {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
}

function jobPath(jobId) {
  return path.join(ROOT, `${jobId}.json`);
}

function jobDir(jobId) {
  return path.join(ROOT, jobId);
}

function create(jobId, data = {}) {
  ensureRoot();
  const dir = jobDir(jobId);
  fs.mkdirSync(dir, { recursive: true });
  const job = {
    status: 'starting',
    percent: 0,
    filePath: null,
    fileName: null,
    error: null,
    createdAt: Date.now(),
    ...data,
  };
  fs.writeFileSync(jobPath(jobId), JSON.stringify(job));
  return job;
}

function get(jobId) {
  const file = jobPath(jobId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function update(jobId, patch) {
  const job = get(jobId);
  if (!job) return null;
  const next = { ...job, ...patch };
  fs.writeFileSync(jobPath(jobId), JSON.stringify(next));
  return next;
}

function complete(jobId, result) {
  return update(jobId, {
    status: 'complete',
    percent: 100,
    filePath: result.filePath,
    fileName: result.filePath ? path.basename(result.filePath) : null,
  });
}

function fail(jobId, error) {
  return update(jobId, { status: 'error', error });
}

function cleanup(jobId) {
  const dir = jobDir(jobId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  const file = jobPath(jobId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

module.exports = { create, get, update, complete, fail, cleanup, jobDir, ROOT };
