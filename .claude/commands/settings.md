---
description: Show or change the business and the QA acceptance limits
---

With no options, show the settings. To change one, say the old and new value back first.

Run: `node scripts/envdata.mjs settings [--name] [--country=AU|NZ] [--rpd-water=30] [--rpd-soil=50] [--results-within=10] [--report-lead=21] --actor=<name>`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
