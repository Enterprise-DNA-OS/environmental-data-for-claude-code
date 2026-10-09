---
description: Field duplicate RPDs against the acceptance limit
---

Show every duplicate pair. Lead with the ones over the acceptance limit and say which results in that round need a qualifier.

Run: `node scripts/envdata.mjs duplicates`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
