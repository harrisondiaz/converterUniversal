const { applyCors } = require('../../lib/http');
const { detectPlatform } = require('../../lib/platform');

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  res.status(200).json(detectPlatform(req.query.url || ''));
};
