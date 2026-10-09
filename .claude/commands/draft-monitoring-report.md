---
description: Draft the periodic monitoring report or annual return for a consent or licence
---

Write the draft for the period since the last report (or `--from`/`--to`). Show the file path and the counts. The draft leaves interpretation to the scientist: never write a conclusion the data does not support.

Run: `node scripts/envdata.mjs draft-monitoring-report --consent=<ref> [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
