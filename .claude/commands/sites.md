---
description: Every site with its locations, consents, last sampling date and breached findings
---

List every site. Lead with the sites that have breached findings, then say when each was last sampled.

Run: `node scripts/envdata.mjs sites`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
