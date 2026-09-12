export default async function handler(req, res) {
  const { action, key, categoryId, offset } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    if (action === 'generate_key') {
      const keyRes = await fetch('https://developers.medal.tv/v1/generate_public_key', {
        method: 'GET'
      });
      const bodyText = await keyRes.text();

      if (!keyRes.ok) {
        res.status(keyRes.status).json({ error: 'key generation failed', detail: bodyText });
        return;
      }

      let publicKey;
      try {
        const parsed = JSON.parse(bodyText);
        publicKey = parsed.publicKey || parsed.data || parsed.key;
      } catch {
        const match = bodyText.match(/pub_[A-Za-z0-9]+/);
        publicKey = match ? match[0] : bodyText.replace(/"/g, '').trim();
      }

      res.status(200).json({ publicKey, raw: bodyText });
      return;
    }

    if (action === 'trending') {
      if (!key) {
        res.status(400).json({ error: 'missing key param' });
        return;
      }
      const cat = categoryId || '0';
      const off = offset || '0';
      const url = `https://developers.medal.tv/v1/trending?categoryId=${cat}&limit=10&offset=${off}`;

      const trendingRes = await fetch(url, {
        headers: { 'Authorization': key }
      });
      const bodyText = await trendingRes.text();

      if (!trendingRes.ok) {
        res.status(trendingRes.status).json({ error: 'trending fetch failed', detail: bodyText });
        return;
      }

      const data = JSON.parse(bodyText);
      res.status(200).json(data);
      return;
    }

    res.status(400).json({ error: 'unknown action, expected generate_key or trending' });
  } catch (e) {
    res.status(500).json({ error: 'fetch failed', detail: String(e) });
  }
}
