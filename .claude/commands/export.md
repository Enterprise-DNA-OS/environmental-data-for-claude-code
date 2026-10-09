---
description: Back up every record to one JSON file
---

Run it and give the file path and row count.

Run: `node scripts/envdata.mjs export`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
