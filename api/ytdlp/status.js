const { applyCors } = require('../../lib/http');
const { getYtdlp } = require('../../lib/ytdlp');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    res.status(200).json(await getYtdlp().checkInstalled());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
