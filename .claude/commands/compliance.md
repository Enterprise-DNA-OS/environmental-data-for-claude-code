---
description: Check every site, consent and result against the rules in docs/compliance.md and report what is breached, due or missing
---

Check every site, consent and result against the rules in docs/compliance.md and report what is breached, due or missing. Severity 1 is breached or needs action now. Cite the rule for each finding. A guideline exceedance is a trigger for assessment, not a breach. If a guideline value looks out of date (a revised ANZG default guideline value, a NEPM amendment), say so and stop: do not guess at the number.

Run: `node scripts/envdata.mjs compliance`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
