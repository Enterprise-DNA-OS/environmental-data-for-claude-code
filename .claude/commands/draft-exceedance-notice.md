---
description: Draft the notice to the regulator for un-actioned exceedances on a consent or licence
---

Write the draft and show the file path and the table it contains. For a NSW licence, remind the operator that a pollution incident goes to the EPA Environment Line by phone first (POEO Act s148). After a person sends it, record it with `/notify`.

Run: `node scripts/envdata.mjs draft-exceedance-notice --consent=<ref>`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
