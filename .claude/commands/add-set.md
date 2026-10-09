---
description: Add a guideline set (its source must be the published guideline URL)
---

Say back the record and every value before you run it, and ask for the operator's name for `--actor` once per session. If a name matches more than one record, show the candidates and ask. Never change a lab value to make it pass, never record a notification that did not happen. Nothing here sends anything. Never add a set without the URL of the published guideline.

Run: `node scripts/envdata.mjs add-set --code --name --matrix=water|soil|sediment|air --source=<url> --actor`. Add `--json` for structured results.
