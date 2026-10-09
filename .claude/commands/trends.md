---
description: What is rising: latest result against the mean of the four before it
---

Show what is moving. Lead with anything at least 50% above its recent mean at a location under a consent. One line each: location, analyte, latest, recent mean, change.

Run: `node scripts/envdata.mjs trends [--site=<site>] [--rising]`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
