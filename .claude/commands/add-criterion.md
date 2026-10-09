---
description: Add a value to a guideline set
---

Say back the record and every value before you run it, and ask for the operator's name for `--actor` once per session. If a name matches more than one record, show the candidates and ask. Never change a lab value to make it pass, never record a notification that did not happen. Nothing here sends anything. Read the value off the guideline table, with its unit and fraction.

Run: `node scripts/envdata.mjs add-criterion --set --analyte --unit --max [--min] [--fraction=dissolved|total] [--note] --actor`. Add `--json` for structured results.
