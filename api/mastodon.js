const INSTANCES = [
  "mas.to",
  "fosstodon.org",
  "mastodon.social"
];

export default async function handler(req, res) {
  const { maxId, instance: pinnedInstance } = req.query;

  res.setHeader("Access-Control-Allow-Origin", "*");

  const instancesToTry = pinnedInstance
    ? [pinnedInstance]
    : INSTANCES;

  for (const instance of instancesToTry) {
    try {
      const params = new URLSearchParams();

      params.set("only_media", "true");
      params.set("limit", "40");

      if (maxId) {
        params.set("max_id", maxId);
      }

      const url =
        `https://${instance}/api/v1/timelines/public?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        }
      });

      const text = await response.text();

      if (!response.ok) {
        console.error(`${instance} returned ${response.status}:`, text);
        continue;
      }

      let statuses;

      try {
        statuses = JSON.parse(text);
      } catch (error) {
        console.error(`${instance} returned invalid JSON:`, text);
        continue;
      }

      if (!Array.isArray(statuses)) {
        console.error(`${instance} returned unexpected data`);
        continue;
      }

      const clips = [];
      const seenStatuses = new Set();
      const seenMedia = new Set();

      for (const status of statuses) {
        if (!status || !status.id) {
          continue;
        }

        if (status.sensitive) {
          continue;
        }

        if (seenStatuses.has(status.id)) {
          continue;
        }

        seenStatuses.add(status.id);

        const attachments = Array.isArray(status.media_attachments)
          ? status.media_attachments
          : [];

        for (const media of attachments) {
          if (
            media.type !== "video" &&
            media.type !== "gifv"
          ) {
            continue;
          }

          if (!media.url) {
            continue;
          }

          if (seenMedia.has(media.id)) {
            continue;
          }

          seenMedia.add(media.id);

          clips.push({
            id: `${status.id}-${media.id}`,
            statusId: status.id,
            mediaId: media.id,
            url: media.url,
            width: media.meta?.original?.width || null,
            height: media.meta?.original?.height || null
          });
        }
      }

      const lastStatus =
        statuses.length > 0
          ? statuses[statuses.length - 1]
          : null;

      const nextMaxId = lastStatus?.id || null;

      return res.status(200).json({
        clips,
        nextMaxId,
        previousMaxId: maxId || null,
        instance
      });

    } catch (error) {
      console.error(`${instance} failed:`, error);
    }
  }

  return res.status(502).json({
    error: "All Mastodon instances failed.",
    tried: instancesToTry
  });
}
```
