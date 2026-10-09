---
description: Monitoring locations: bores, surface water points, discharge points, test pits
---

List the locations, grouped by site, with when each was last sampled. Flag active locations that have never been sampled.

Run: `node scripts/envdata.mjs locations [--site=<site>] [--kind=groundwater|surface-water|discharge|leachate|soil|sediment|air]`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
