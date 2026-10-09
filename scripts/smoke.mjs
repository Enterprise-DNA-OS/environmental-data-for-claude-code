// npm test: a temporary database, migrate, seed twice, every command, the rules, the import and the
// rendered pages. Set TEST_DATABASE_URL to run the same checks against a new, empty Postgres.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb, REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run, commands, date, human, unit, analyteName, importDate, num} from './envdata.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envdata-test-'));
process.env.DATA_DIR = path.join(dir, 'db'); process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || ''; process.env.OUTPUT_DIR = dir;
let db; const visited = new Set();
const call = async (c, o = {}, p = []) => { visited.add(c); return run(db, [c, ...p, ...Object.entries(o).map(([k, v]) => v === true ? `--${k}` : `--${k}=${v}`)]); };
const fails = (c, o, re, p = []) => assert.rejects(() => call(c, o, p), re);
const shell = (file, argv = []) => { const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', file), ...argv], {cwd: REPO_ROOT, env: process.env, encoding: 'utf8'}); assert.equal(r.status, 0, r.stderr || r.stdout); return r.stdout; };
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const has = async (ref, rule, severity) => (await call('compliance')).some(r => r.reference === ref && r.rule === rule && (severity === undefined || r.severity === severity));
const actor = 'Test scientist';

try {
  db = await getDb();
  if (db.mode === 'postgres') assert.equal((await db.query("select tablename from pg_tables where schemaname='public'")).length, 0, 'TEST_DATABASE_URL must be a new, empty, disposable database');
  assert.equal((await migrate(db)).ran.length, 1); assert.equal((await migrate(db)).ran.length, 0);
  await seed(db); await seed(db);

  // ---- input helpers
  assert.equal(unit('µg/l'), 'ug/L'); assert.equal(unit('MG/L'), 'mg/L'); assert.equal(unit('pH Units'), 'pH units');
  assert.equal(analyteName('Ammonia as N'), 'ammoniacal nitrogen'); assert.equal(analyteName(' Zinc '), 'zinc');
  assert.equal(importDate('03/04/2026', 'd', 'mdy'), '2026-03-04'); assert.equal(importDate('03/04/2026', 'd', 'dmy'), '2026-04-03');
  assert.throws(() => importDate('03/14/2026', 'd', 'dmy'), /real ISO date/); assert.throws(() => date('2026-02-30'), /real ISO date/); assert.throws(() => num('1.2.3', 'x'), /number/);

  // ---- reads on the demo data
  assert.equal((await call('help')).length, Object.keys(commands).length);
  const sites = await call('sites'); assert.deepEqual(sites.map(s => s.code), ['HSD', 'KLF', 'RBQ']); assert.equal(sites.find(s => s.code === 'KLF').breached, 6);
  const klf = await call('site', {site: 'kaiwaka'}); assert.equal(klf.locations.length, 5); assert.equal(klf.criteria[0].applies_to, 'surface-water'); assert(klf.findings.some(f => f.rule === 'NZ-RMA-124'));
  assert.equal((await call('locations', {site: 'HSD'})).length, 6); assert.equal((await call('locations', {kind: 'groundwater'})).length, 3);
  assert.equal((await call('criteria', {set: 'NEPM-HIL-A'})).length, 7); assert.equal((await call('criteria', {site: 'RBQ'})).length, 3); assert.equal((await call('criteria')).length, 20);
  assert.equal((await call('results', {location: 'KLF/SW-DS', analyte: 'ammonia as n'})).length, 8, 'seven rounds and the field duplicate');
  assert.equal((await call('results', {site: 'HSD', since: day(-30)})).filter(r => r.exceeds).length, 2);
  const scr = await call('screen', {sample: 'KLF-SWDS-07'});
  assert.equal(scr.find(r => r.analyte === 'ammoniacal nitrogen').outcome, 'OVER x1.36');
  assert.equal(scr.find(r => r.analyte === 'cadmium (dissolved)').outcome, 'LOR above limit');
  assert.equal(scr.find(r => r.analyte === 'zinc (dissolved)' && r.set === 'ANZG-FW95').outcome, 'OVER x1.50', 'mg/L result against a ug/L guideline converts');
  assert.equal(scr.find(r => r.analyte === 'zinc (dissolved)' && r.set === 'AUT.031207.01').outcome, 'ok');
  assert.equal((await call('screen', {report: 'EN-88213'})).filter(r => r.outcome.startsWith('OVER')).length, 2);
  await fails('screen', {}, /Give --sample or --report/);
  const exc = await call('exceedances'); assert.equal(exc.length, 6); assert.equal((await call('exceedances', {kind: 'consent', site: 'RBQ'})).length, 2);
  assert.equal((await call('exceedances', {since: day(-30)})).length, 4);
  const tr = await call('trends', {rising: true}); assert.equal(tr[0].location, 'SW-DS'); assert.equal(Number(tr[0].change_pct), 228);
  assert.equal((await call('trends', {site: 'RBQ'})).length, 2);
  const dup = await call('duplicates'); assert.equal(dup[0].duplicate, 'HSD-QC01'); assert.equal(Number(dup[0].rpd_pct), 66.7); assert.equal(dup[0].fails, true); assert.equal(dup.length, 3);
  assert.deepEqual((await call('blanks')).map(b => b.sample), ['HSD-RB01']);
  const ht = await call('holding-times'); assert.equal(ht.length, 1); assert.equal(ht[0].days_held, 9);
  assert.deepEqual((await call('qa')).map(r => r.rule), ['POLICY-BLANK', 'POLICY-HOLDING', 'POLICY-LOR', 'POLICY-RESULTS-LATE', 'POLICY-RPD']);
  const due = await call('due'); assert.equal(due[0].location, 'LDP1'); assert.equal(due[0].days_overdue, 10); assert.equal(due.length, 6); assert.equal((await call('due', {days: '0'})).length, 4);
  assert.deepEqual((await call('awaiting')).map(a => a.sample), ['HSD-TP06-0.2']);
  const cons = await call('consents'); assert.equal(cons[0].ref, 'EPL 20871'); assert.equal(cons[0].days_to_report, -15); assert.equal(cons[1].not_actioned, 1);
  const rules = await call('compliance');
  for (const [ref, rule, sev] of [['KLF/KLF-SWDS-07', 'CONSENT-LIMIT', 1], ['KLF/KLF-SWDS-07', 'CONSENT-NOTIFY', 1], ['RBQ/RBQ-LDP1-04', 'CONSENT-LIMIT', 3], ['KLF/KLF-SWDS-07', 'GUIDELINE-ANZG-FW95', 2],
    ['HSD/HSD-TP03-0.3', 'GUIDELINE-NEPM-HIL-A', 2], ['HSD/HSD-TP05-0.2', 'GUIDELINE-NEPM-HIL-A', 2], ['KLF/KLF-SWDS-07', 'POLICY-LOR', 3], ['KLF/BH01', 'MONITORING-OVERDUE', 1], ['RBQ/LDP1', 'MONITORING-OVERDUE', 1],
    ['AUT.031207.01', 'REPORT-DUE', 2], ['EPL 20871', 'REPORT-DUE', 1], ['AUT.031207.01', 'NZ-RMA-124', 1], ['RBQ/RBQ-LDP1-05', 'POLICY-HOLDING', 2], ['HSD/HSD-QC01', 'POLICY-RPD', 2],
    ['HSD/HSD-RB01', 'POLICY-BLANK', 2], ['HSD/HSD-TP06-0.2', 'POLICY-RESULTS-LATE', 2]])
    assert(rules.some(r => r.reference === ref && r.rule === rule && r.severity === sev), `${ref} ${rule} ${sev}`);
  assert.equal(rules.length, 19);
  assert(!rules.some(r => r.rule === 'CONSENT-NOTIFY' && r.reference.startsWith('RBQ')), 'a notified exceedance is clear');
  assert(!rules.some(r => r.reference.startsWith('KLF/BH') && r.rule.startsWith('GUIDELINE')), 'the surface water guideline does not screen bores');
  assert(!rules.some(r => r.reference === 'HSD/HSD-TP02-0.5'), 'lead 180 is under HIL A');
  assert(!rules.some(r => r.rule === 'NZ-RMA-124' && r.reference === 'EPL 20871'), 's124 is New Zealand only');
  const att = await call('attention'); assert.equal(att[0].severity, 1); assert(!att.some(r => r.severity === 3 && r.what === 'finding'));
  const wk = await call('weekly-review'); assert.equal(wk.breached.length, 8); assert.equal(wk.rising.length, 1); assert.equal(wk.reports_and_renewals.length, 2); assert.equal(wk.data_quality.length, 5);

  // ---- drafts
  const notice = await call('draft-exceedance-notice', {consent: 'AUT.031207'}); const nt = fs.readFileSync(notice.file, 'utf8');
  assert.equal(notice.exceedances, 1); assert(nt.includes('DRAFT. Nothing has been sent')); assert(nt.includes('| ammoniacal nitrogen | 3.4 mg/L | 2.5 mg/L |'));
  await fails('draft-exceedance-notice', {consent: 'EPL 20871'}, /No un-actioned exceedances/);
  const rep = await call('draft-monitoring-report', {consent: 'EPL 20871', from: day(-200)}); const rt = fs.readFileSync(rep.file, 'utf8');
  assert.equal(rep.exceedances, 2); assert(rt.includes('Rounds not done on time')); assert(rt.includes('EPA Environment Line 26-04117')); assert(rt.includes('POLICY-HOLDING'));
  await fails('draft-monitoring-report', {consent: 'EPL 20871', from: day(-1), to: day(-10)}, /--from is after --to/);
  const letter = await call('draft-results-letter', {site: 'HSD'}); const lt = fs.readFileSync(letter.file, 'utf8');
  assert.equal(letter.over_criteria, 2); assert(lt.includes('TP03: lead 640 mg/kg')); assert(lt.includes('RPD 66.7%'));
  await fails('draft-results-letter', {site: 'KLF', extra: 'x'}, /Unknown option --extra/);

  // ---- writes
  await fails('settings', {'rpd-water': '25'}, /--actor is required/);
  assert.equal((await call('settings')).name, 'Southern Rivers Environmental');
  assert.equal(Number((await call('settings', {'rpd-soil': '75', actor})).rpd_soil_pct), 75);
  assert(!(await has('HSD/HSD-QC01', 'POLICY-RPD')), 'a wider acceptance limit clears the duplicate');
  await call('settings', {'rpd-soil': '50', actor});
  const t = await call('add-site', {code: 'tst', name: 'Test Site <script>alert(1)</script>', country: 'nz', client: 'Test Client', actor}); assert.equal(t.code, 'TST');
  await fails('add-site', {code: 'TST', name: 'Again', country: 'NZ', actor}, /already exists/);
  await fails('add-site', {code: 'T2', name: 'Bad', country: 'US', actor}, /--country must be AU\|NZ/);
  await call('add-location', {site: 'TST', code: 'DP1', kind: 'discharge', name: 'Outfall', actor});
  await call('add-location', {site: 'TST', code: 'BH1', kind: 'groundwater', actor});
  await fails('add-location', {site: 'TST', code: 'X', kind: 'pond', actor}, /--kind must be/);
  await call('add-consent', {site: 'TST', ref: 'DIS.900', kind: 'resource-consent', regulator: 'Test Regional Council', granted: '2020-01-01', expires: day(400), 'notify-within': '3', 'report-every': '6', 'last-report': day(-10), actor});
  await fails('add-consent', {site: 'TST', ref: 'DIS.901', kind: 'resource-consent', granted: '2020-01-01', expires: '2019-01-01', actor}, /check|violates/i);
  assert(!(await has('DIS.900', 'NZ-RMA-124')), 'expiry 400 days out is not yet a renewal finding');
  await call('add-limit', {consent: 'DIS.900', analyte: 'TSS', unit: 'g/m3', matrix: 'water', max: '30', location: 'TST/DP1', actor});
  await call('add-limit', {consent: 'DIS.900', analyte: 'pH', unit: 'pH', matrix: 'water', min: '6', max: '9', location: 'TST/DP1', actor});
  await fails('add-limit', {consent: 'DIS.900', analyte: 'zinc', unit: 'mg/L', matrix: 'water', actor}, /Give --max, --min or both/);
  await fails('add-limit', {consent: 'DIS.900', analyte: 'zinc', unit: 'mg/L', matrix: 'water', max: '1', location: 'KLF/SW-DS', actor}, /not on the consent's site/);
  await fails('add-limit', {consent: 'DIS.900', analyte: 'zinc', unit: 'mg/L', matrix: 'water', min: '5', max: '1', actor}, /check|violates/i);
  await call('add-set', {code: 'test-gw', name: 'Test groundwater values', matrix: 'water', source: 'https://example.org/guideline', actor});
  await fails('add-set', {code: 'test-gw2', name: 'No source', matrix: 'water', source: 'my notes', actor}, /URL/);
  await call('add-criterion', {set: 'TEST-GW', analyte: 'Ammonia as N', unit: 'mg/L', max: '1.5', actor});
  await fails('add-criterion', {set: 'DIS.900', analyte: 'zinc', unit: 'mg/L', max: '1', actor}, /use add-limit/);
  await call('apply-set', {site: 'TST', set: 'TEST-GW', kind: 'groundwater', actor});
  await fails('apply-set', {site: 'TST', set: 'DIS.900', actor}, /apply to their own site/);
  assert.equal((await call('criteria', {site: 'TST'})).length, 3);
  await call('plan', {location: 'TST/DP1', suite: 'Discharge', every: '7', consent: 'DIS.900', actor});
  await fails('plan', {location: 'TST/DP1', suite: 'Discharge', every: '7', consent: 'EPL 20871', actor}, /different site/);
  assert(await has('TST/DP1', 'MONITORING-OVERDUE', 1) === false, 'a never-sampled round is due today, not overdue');
  await call('sample', {site: 'TST', code: 'TST-DP1-01', date: day(-12), matrix: 'water', location: 'TST/DP1', lab: 'Test Lab', report: 'TL-1', submitted: day(-11), actor});
  await call('sample', {site: 'TST', code: 'TST-DUP-01', date: day(-12), matrix: 'water', type: 'field-duplicate', parent: 'TST-DP1-01', actor});
  await call('sample', {site: 'TST', code: 'TST-BH1-01', date: day(-12), matrix: 'water', location: 'TST/BH1', actor});
  await fails('sample', {site: 'TST', code: 'TST-X', date: day(-1), matrix: 'water', actor}, /--location is required/);
  await fails('sample', {site: 'TST', code: 'TST-Y', date: day(-1), matrix: 'water', type: 'field-duplicate', actor}, /--parent is required/);
  await fails('sample', {site: 'TST', code: 'TST-Z', date: day(2), matrix: 'water', location: 'TST/DP1', actor}, /future/);
  await fails('sample', {site: 'TST', code: 'TST-W', date: day(-1), matrix: 'water', location: 'KLF/SW-DS', actor}, /not on this site/);
  assert(await has('TST/DP1', 'MONITORING-OVERDUE', 1), 'a weekly round last done 12 days ago is overdue');
  const r1 = await call('result', {sample: 'TST-DP1-01', analyte: 'TSS', value: '45', unit: 'mg/L', analysed: day(-10), received: day(-8), actor}); assert.match(r1.exceeds, /DIS\.900 30 g\/m3/);
  await call('result', {sample: 'TST-DP1-01', analyte: 'ph', value: '5.4', unit: 'pH units', received: day(-8), actor});
  await fails('result', {sample: 'TST-DP1-01', analyte: 'tss', value: '40', unit: 'mg/L', actor}, /already has/);
  await fails('result', {sample: 'TST-DP1-01', analyte: 'zinc', nd: true, unit: 'mg/L', actor}, /--lor is required/);
  await fails('result', {sample: 'TST-DP1-01', analyte: 'zinc', value: '1', nd: true, lor: '0.1', unit: 'mg/L', actor}, /Give --value, or --nd/);
  await fails('result', {sample: 'TST-DP1-01', analyte: 'zinc', value: '1', unit: 'mg/L', analysed: day(-20), actor}, /before the sample date/);
  await call('result', {sample: 'TST-DUP-01', analyte: 'tss', value: '25', unit: 'mg/L', actor});
  await call('result', {sample: 'TST-BH1-01', analyte: 'ammonia as n', value: '1800', unit: 'ug/L', actor});
  assert(await has('TST/TST-DP1-01', 'CONSENT-NOTIFY', 1), 'received 8 days ago, 3 days to notify');
  assert(await has('TST/TST-DUP-01', 'POLICY-RPD', 2), 'TSS 45 against 25 is RPD 57%');
  assert(await has('TST/TST-BH1-01', 'GUIDELINE-TEST-GW', 2), '1800 ug/L against 1.5 mg/L converts');
  assert.equal((await call('exceedances', {site: 'TST', kind: 'consent'})).length, 2, 'TSS and a pH under the minimum');
  await fails('notify', {sample: 'TST-BH1-01', analyte: 'ammonia as n', action: 'notified', actor}, /does not exceed a consent/);
  await fails('notify', {sample: 'TST-DP1-01', analyte: 'ph', action: 'not-required', actor}, /--note is required/);
  await fails('notify', {sample: 'TST-DP1-01', analyte: 'tss', action: 'notified', date: day(1), actor}, /future/);
  await call('notify', {sample: 'TST-DP1-01', analyte: 'tss', action: 'notified', ref: 'TRC-77', date: day(-7), actor});
  await call('notify', {sample: 'TST-DP1-01', analyte: 'ph', action: 'not-required', note: 'Meter fault, lab pH 7.1; agreed with the council officer', actor});
  assert(!(await has('TST/TST-DP1-01', 'CONSENT-NOTIFY')), 'both exceedances actioned');
  assert(await has('TST/TST-DP1-01', 'CONSENT-LIMIT', 3), 'an actioned exceedance stays on the record at severity 3');
  await call('report-submitted', {consent: 'DIS.900', date: day(-1), actor});
  await call('renewal-lodged', {consent: 'AUT.031207.01', date: day(0), actor});
  assert(!(await has('AUT.031207.01', 'NZ-RMA-124')), 'a lodged renewal clears s124');
  await fails('renewal-lodged', {consent: 'AUT', date: day(3), actor}, /future/);
  await fails('close-site', {site: 'TST', reason: 'done', actor}, /Active consents/);
  await call('add-site', {code: 'OLD', name: 'Old Site', country: 'AU', actor}); await call('close-site', {site: 'OLD', reason: 'Validation complete', actor});
  await fails('close-site', {site: 'OLD', reason: 'again', actor}, /already closed/);
  assert.equal((await call('log', {record: 'tst-dp1-01', note: 'Turbid after rain', actor})).record, 'TST-DP1-01');
  await fails('log', {record: 'nothing', note: 'x', actor}, /No site, consent or sample/);
  assert((await call('activity', {record: 'TST'})).length >= 8); assert((await call('activity')).length > 10);
  await fails('site', {site: 'zzz'}, /No matching sites/);
  await fails('nosuch', {}, /Unknown command/);
  await fails('results', {json: 'x'}, /bare flag/);

  // ---- import: an EQuIS EDD, US dates, aliases, a new location, a non-detect, a duplicate
  const fx = path.join(REPO_ROOT, 'fixtures', 'equis.csv');
  await fails('import', {site: 'KLF', file: fx, dates: 'dmy', actor}, /real ISO date|future/, ['equis']);
  const dry = await call('import', {site: 'KLF', file: fx, actor, 'dry-run': true}, ['equis']); assert.equal(dry.results_added, 6); assert.equal(dry.dry_run, true);
  assert.equal((await call('results', {site: 'KLF', since: '2026-03-01'})).filter(r => r.sample.endsWith('-E1')).length, 0, 'dry run writes nothing');
  const imp = await call('import', {site: 'KLF', file: fx, actor}, ['equis']);
  assert.deepEqual([imp.samples_added, imp.results_added, imp.locations_added, imp.dates], [3, 6, 1, 'mdy']);
  const again = await call('import', {site: 'KLF', file: fx, actor}, ['equis']); assert.deepEqual([again.samples_added, again.results_added, again.results_unchanged], [0, 0, 6]);
  const e1 = await call('results', {location: 'KLF/SW-DS', since: '2026-03-01', analyte: 'ammoniacal'}); assert(e1.some(r => r.sample === 'KLF-SWDS-E1' && r.result === '0.95' && r.fraction === ''));
  const bh4 = await call('results', {location: 'KLF/BH04', since: '2026-03-01'}); assert(bh4.some(r => r.analyte === 'cadmium' && r.result === '<0.00005' && r.fraction === 'dissolved'));
  assert((await call('duplicates')).some(d => d.duplicate === 'KLF-QC-E1' && Number(d.rpd_pct) === 7.5));
  assert.equal((await call('locations', {site: 'KLF', kind: 'groundwater'})).length, 4);
  const changed = path.join(dir, 'changed.csv'); fs.writeFileSync(changed, fs.readFileSync(fx, 'utf8').replace('0.95,Y', '0.99,Y'));
  await fails('import', {site: 'KLF', file: changed, actor}, /changed since the last import/, ['equis']);
  assert.equal((await call('results', {location: 'KLF/BH04', since: '2026-03-01'})).length, 3, 'a failed import rolls back');
  const lab = path.join(dir, 'lab.csv');
  fs.writeFileSync(lab, 'Sample ID,Location,Date Sampled,Matrix,Analyte,Result,Units,LOR\nTST-LAB-1,DP1,14/03/2026,Water,Total Suspended Solids,12,g/m3,3\nTST-LAB-1,DP1,14/03/2026,Water,Zinc,<0.001,mg/L,\n');
  const li = await call('import', {site: 'TST', file: lab, actor}, ['lab']); assert.deepEqual([li.results_added, li.dates], [2, 'dmy']);
  const mapped = path.join(dir, 'mapped.csv'); fs.writeFileSync(mapped, 'Bore,Code,When,Mx,Test,Val,U\nBH1,TST-MAP-1,2026-03-20,WG,Ammonia as N,0.4,mg/L\n');
  const mapFile = path.join(dir, 'map.json'); fs.writeFileSync(mapFile, JSON.stringify({location: 'Bore', sample: 'Code', sampled: 'When', matrix: 'Mx', analyte: 'Test', value: 'Val', unit: 'U'}));
  assert.equal((await call('import', {site: 'TST', file: mapped, map: mapFile, actor}, ['lab'])).results_added, 1);
  fs.writeFileSync(mapFile, JSON.stringify({nonsense: 'Bore'})); await fails('import', {site: 'TST', file: mapped, map: mapFile, actor}, /Unknown or invalid map field/, ['lab']);
  const bad = path.join(dir, 'bad.csv'); fs.writeFileSync(bad, 'Sample ID,Location,Date Sampled,Matrix,Analyte,Result,Units,LOR\nX1,DP1,14/03/2026,Water,Zinc,,mg/L,\n');
  await fails('import', {site: 'TST', file: bad, actor}, /no LOR/, ['lab']);
  fs.writeFileSync(bad, 'Sample ID,Location,Date Sampled,Matrix,Analyte,Result,Units\nX1,DP1,14/03/2026,Lava,Zinc,1,mg/L\n'); await fails('import', {site: 'TST', file: bad, actor}, /matrix/, ['lab']);
  await fails('import', {site: 'TST', file: bad, actor}, /import equis\|lab/, ['csv']);

  const backup = JSON.parse(fs.readFileSync((await call('export')).file, 'utf8'));
  assert.equal(Object.keys(backup.records).length, 13); assert(backup.records.results.length > 80); assert(backup.records.activity.length > 30);
  assert(human(await call('sites')).includes('KLF'));
  assert.equal(Object.keys(commands).filter(c => !visited.has(c)).length, 0, `Uncovered commands: ${Object.keys(commands).filter(c => !visited.has(c))}`);
  await db.close(); db = null;

  // ---- the CLI as a person runs it, and the rendered pages
  assert.equal(JSON.parse(shell('envdata.mjs', ['sites', '--json'])).length, 5);
  const amb = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts/envdata.mjs'), 'screen', '--sample=KLF-SWDS-0', '--json'], {cwd: REPO_ROOT, env: process.env, encoding: 'utf8'});
  assert.equal(amb.status, 1); assert.match(amb.stderr, /KLF-SWDS-01[\s\S]*KLF-SWDS-02/); assert.equal(amb.stdout, '');
  shell('view.mjs'); shell('docs.mjs');
  const week = fs.readFileSync(path.join(dir, 'views', 'week.html'), 'utf8'); assert(week.includes('Monitoring week')); assert(week.includes('MONITORING-OVERDUE'));
  assert.equal(fs.readdirSync(path.join(dir, 'views')).length, 3);
  assert.equal(fs.readdirSync(path.join(dir, 'docs-out', 'consent-compliance')).length, 3);
  const tables = fs.readdirSync(path.join(dir, 'docs-out', 'results-table')); assert.equal(tables.length, 4, 'every active site with samples, not the closed one');
  const tst = fs.readFileSync(path.join(dir, 'docs-out', 'results-table', tables.find(f => f.startsWith('tst-'))), 'utf8');
  assert(tst.includes('Test Site &lt;script&gt;') || tst.includes('TST Test Site &lt;script&gt;')); assert(!tst.includes('<script>alert'));
  assert(fs.readdirSync(path.join(dir, 'docs-out', 'chain-of-custody')).length >= 3);
  console.log(`PASS: ${Object.keys(commands).length} CLI commands; consent limits and notification, guideline screening with unit conversion, s124 renewals, report dates, monitoring rounds; duplicate, blank, holding time, LOR and turnaround checks; EQuIS and lab imports with rollback, repeats and mapping; drafts, exports and rendered pages (${process.env.TEST_DATABASE_URL ? 'Postgres' : 'PGlite'})`);
} finally { if (db) await db.close(); fs.rmSync(dir, {recursive: true, force: true}); }
