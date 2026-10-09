---
description: Every result over a guideline value or a consent limit
---

List exceedances: consent and licence limits first (with the notify-by date and what was done), then guideline exceedances. A guideline exceedance is a trigger for assessment, not a breach; say so.

Run: `node scripts/envdata.mjs exceedances [--site=<site>] [--kind=guideline|consent] [--since=YYYY-MM-DD]`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
