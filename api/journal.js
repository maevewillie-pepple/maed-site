const SUBSTACK_URL = 'https://maedjournal.substack.com/api/v1/posts?limit=20&offset=0';

function classify(post) {
  const t = String(post.title || '').toLowerCase();
  if (t.includes('weekly brief')) return 'weekly-brief';
  if (t.includes('liability') || t.includes('under the hood')) return 'under-the-hood';
  if (
    t.includes('built a product') ||
    t.includes('measured') ||
    t.includes('field notes') ||
    t.includes('shipping') ||
    t.includes('analytics')
  ) {
    return 'field-notes';
  }
  if (t.includes('toolkit') || t.includes('checklist') || t.includes('framework')) return 'toolkit';
  if (t.includes('perspective') || t.includes('essay')) return 'perspective';
  return 'general';
}

function normalize(posts) {
  return (Array.isArray(posts) ? posts : [])
    .filter((p) => p && p.is_published && p.slug !== 'coming-soon')
    .map((p) => ({
      title: p.title || 'Untitled',
      subtitle: p.subtitle || p.description || '',
      url: p.canonical_url || `https://maedjournal.substack.com/p/${p.slug}`,
      cover: p.cover_image || null,
      date: p.post_date || null,
      slug: p.slug || '',
      section: classify(p),
    }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const upstream = await fetch(SUBSTACK_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'maed.ai-journal-feed/1.0',
      },
    });

    if (!upstream.ok) {
      throw new Error(`Substack responded ${upstream.status}`);
    }

    const raw = await upstream.json();
    const posts = normalize(raw);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ source: 'substack', fetchedAt: new Date().toISOString(), posts }));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: 'Unable to fetch Substack posts',
        detail: String(err && err.message ? err.message : err),
      })
    );
  }
};
