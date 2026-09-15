// Proxy for jisho.org word search — the API sends no CORS headers, so the
// browser can't call it directly. Usage: /api/jisho?keyword=食べる
module.exports = async (req, res) => {
  const keyword = (req.query.keyword || '').trim();
  if (!keyword) {
    res.status(400).json({ error: 'keyword required' });
    return;
  }
  try {
    const upstream = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // jisho.org sometimes answers non-JSON (e.g. a Cloudflare challenge
      // page) when it doesn't like the caller — surface that instead of
      // crashing on the JSON parse.
      res.status(502).json({ error: 'Jisho returned a non-JSON response', status: upstream.status });
      return;
    }
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.status(upstream.status).json(await upstream.json());
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Jisho', detail: err.message });
  }
};
