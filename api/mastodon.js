const INSTANCES = [
  'mas.to',
  'fosstodon.org',
  'mastodon.social'
];

export default async function handler(req, res) {
  const { maxId, instance: pinnedInstance } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');

  const instancesToTry = pinnedInstance
    ? [pinnedInstance]
    : INSTANCES;

  for (const instance of instancesToTry) {
    try {
      const params = new URLSearchParams();

      params.set('only_media', 'true');
      params.set('limit', '40');

      if (maxId) {
        params.set('max_id', maxId);
      }

      const url =
        `https://${instance}/api/v1/timelines/public?${params.toString()}`;

      const r = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      const bodyText = await r.text();

      if (!r.ok) {
        console.error(`${instance} failed:`, bodyText);
        continue;
      }

      const statuses = JSON.parse(bodyText);

      const clips = [];
      const seenStatusIds = new Set();

      statuses.forEach((status) => {
        if (!status || !status.id) return;

        if (status.sensitive) return;

        if (seenStatusIds.has(status.id)) return;

        seenStatusIds.add(status.id);

        (status.media_attachments || []).forEach((media) => {
          if (
            media.type === 'video' ||
            media.type === 'gifv'
          ) {
            if (!media.url) return;

            clips.push({
              id: `${status.id}-${media.id}`,
              statusId: status.id,
              mediaId: media.id,
              url: media.url,
              width: media.meta?.original?.width || null,
              height: media.meta?.original?.height || null
            });
          }
        });
      });

      const lastStatus =
        statuses.length > 0
          ? statuses[statuses.length - 1]
          : null;

      const lastId =
        lastStatus?.id || null;

      res.status(200).json({
        clips,
        nextMaxId: lastId,
        previousMaxId: maxId || null,
        instance
      });

      return;

    } catch (e) {
      console.error(`${instance} errored:`, e);
      continue;
    }
  }

  res.status(502).json({
    error: 'all instances failed',
    tried: instancesToTry
  });
}
