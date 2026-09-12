export default async function handler(req, res) {
  const { subs, after } = req.query;

  if (!subs) {
    res.status(400).json({ error: 'missing subs param' });
    return;
  }

  const url = `https://old.reddit.com/r/${subs}/hot.json?limit=25${after ? `&after=${after}` : ''}`;

  try {
    const redditRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!redditRes.ok) {
      res.status(redditRes.status).json({ error: `reddit responded ${redditRes.status}` });
      return;
    }

    const data = await redditRes.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'fetch failed', detail: String(e) });
  }
}
