# EQuIS target research

Checked 9 October 2026. Family: environmental monitoring data (sampling, lab results, guideline screening, consent limits, QA and monitoring reports), new to the rebuild registry. Distinct from the lab build (QBench), which runs the laboratory's own samples, tests and turnaround: this is the consultant's and the consent holder's side, after the lab sends the results.

## The bill

EarthSoft publishes an EQuIS price list. The [EQuIS price list effective 3 February 2025](https://earthsoft.com/wp-content/uploads/2025/06/EarthSoft__Price_List_web_2025.pdf) (all prices USD, signed licence agreement required) lists:

| EQuIS Online (hosted) | Records | Basic schemas, per month | Premium schemas, per month |
|---|---|---|---|
| Level 1 | 250k | 420 | 580 |
| Level 2 | 1M | 700 | 960 |
| Level 3 | 5M | 1,100 | 1,550 |
| Level 7 | Unlimited | 5,000 | 7,000 |

Other lines on the same list:

- Active Client Access Licence, required for each EQuIS user: USD 10 each per month.
- EQuIS HELIOS, "included and required for all EQuIS systems starting July 2024": from USD 24,000 a year (Level 1, 250k files).
- Professional desktop licences, per concurrent user on EQuIS Online: Standard USD 220 a month, PremierDG USD 550 a month.
- EnviroInsite (mapping and cross sections), per concurrent user: USD 170 a month.
- Perpetual EQuIS Enterprise: USD 22,000 (Basic) or 27,500 (Premium) per environment.
- Software maintenance: 20 percent of the portfolio list price for Online or Hybrid, 25 percent for perpetual.

A newer list (effective 24 April 2026) was indexed at `earthsoft.com/wp-content/uploads/2026/04/EQuIS_Price_List.pdf` but returned 404 on 9 October 2026. The page uses only the February 2025 list.

## Who pays it

Environmental consultancies (contaminated land, groundwater, landfill and quarry compliance), consent holders with monitoring conditions (landfills, quarries, wastewater, mines, industrial discharges) and regulators. EarthSoft and its rival ESdat both sell into Australian and New Zealand consultancies; ESdat publishes [a comparison post](https://esdat.net/the-best-alternative-to-equis-for-environmental-data-management-compliance-monitoring/) aimed at EQuIS customers, which shows there is switching demand.

## What it does that matters

The data model is the same in every product in this family: facility (site), location, sample, test, result, plus criteria to screen against. The work the incumbent sells is loading lab electronic data deliverables (EDDs), checking them (duplicates, blanks, holding times), screening against guidelines and permit limits, and producing tables and reports. All of that is SQL over a few tables.

## What this build leaves out

Maps, cross sections and borelogs (EnviroInsite, geotechnical modules), field data collection apps (EQuIS Collect), and lodging data with a regulator's portal. A firm that needs those gets them as a customisation, or keeps the specialist tool for that one job.

## Scores

Annual bill 4, data-shaped 5, our buyers 3, search demand 3, one-session buildable 4, import path 4: 23 of 30.
