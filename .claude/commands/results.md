---
description: Lab results, newest first, with whether each exceeds a criterion
---

Show results as a table, newest first. Non-detects show as `<LOR`. Put any result over a criterion in its own short list above the table.

Run: `node scripts/envdata.mjs results [--site=<site>] [--location=<site/location>] [--analyte=<name>] [--since=YYYY-MM-DD]`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
