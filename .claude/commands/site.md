---
description: One site in full: locations, consents, criteria applied, monitoring rounds, findings and history
---

Show one site. Open with its breached findings, then the monitoring rounds by due date, then consents. Keep history to the last five entries unless asked.

Run: `node scripts/envdata.mjs site --site=<code or name>`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
