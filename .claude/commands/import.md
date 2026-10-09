---
description: Bring results in from an EQuIS EDD or a lab's CSV
---

Read `docs/replace-equis.md` first. Always run with `--dry-run` first and show the counts. EQuIS EDDs write month-first dates; NZ and AU lab files write day-first: say which you are assuming. If headings do not match, write a `--map` file. If a re-import says a result changed, stop and show both values: never overwrite a lab result.

Run: `node scripts/envdata.mjs import equis|lab --site=<site> --file=<csv> [--map=columns.json] [--dates=dmy|mdy] [--dry-run] --actor`. Add `--json` for structured results.

The CLI output is the source. If a name matches more than one record, show the candidates and ask; an error is never permission to use a different record. Nothing here sends, lodges, notifies or deletes.
