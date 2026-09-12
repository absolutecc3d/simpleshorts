const INSTANCES = [
  "mas.to",
  "fosstodon.org",
  "mastodon.social"
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {
    const maxId = req.query?.maxId || null;
    const pinnedInstance = req.query?.instance || null;

    const instancesToTry = pinnedInstance
      ? [pinnedInstance]
      : INSTANCES;

    for (const instance of instancesToTry) {
      try {
        const params = new URLSearchParams({
          only_media: "true",
          limit: "40"
        });

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
          console.error(
            `Mastodon ${instance} returned ${response.status}:`,
            text
          );
          continue;
        }

        let statuses;

        try {
          statuses = JSON.parse(text);
        } catch (error) {
          console.error(
            `Invalid JSON from ${instance}:`,
            text
          );
          continue;
        }

        if (!Array.isArray(statuses)) {
          console.error(
            `Unexpected response from ${instance}:`,
            statuses
          );
          continue;
        }

        const clips = [];
        const seen = new Set();

        for (const status of statuses) {
          if (!status || !status.id) {
            continue;
          }

          if (status.sensitive) {
            continue;
          }

          if (maxId && status.id === maxId) {
            continue;
          }

          const attachments = Array.isArray(
            status.media_attachments
          )
            ? status.media_attachments
            : [];

          for (const media of attachments) {
            if (
              media.type !== "video" &&
              media.type !== "gifv"
            ) {
              continue;
            }

            if (!media.url || !media.id) {
              continue;
            }

            const id = `${status.id}-${media.id}`;

            if (seen.has(id)) {
              continue;
            }

            seen.add(id);

            clips.push({
              id,
              statusId: status.id,
              mediaId: media.id,
              url: media.url,
              width:
                media.meta?.original?.width || null,
              height:
                media.meta?.original?.height || null
            });
          }
        }

        const lastStatus =
          statuses.length > 0
            ? statuses[statuses.length - 1]
            : null;

        return res.status(200).json({
          clips,
          nextMaxId: lastStatus?.id || null,
          instance
        });
      } catch (error) {
        console.error(
          `Failed to fetch ${instance}:`,
          error
        );
      }
    }

    return res.status(502).json({
      error: "All Mastodon instances failed.",
      instances: instancesToTry
    });
  } catch (error) {
    console.error("API crashed:", error);

    return res.status(500).json({
      error: "API crashed.",
      message: error?.message || String(error)
    });
  }
}
