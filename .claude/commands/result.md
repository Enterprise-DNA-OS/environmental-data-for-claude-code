---
description: Record one lab result by hand
---

Say back the record and every value before you run it, and ask for the operator's name for `--actor` once per session. If a name matches more than one record, show the candidates and ask. Never change a lab value to make it pass, never record a notification that did not happen. Nothing here sends anything. If the result exceeds a limit, the output says so: tell the operator straight away and offer `/draft-exceedance-notice`.

Run: `node scripts/envdata.mjs result --sample --analyte --unit (--value=<n> | --nd --lor=<n>) [--fraction] [--method] [--analysed] [--received] [--qualifier] --actor`. Add `--json` for structured results.
