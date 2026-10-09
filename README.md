<h1 align="center">Environmental Data for Claude Code</h1>

<p align="center">
  <strong>The open-source environmental data system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your EQuIS data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=equis">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/equis?utm_source=github&utm_medium=readme&utm_campaign=equis">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-equis">Instead of EQuIS</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Environmental Data for Claude Code does the job you pay EQuIS for, as a database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it answers questions the EQuIS screens do not.

EarthSoft's own price list puts EQuIS Online at USD 420 to 7,000 a month by data size, plus USD 10 a month for every user, USD 220 to 550 a month per Professional desktop seat, and HELIOS, required on every EQuIS system since July 2024, from USD 24,000 a year ([EQuIS price list, effective 3 February 2025](https://earthsoft.com/wp-content/uploads/2025/06/EarthSoft__Price_List_web_2025.pdf), checked 9 October 2026; [research notes](docs/research.md)). A small consultancy is past USD 30,000 a year before maintenance.

It holds the sites, the monitoring locations (bores, surface water points, discharge points, test pits), the samples with their duplicates and blanks, every lab result with its LOR, the guideline sets a site is screened against (ANZG 2018 freshwater, NEPM 2013 HIL A and NESCS are loaded) and the limits in each resource consent or EPA licence. It screens every result with unit conversion, keeps the notification clock on every consent exceedance, tracks which monitoring rounds are overdue, when the monitoring report is due and when an NZ consent renewal has to be lodged, and runs the QA a report needs: duplicate RPDs, blank detections, holding times, LORs above criteria and samples stuck at the lab. It is built for environmental consultancies and consent holders (landfills, quarries, wastewater, industrial discharges) with one to fifty people.

Want the same thing with a web front end, maps or a field app? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=equis).

## The weekly rituals

