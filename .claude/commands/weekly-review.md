---
description: The Monday monitoring review, written from the CLI output
---

Write it in six parts: breached, exceedances in the last 30 days, rounds due in 14 days, data quality, reports and renewals, what is rising. One line each, site named.

Run: `node scripts/envdata.mjs weekly-review`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
