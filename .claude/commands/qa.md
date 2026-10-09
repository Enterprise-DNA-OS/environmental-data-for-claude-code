---
description: Data quality in one list: duplicates, blanks, holding times, LORs above criteria and results still at the lab
---

Write the QA summary a report needs: one line per finding, grouped by rule, then one line on what that means for the data.

Run: `node scripts/envdata.mjs qa`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
