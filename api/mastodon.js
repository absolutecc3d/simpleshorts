const INSTANCES = ['mas.to', 'fosstodon.org', 'mastodon.social'];

export default async function handler(req, res) {
  const { maxId, instance: pinnedInstance } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');

  const instancesToTry = pinnedInstance ? [pinnedInstance] : INSTANCES;

  for (const instance of instancesToTry) {
    try {
      const url = `https://${instance}/api/v1/timelines/public?only_media=true&limit=40${maxId ? `&max_id=${maxId}` : ''}`;

      const r = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      const bodyText = await r.text();

      if (!r.ok) {
        console.error(`${instance} failed:`, bodyText);
        continue; // try next instance
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
      return;
    } catch (e) {
      console.error(`${instance} errored:`, e);
      continue;
    }
  }

  // every instance failed
  res.status(502).json({ error: 'all instances failed', tried: instancesToTry });
}
