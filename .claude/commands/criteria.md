---
description: The guideline values and consent limits that apply
---

Show the criteria. For a site, say which sets apply to which kind of location and which limits come from its consents. Name the source of each set (the `source` in docs/compliance.md).

Run: `node scripts/envdata.mjs criteria [--set=<code>] [--site=<site>]`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
