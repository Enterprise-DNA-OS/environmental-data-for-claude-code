---
description: Monitoring rounds by due date, overdue first
---

List rounds due. Overdue rounds under a consent come first: they are a breach of the monitoring condition. Group the rest by week.

Run: `node scripts/envdata.mjs due [--days=30]`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
