---
description: Consents and licences: report due, expiry, renewal date and exceedances
---

Show every consent and licence. Lead with an overdue report, then a renewal past its lodge-by date, then exceedances not yet actioned.

Run: `node scripts/envdata.mjs consents`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
