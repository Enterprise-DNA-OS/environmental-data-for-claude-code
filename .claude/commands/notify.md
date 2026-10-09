---
description: Record that the regulator was told about an exceedance, or why it was not required
---

Say back the record and every value before you run it, and ask for the operator's name for `--actor` once per session. If a name matches more than one record, show the candidates and ask. Never change a lab value to make it pass, never record a notification that did not happen. Nothing here sends anything. `not-required` needs a note naming who decided and why.

Run: `node scripts/envdata.mjs notify --sample --analyte --action=notified|not-required [--ref] [--date] [--note] --actor`. Add `--json` for structured results.
