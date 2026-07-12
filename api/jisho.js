// Proxy for jisho.org word search — the API sends no CORS headers, so the
// browser can't call it directly. Usage: /api/jisho?keyword=食べる
module.exports = async (req, res) => {
  const keyword = (req.query.keyword || '').trim();
  if (!keyword) {
    res.status(400).json({ error: 'keyword required' });
    return;
  }
  const upstream = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`);
  res.setHeader('Cache-Control', 's-maxage=86400');
  res.status(upstream.status).json(await upstream.json());
};
