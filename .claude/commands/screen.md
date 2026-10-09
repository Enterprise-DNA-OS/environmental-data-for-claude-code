---
description: Screen a sample or a whole lab report against every criterion that applies
---

Screen the results. Lead with every OVER, then any "LOR above limit" (the non-detect proves nothing: ask the lab for a lower LOR), then "units differ". Say how many results passed in one line.

Run: `node scripts/envdata.mjs screen --sample=<code> | --report=<lab report number>`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
