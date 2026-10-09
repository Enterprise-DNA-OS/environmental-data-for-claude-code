---
description: Record a sample, a field duplicate or a blank
---

Say back the record and every value before you run it, and ask for the operator's name for `--actor` once per session. If a name matches more than one record, show the candidates and ask. Never change a lab value to make it pass, never record a notification that did not happen. Nothing here sends anything.

Run: `node scripts/envdata.mjs sample --site --code --date --matrix [--location] [--type=normal|field-duplicate|trip-blank|rinsate-blank] [--parent] [--depth] [--sampler] [--lab] [--report] [--submitted] --actor`. Add `--json` for structured results.