| When | Ask | Command |
|---|---|---|
| Every morning | What is breached, due or overdue today? | `/attention` |
| When a lab report lands | Bring it in, screen it, check the QA | `/import`, `/screen`, `/qa` |
| On an exceedance | Who has to be told, by when, and draft it | `/exceedances`, `/draft-exceedance-notice`, `/notify` |
| Planning the field week | Which rounds are due, which are overdue under a consent? | `/due` |
| Friday | What is still at the lab, what is rising? | `/awaiting`, `/trends` |
| Monday | The week in one page | `/weekly-review` |
| Report time | The monitoring report, the results table, the client letter | `/draft-monitoring-report`, `npm run docs`, `/draft-results-letter` |
| Twice a year | Which consents expire, and when must the renewal go in? | `/consents`, `/compliance` |

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no record tiers, no add-on modules. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/environmental-data-for-claude-code.git
cd environmental-data-for-claude-code
npm install
npm run demo
```

The demo is Southern Rivers Environmental, a fictional consultancy with a closed landfill in Northland whose downstream ammonia has crept up for six months and just went over the consent limit with the regulator not yet told, three bores a quarter overdue, and a consent five months from expiry with no renewal lodged; a former depot in Newcastle with lead and arsenic over NEPM HIL A, a field duplicate that fails its RPD and a rinsate blank with zinc in it; and a quarry whose licensed discharge round is ten days late and whose annual return is overdue. Open the folder in Claude Code and type `/attention` first.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee. Then `npm run envdata -- settings --name="Your Business" --country=AU --actor="You"`.

## Ten questions EQuIS does not answer for you

Each one runs against the demo data today.

1. Which consent exceedances have we not told the regulator about, and when was each due? `/exceedances`
2. What is rising at any monitoring point compared with its last four results? `/trends`
3. Which consent-required rounds are overdue right now? `/due`
4. Which consents expire inside the window where a late renewal needs the council's permission? `/consents`
5. Which non-detects prove nothing because the LOR is above the guideline? `/screen`
6. Which field duplicates fail our RPD acceptance limit, and on which round? `/duplicates`
7. Which results were analysed outside the holding time and need an estimated flag? `/holding-times`
8. Which samples have been at the lab past our agreed turnaround? `/awaiting`
9. Which results in this lab report are over any criterion that applies at that site? `/screen`
10. Which monitoring reports and annual returns are due in the next 60 days? `/weekly-review`

## The commands

42 slash commands in `.claude/commands`, 40 of them driving one CLI command each (`npm run envdata -- <command>`, `--json` for machines).

| Command | What it does |
|---|---|
| `/attention` | Everything breached or due today, plus rounds due this week |
| `/weekly-review` | The Monday review: breached, exceedances, rounds due, QA, reports and renewals, what is rising |
| `/compliance` | Every rule finding, breached first, with the rule cited |
| `/sites`, `/site`, `/locations` | Sites, one site in full, monitoring locations |
| `/results`, `/screen` | Results, and a sample or lab report screened against every criterion that applies |
| `/exceedances` | Results over a guideline value or a consent limit, with the notify-by date |
| `/trends` | Latest result against the mean of the four before it |
| `/duplicates`, `/blanks`, `/holding-times`, `/qa` | Data quality: RPDs, blank detections, holding times, the lot in one list |
| `/due`, `/awaiting` | Monitoring rounds by due date; samples stuck at the lab |
| `/consents` | Report due, expiry, renewal lodge-by date and exceedances per consent |
| `/draft-exceedance-notice`, `/draft-monitoring-report`, `/draft-results-letter` | The notice to the regulator, the periodic report, the client letter: drafted to `drafts/`, never sent |
| `/criteria`, `/add-set`, `/add-criterion`, `/apply-set` | Guideline sets and where they apply |
| `/add-consent`, `/add-limit`, `/plan` | Consents and licences, their limits, the monitoring they require |
| `/add-site`, `/add-location`, `/close-site` | Sites and locations |
| `/sample`, `/result` | A sample, duplicate or blank, and a result by hand |
| `/notify`, `/report-submitted`, `/renewal-lodged` | Record what was done: notified, reported, lodged |
| `/settings`, `/log`, `/activity` | Who this is for and the QA limits, notes, the history |
| `/import`, `/export` | Bring EQuIS EDDs and lab CSVs in; back everything up |
| `/customise`, `/new-view` | Make it yours: fields, rules, guideline sets, views |

## Paperwork, views and checks

Change `brand.json` once. `npm run docs` renders a results summary table for every site (latest result at each location against its criteria, with the QA notes), a consent compliance summary for every consent, and a sample register for every site with samples at the lab. `npm run view` renders the monitoring week, data quality and the consents.

[docs/compliance.md](docs/compliance.md) lists every rule with its source: consent and licence limits, the notification clock (POEO Act s148 for NSW pollution incidents), overdue monitoring, report dates, RMA s124 renewals, and the guideline values loaded from ANZG 2018, NEPM 2013 and NESCS, plus the QA house rules you can change. It is a record checker, not legal advice, and it notifies no one.

## Your first hour: ten things to ask for

1. Put our name, logo and colours on the results tables.
2. Set us up as a Brisbane consultancy with 40% RPD for water.
3. Load the ANZG marine values and apply them to our estuary sites.
4. Test our EQuIS export for the landfill without saving anything.
5. Add the limits from consent condition 12 at the discharge point.
6. Show every result at BH03 since 2024 as one table.
7. Load our lab's holding time table.
8. Add a "weather on the day" field to every sample and show it in the monitoring report.
9. Draft the annual monitoring report for the landfill consent.
10. Build a read-only page for the client: their sites, latest round, what is over.

## Instead of EQuIS

Export a results report from EQuIS (or use the EDDs your labs already send) as CSV, then:

```bash
npm run envdata -- import equis --site=KLF --file=results.csv --actor="Your name" --dry-run
npm run envdata -- import equis --site=KLF --file=results.csv --actor="Your name"
```

New locations are created on the site, duplicates link to their parent, repeats change nothing, and a result that differs from the one recorded stops the run. EQuIS dates are month first and lab CSVs day first (`import lab`); map your own headings with `--map`. Full steps and what does not carry over: [docs/replace-equis.md](docs/replace-equis.md).

## Verification

`npm test` uses a temporary database and runs all 41 CLI commands, every consent, guideline and QA rule turning on and off, unit conversion between mg/L, ug/L and g/m3, the notification clock, s124 renewals, EQuIS and lab imports with dry runs, repeats, rollback, date order and mapping, the drafts, the export and the escaped HTML pages. Set `TEST_DATABASE_URL` to a new, empty Postgres to run the same suite there. GitHub checks run Linux, Windows and Postgres.

## Architecture

```
environmental-data-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  scripts/envdata.mjs       the one CLI: npm run envdata -- <command>
  supabase/migrations/      plain SQL schema, the screening views and the rule checks
  supabase/seed.sql         demo data
  fixtures/equis.csv        a sample EQuIS EDD for the import test
  docs/                     the rules and sources, the EQuIS guide, the research
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Environmental Data for Claude Code for your business, migrates your EQuIS data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=equis)
- Read more: [enterprisedna.co/omni/instead-of/equis](https://enterprisedna.co/omni/instead-of/equis?utm_source=github&utm_medium=readme&utm_campaign=equis)

## License

MIT. Copyright (c) 2026 Enterprise DNA. Not affiliated with EarthSoft, EQuIS or Anthropic. Hosting and agent use have separate costs.
