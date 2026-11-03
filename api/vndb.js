// Proxy for VNDB's Kana API (api.vndb.org/kana). The upstream API takes a
// POST with a JSON filter/fields body, which an HTML form/fetch can't send
// as a plain cross-origin GET — so the filter-building happens here instead.
//
// Usage:
//   /api/vndb?search=<title>        -> { results: [...] } (light candidates, up to 10)
//   /api/vndb?id=v21905&lang=en|ja  -> { vn: {...}, release: {...} | null }
//     `lang` picks which localized release (Steam link, publisher, exact
//     release date) to report back; omit it to skip the release lookup.
const VN_FIELDS = 'title,titles.lang,titles.title,titles.latin,titles.official,titles.main,'
  + 'released,developers.name,description,extlinks.label,extlinks.url,extlinks.name,image.url';
const SEARCH_FIELDS = 'title,titles.lang,titles.title,titles.main,titles.official,released,image.url';
const RELEASE_FIELDS = 'released,official,platforms,producers.name,producers.developer,producers.publisher,'
  + 'extlinks.label,extlinks.url,extlinks.name';

async function vndb(path, body) {
  const upstream = await fetch(`https://api.vndb.org/kana/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = upstream.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // VNDB answers a malformed/out-of-range id with a plain-text 400 (e.g.
    // "Invalid 'id' filter: Invalid value.") rather than an empty JSON
    // result — surface that text instead of a generic "non-JSON" message.
    const text = (await upstream.text()).trim();
    throw Object.assign(new Error(text || 'VNDB returned a non-JSON response'), { status: upstream.ok ? 502 : upstream.status });
  }
  const data = await upstream.json();
  if (!upstream.ok) throw Object.assign(new Error(data.msg || 'VNDB rejected the query'), { status: upstream.status });
  return data;
}

// The release most worth quoting in a post: an official PC release if there
// is one (VNDB lists console ports, fan patches, etc. as separate releases
// for the same VN), else whatever's official, else just the first.
function pickRelease(results) {
  return results.find((r) => r.official && r.platforms?.includes('win'))
    || results.find((r) => r.official)
    || results[0]
    || null;
}

module.exports = async (req, res) => {
  const search = (req.query.search || '').trim();
  const id = (req.query.id || '').trim();
  const lang = (req.query.lang || '').trim();

  try {
    if (search) {
      const data = await vndb('vn', { filters: ['search', '=', search], fields: SEARCH_FIELDS, sort: 'searchrank', results: 10 });
      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ results: data.results });
      return;
    }

    if (!/^v\d+$/.test(id)) {
      res.status(400).json({ error: 'id (vNNN) or search required' });
      return;
    }

    let vn;
    try {
      vn = await vndb('vn', { filters: ['id', '=', id], fields: VN_FIELDS, results: 1 });
    } catch (err) {
      if (err.status === 400) {
        res.status(404).json({ error: 'Not found on VNDB' });
        return;
      }
      throw err;
    }
    if (!vn.results.length) {
      res.status(404).json({ error: 'Not found on VNDB' });
      return;
    }

    let release = null;
    if (lang) {
      const rel = await vndb('release', {
        filters: ['and', ['vn', '=', ['id', '=', id]], ['lang', '=', lang]],
        fields: RELEASE_FIELDS,
        sort: 'released',
        results: 50,
      });
      release = pickRelease(rel.results);
    }

    res.setHeader('Cache-Control', 's-maxage=86400');
    res.status(200).json({ vn: vn.results[0], release });
  } catch (err) {
    res.status(err.status || 502).json({ error: 'Failed to reach VNDB', detail: err.message });
  }
};
