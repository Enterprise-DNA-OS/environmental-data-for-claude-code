# The rules this system checks

Sources checked 9 October 2026. `npm run envdata -- compliance` (or `/compliance`) runs every rule below against the records and cites the rule on each finding. This is a record checker. It does not decide whether a result is a pollution incident, whether harm was caused, or what a consent condition means: those are a person's call, recorded with `notify` and `log`. Nothing here is legal advice, and nothing here notifies a regulator.

## Consent and licence rules

| Rule | What it checks | Source |
|---|---|---|
| CONSENT-LIMIT | A result at a site with an active consent or licence is over (or, for pH, outside) a limit in that consent. Severity 1 until an action is recorded, then kept at severity 3 for 12 months. | The consent or licence itself. NZ: Resource Management Act 1991 s108 (conditions of resource consents, including monitoring) and s15 (discharges must comply with a rule or consent). NSW: Protection of the Environment Operations Act 1997 s64 (contravening a licence condition is an offence). |
| CONSENT-NOTIFY | A consent or licence exceedance has no action recorded (`notified` or `not-required`). Due `notify_within_days` after the results were received. | The notification condition in the consent. NSW: [POEO Act 1997 s148](https://legislation.nsw.gov.au/view/html/inforce/current/act-1997-156): a pollution incident causing or threatening material harm is notified immediately. Set `notify_within_days` to 0 for a NSW licence. |
| MONITORING-OVERDUE | A monitoring round has passed its due date (last sample plus the frequency). Severity 1 when a consent requires it. | The monitoring condition in the consent or licence. |
| REPORT-DUE | The periodic monitoring report or annual return is due within `report_lead_days` or overdue. | The reporting condition. NSW licences carry an annual return under the [POEO Act](https://legislation.nsw.gov.au/view/html/inforce/current/act-1997-156) licence conditions. |
| NZ-RMA-124 | A New Zealand consent expires within the next nine months and no replacement application is recorded. Severity 1 once inside six months of expiry. | [RMA s124](https://www.legislation.govt.nz/act/public/1991/0069/latest/whole.html): an application lodged at least six months before expiry lets the holder keep operating until it is decided; between six and three months, only if the consent authority allows. |

## Guideline screening

A guideline exceedance is a trigger for further assessment, not a breach. Each set is a table you can change; the seed loads the values below. Check them against the current version before you rely on them.

| Rule | Set | Source |
|---|---|---|
| GUIDELINE-ANZG-FW95 | Freshwater toxicant default guideline values, 95% species protection, at the reference hardness of 30 mg/L CaCO3: dissolved zinc 8, copper 1.4, lead 3.4, cadmium 0.2, nickel 11 ug/L. Copper, zinc and nickel are under revision with bioavailability-based values. | [Australian and New Zealand Guidelines for Fresh and Marine Water Quality (ANZG 2018), toxicant default guideline values](https://www.waterquality.gov.au/anz-guidelines/guideline-values/default/water-quality-toxicants) |
| GUIDELINE-NEPM-HIL-A | Health investigation level A, residential with garden or accessible soil: arsenic 100, cadmium 20, copper 6,000, lead 300, mercury (inorganic) 40, nickel 400, zinc 7,400 mg/kg. | [National Environment Protection (Assessment of Site Contamination) Measure 1999, as amended 2013](https://www.legislation.gov.au/F2013L00768/latest/text), Schedule B1 Table 1A(1) |
| GUIDELINE-NESCS-RES | Soil contaminant standards, residential (10% produce): arsenic 20, lead (inorganic) 210 mg/kg. Loaded, not applied to a demo site. | [Resource Management (National Environmental Standard for Assessing and Managing Contaminants in Soil to Protect Human Health) Regulations 2011](https://environment.govt.nz/publications/methodology-for-deriving-standards-for-contaminants-in-soil-to-protect-human-health/), Ministry for the Environment methodology, Table ES1 |

A criterion with a blank fraction applies to any fraction; a `dissolved` criterion only to dissolved results. Results convert between mg/L, ug/L and g/m3, and between mg/kg and ug/kg. Anything else shows as POLICY-UNITS instead of a guess.

## House policies

These are your quality rules, not law. Change the numbers with `/settings` or `/customise`.

| Rule | What it checks |
|---|---|
| POLICY-RPD | A field duplicate's relative percent difference against its parent, where both were detected, is above `rpd_water_pct` (default 30) or `rpd_soil_pct` (default 50). Common acceptance ranges in sampling and analysis plans; use the ones in yours. |
| POLICY-BLANK | An analyte was detected in a trip blank or rinsate blank. |
| POLICY-HOLDING | A result was analysed more days after sampling than the analyte's `holding_days`. The seeded values are placeholders: load your laboratory's holding time table. |
| POLICY-LOR | A non-detect's limit of reporting is above the criterion, so the result cannot show compliance. Severity 3. |
| POLICY-UNITS | A result's unit does not convert to the criterion's unit. |
| POLICY-RESULTS-LATE | A sample has been at the lab longer than `results_within_days` (default 10) with no results. |
