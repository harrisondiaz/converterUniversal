const { applyCors, readJsonBody } = require('../lib/http');
const { getYtdlp } = require('../lib/ytdlp');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await readJsonBody(req);
    if (!body.url) return res.status(400).json({ error: 'URL is required' });
    res.status(200).json(await getYtdlp().getFormats(body.url));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
