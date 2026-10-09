# Environmental Data for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| What needs attention, what is overdue | `/attention` |
| The Monday review | `/weekly-review` |
| Are we compliant, what is breached | `/compliance` (rules and sources in `docs/compliance.md`) |
| Sites, one site, locations | `/sites`, `/site`, `/locations` |
| Results, one sample or lab report against the criteria | `/results`, `/screen` |
| What is over a guideline or a consent limit | `/exceedances` |
| What is rising | `/trends` |
| Data quality | `/qa`, `/duplicates`, `/blanks`, `/holding-times` |
| What is due to be sampled, what is stuck at the lab | `/due`, `/awaiting` |
| Report dates, expiries, renewals | `/consents` |
| The notice to the regulator, the monitoring report, the client letter | `/draft-exceedance-notice`, `/draft-monitoring-report`, `/draft-results-letter` (drafts only, a person sends) |
| The regulator was told, or it was not required | `/notify` |
| The report went in, the renewal was lodged | `/report-submitted`, `/renewal-lodged` |
| A sample, duplicate or blank; a result by hand | `/sample`, `/result` |
| Guideline sets and where they apply | `/criteria`, `/add-set`, `/add-criterion`, `/apply-set` |
| Consents, limits, monitoring rounds | `/add-consent`, `/add-limit`, `/plan` |
| Sites and locations | `/add-site`, `/add-location`, `/close-site` |
| History or a note | `/activity`, `/log` |
| Who we are, QA acceptance limits | `/settings` |
| Bring EQuIS or a lab file across | `/import` (read `docs/replace-equis.md` first) |
| Back everything up | `/export` |
| Change a field, a guideline or a rule | `/customise` |
| A new read-only page | `/new-view` |

If an ask fits nothing here, run the CLI directly (`npm run envdata -- help`) and then propose a new command for it.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.
- Never change, round or re-unit a lab result to make it pass. A wrong result is corrected from the lab's amended report, with a note.
- Never record a notification, a submitted report or a lodged renewal that a person has not confirmed.
- Never decide whether an exceedance is a pollution incident, whether harm was caused, or what a consent condition means. Ask the scientist or the consent holder and record their answer with `/notify` or `/log`.
- A guideline exceedance is a trigger for assessment, not a breach. A consent or licence exceedance is a breach of a condition. Never mix the two words up in a draft.
- Guideline values come from the published table with its URL. Never type one from memory.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the rules and their sources, the guide for moving off EQuIS, and the research.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/equis
