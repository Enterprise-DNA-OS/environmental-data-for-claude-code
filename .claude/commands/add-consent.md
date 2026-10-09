---
description: Add a resource consent or EPA licence
---

Say back the record and every value before you run it, and ask for the operator's name for `--actor` once per session. If a name matches more than one record, show the candidates and ask. Never change a lab value to make it pass, never record a notification that did not happen. Nothing here sends anything. Read the dates off the consent document itself.

Run: `node scripts/envdata.mjs add-consent --site --ref --kind=resource-consent|epa-licence [--regulator] [--granted] [--expires] [--notify-within=<days>] [--report-every=<months>] [--last-report] --actor`. Add `--json` for structured results.
