# Moving off EQuIS

EQuIS stores results in the same shape this system does: facility, location, sample, test, result. Its EDD formats (ESBasic and the other EarthSoft formats) are flat files with documented column names, and most labs in Australia and New Zealand can already send results in one of them. That makes the move a file export and one command per site.

## 1. Export the results

From EQuIS Professional, run a results report for one facility with the columns below and save it as CSV (UTF-8). From EQuIS Enterprise, ask your administrator for the same export, or use the EDDs your labs sent you, which already have these columns. Start with every sample since the start of the current consent term.

You need, per result: location (`sys_loc_code`), sample code (`sys_sample_code`), sample date, sample type (`sample_type_code`: N, FD, TB, EB), parent sample for duplicates, matrix (`matrix_code`), analyte (`chemical_name`), CAS number, fraction (T or D), result value, detect flag (Y or N), reporting limit, unit, method, analysis date and lab qualifiers. Depth, lab and lab report (SDG) are optional.

## 2. Try the import on a separate copy

```bash
DATA_DIR=./.data/trial npm run migrate
DATA_DIR=./.data/trial npm run envdata -- add-site --code=KLF --name="Your site" --country=NZ --actor="Your name"
DATA_DIR=./.data/trial npm run envdata -- import equis --site=KLF --file=results.csv --actor="Your name" --dry-run
```

The dry run reads every row, checks it and rolls back. Nothing is saved.

The import looks for these headings (case does not matter):

| Field | Headings it reads |
|---|---|
| Location (required for normal samples) | sys_loc_code, Location, Location Code, Location ID |
| Sample (required) | sys_sample_code, Sample ID, Sample Code, Client Sample ID, Field ID |
| Sample date (required) | sample_date, Sample Date, Sampled Date, Date Sampled |
| Sample type | sample_type_code, Sample Type, QC Type (N, FD, TB, EB or RB; blank means normal) |
| Parent sample (required for duplicates) | parent_sample_code, Parent Sample |
| Matrix (required) | matrix_code, Matrix (WG, GW, WS, SW, WL, WW, W, SO, SE, AA, or the words) |
| Analyte (required) | chemical_name, Analyte, Parameter; a CAS number in the analytes table wins |
| Fraction | fraction (D is dissolved; T is total for metals, ignored for everything else) |
| Result | result_value, Result, Value (`<0.001` reads as a non-detect at that LOR) |
| Detected | detect_flag, Detected (Y or N) |
| Reporting limit | reporting_detection_limit, LOR, Reporting Limit, PQL |
| Unit (required) | result_unit, Units, Unit (ug/L, µg/L, mg/L, g/m3, mg/kg and pH units are normalised) |
| Method, analysis date, qualifier | lab_anl_method_name, analysis_date, lab_qualifiers and their plain-English names |
| Depth, lab, lab report | start_depth, lab_name_code, lab_sdg |

Different headings? Write a map and pass it with `--map`:

```json
{ "location": "Bore", "sample": "Field Code", "sampled": "Date", "analyte": "Test", "value": "Reading", "unit": "Units", "matrix": "Medium" }
```

## 3. Dates: the one thing to check

EQuIS writes dates month first (`03/14/2026`). New Zealand and Australian lab files write them day first (`14/03/2026`). `import equis` assumes month first and `import lab` assumes day first; `--dates=dmy` or `--dates=mdy` overrides either. A date that cannot be real, or lands in the future, stops the run, so a wrong guess shows itself on the first file.

## 4. Import for real

```bash
npm run envdata -- import equis --site=KLF --file=results.csv --actor="Your name"
npm run envdata -- import lab --site=KLF --file=hill-labs-HL-2210.csv --actor="Your name"
```

- New locations are created on the site, with a kind taken from the matrix (WG becomes a groundwater bore). Rename or re-kind them afterwards with `/customise`.
- Field duplicates are linked to their parent sample, so the RPD check runs straight away.
- Running the same file again changes nothing. A result that differs from the one already recorded stops the whole run and names it: a lab result is never overwritten without a person deciding.
- Any error rolls back the whole file.

Then run `/screen --report=<lab report>` on the newest report and check the numbers against the lab's PDF.

## 5. Load the criteria and consents

The import brings results, not the criteria. For each site:

1. `/add-consent` for each consent or licence, with the expiry, notification period and reporting frequency from the consent document.
2. `/add-limit` for each limit in the consent conditions, at the location the condition names.
3. `/apply-set` for the guideline sets the site is screened against (ANZG, NEPM, NESCS are loaded; `/add-set` and `/add-criterion` for any other).
4. `/plan` for each monitoring round the consent requires.

## What does not carry over

- **Maps, cross sections and borelogs.** EnviroInsite and the geotechnical modules draw pictures. Here you get tables, and Enterprise DNA builds maps into your version if you need them.
- **Field data collection.** EQuIS Collect forms on a tablet. Field sheets come in as a CSV import or as results typed in, unless a field app is part of your build.
- **Validation history.** Validator qualifiers come across as the lab qualifier text; a full data validation audit trail stays in EQuIS or your validation reports.
- **Regulator portals.** Nothing here lodges data with a council or EPA portal. The monitoring report and notices are drafted for a person to send.
