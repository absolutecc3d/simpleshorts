const INSTANCES = ['mastodon.social', 'mas.to', 'fosstodon.org'];

export default async function handler(req, res) {
  const { maxId } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // rotate instance based on whether we're paginating or not, for variety
    const instance = INSTANCES[Math.floor(Math.random() * INSTANCES.length)];
    const url = `https://${instance}/api/v1/timelines/public?only_media=true&limit=40${maxId ? `&max_id=${maxId}` : ''}`;

    const r = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    const bodyText = await r.text();

    if (!r.ok) {
      res.status(r.status).json({ error: 'mastodon fetch failed', detail: bodyText, instance });
      return;
    }

    const statuses = JSON.parse(bodyText);

    const clips = [];
    statuses.forEach((status) => {
      if (status.sensitive) return;
      (status.media_attachments || []).forEach((media) => {
        if (media.type === 'video' || media.type === 'gifv') {
          clips.push({
            id: status.id,
            url: media.url,
            width: media.meta?.original?.width,
            height: media.meta?.original?.height
          });
        }
      });
    });

    const lastId = statuses.length ? statuses[statuses.length - 1].id : null;

    res.status(200).json({ clips, nextMaxId: lastId, instance });
  } catch (e) {
    res.status(500).json({ error: 'fetch failed', detail: String(e) });
  }
}
