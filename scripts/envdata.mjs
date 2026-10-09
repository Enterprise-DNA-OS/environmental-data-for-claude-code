#!/usr/bin/env node
// The one CLI. Every slash command in .claude/commands drives this file.
//   npm run envdata -- <command> [--option=value] [--json]
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb, REPO_ROOT} from './lib/db.mjs';
import {parseCsv, pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const commands = {
  help: 'Show commands',
  sites: 'Every site with its locations, consents and open findings',
  site: 'One site: locations, consents, criteria applied, monitoring plan, findings and history: --site',
  locations: 'Monitoring locations: optional --site --kind',
  criteria: 'Guideline and consent criteria: optional --set --site',
  results: 'Lab results, newest first: optional --site --location --analyte --since',
  screen: 'Every result of a sample or a lab report against every criterion that applies: --sample or --report',
  exceedances: 'Results over a guideline or consent limit: optional --site --kind=guideline|consent --since',
  trends: 'Latest result against the mean of the four before it, biggest rise first: optional --site --rising',
  duplicates: 'Field duplicate RPDs against their parent and the acceptance limit',
  blanks: 'Detections in trip and rinsate blanks',
  'holding-times': 'Results analysed after the analyte\'s holding time',
  qa: 'Duplicates, blanks, holding times, LORs above criteria and results still at the lab, in one list',
  due: 'Monitoring rounds by due date, overdue first: optional --days=30',
  awaiting: 'Samples at the lab past the agreed turnaround with no results',
  consents: 'Consents and licences: report due, expiry, renewal date, exceedances in 12 months',
  compliance: 'Every rule finding, breached first, with the rule cited',
  attention: 'Everything breached or due, plus rounds due in the next 7 days',
  'weekly-review': 'Findings, exceedances, rounds due, QA, reports and renewals in one report',
  activity: 'Recorded history: optional --record',
  'draft-exceedance-notice': 'Write the notice to the regulator for every un-actioned exceedance on a consent to drafts/: --consent',
  'draft-monitoring-report': 'Write the periodic monitoring report for a consent to drafts/: --consent; optional --from --to',
  'draft-results-letter': 'Write a client letter on one site\'s latest round to drafts/: --site',
  settings: 'Show or change the business: optional --name --country --rpd-water --rpd-soil --results-within --report-lead --actor',
  'add-site': '--code --name --country --actor; optional --client --region',
  'add-location': '--site --code --kind --actor; optional --name',
  'add-consent': '--site --ref --kind=resource-consent|epa-licence --actor; optional --regulator --granted --expires --notify-within --report-every --last-report',
  'add-set': 'A guideline set: --code --name --matrix --source --actor',
  'add-criterion': 'A guideline value: --set --analyte --unit --actor and --max or --min (or both); optional --fraction --note',
  'add-limit': 'A consent or licence limit: --consent --analyte --unit --matrix --actor and --max or --min; optional --location --fraction --note',
  'apply-set': 'Apply a guideline set to a site: --site --set --actor; optional --kind (one location kind only)',
  plan: 'Add or change a monitoring round: --location --suite --every --actor; optional --consent',
  sample: 'Record a sample: --site --code --date --matrix --actor; optional --location --type --parent --depth --sampler --lab --report --submitted',
  result: 'Record one result: --sample --analyte --unit --actor and --value or --nd with --lor; optional --fraction --method --analysed --received --qualifier',
  notify: 'Record what was done about an exceedance: --sample --analyte --action=notified|not-required --actor; optional --ref --date --note',
  'report-submitted': 'Record the monitoring report or annual return as submitted: --consent --actor; optional --date',
  'renewal-lodged': 'Record the replacement application as lodged: --consent --actor; optional --date',
  'close-site': '--site --reason --actor',
  log: '--record --note --actor',
  import: 'equis|lab --site --file=results.csv --actor; optional --map=columns.json --dates=dmy|mdy --dry-run',
  export: 'Write every record to a JSON backup in exports/',
};

// ------------------------------------------------------------------ input checks

const required = (o, k) => { if (typeof o[k] !== 'string' || !o[k].trim()) throw Error(`--${k} is required`); return o[k].trim(); };
const today = () => new Date().toISOString().slice(0, 10);
export function date(value, label = 'date', nullable = true) {
  if ((value === null || value === undefined || value === '') && nullable) return null;
  const s = String(value ?? '').trim();
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== s) throw Error(`${label} must be a real ISO date (YYYY-MM-DD)`);
  return s;
}
const intIn = (v, lo, hi, label) => { const s = String(v ?? ''); if (!/^\d+$/.test(s) || Number(s) < lo || Number(s) > hi) throw Error(`--${label} must be a whole number from ${lo} to ${hi}`); return Number(s); };
export function num(v, label) { const s = String(v ?? '').replace(/,/g, '').trim(); if (!/^-?\d+(\.\d+)?([eE]-?\d+)?$/.test(s) || !Number.isFinite(Number(s))) throw Error(`${label} must be a number`); return s; }
const oneOf = (v, choices, label) => { if (!choices.includes(v)) throw Error(`--${label} must be ${choices.join('|')}`); return v; };
const KINDS = ['groundwater', 'surface-water', 'discharge', 'leachate', 'soil', 'sediment', 'air'];
const MATRICES = ['water', 'soil', 'sediment', 'air'];
const FRACTIONS = ['', 'total', 'dissolved'];
// Labs write the same unit five ways. Store one spelling so limits and results compare.
export function unit(v) {
  const s = String(v ?? '').trim().replace(/µ|μ/g, 'u');
  const known = {'mg/l': 'mg/L', 'ug/l': 'ug/L', 'g/m3': 'g/m3', 'mg/kg': 'mg/kg', 'ug/kg': 'ug/kg', 'ph units': 'pH units', 'ph unit': 'pH units', 'ph': 'pH units', 'us/cm': 'uS/cm', 'ntu': 'NTU', 'cfu/100ml': 'cfu/100mL', 'mpn/100ml': 'MPN/100mL', '%': '%', 'deg c': 'deg C'};
  if (!s) throw Error('unit is required');
  return known[s.toLowerCase()] || s;
}
// Lab names for the same analyte differ. Common ones map to one name; a CAS number in the analytes table wins.
const ALIASES = {'ammonia as n': 'ammoniacal nitrogen', 'ammonia-n': 'ammoniacal nitrogen', 'nh4-n': 'ammoniacal nitrogen', 'ammoniacal-n': 'ammoniacal nitrogen', 'ammonia (as n)': 'ammoniacal nitrogen',
  tss: 'total suspended solids', 'suspended solids': 'total suspended solids', 'oil & grease': 'oil and grease', 'ph (field)': 'ph', 'ph (lab)': 'ph', 'ph value': 'ph'};
export const analyteName = v => { const s = String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' '); if (!s) throw Error('analyte is required'); return ALIASES[s] || s; };
function args(argv) {
  const o = {}, p = [];
  for (const a of argv) {
    if (!a.startsWith('--')) { p.push(a); continue; }
    const i = a.indexOf('='); const k = a.slice(2, i < 0 ? undefined : i);
    if (Object.hasOwn(o, k)) throw Error(`Repeated --${k}`);
    o[k] = i < 0 ? true : a.slice(i + 1);
  }
  return {o, p};
}

// ------------------------------------------------------------------ records

// Exact id or code first, then a unique partial match. Ambiguous lists and fails.
export async function resolve(db, kind, search) {
  if (typeof search !== 'string' || !search.trim()) throw Error('Record reference is required');
  const s = search.trim();
  const q = {
    sites: ['select * from sites where id::text=lower($1) or lower(code)=lower($1) or lower(name)=lower($1)',
      'select * from sites where starts_with(id::text,lower($1)) or strpos(lower(name),lower($1))>0 or strpos(lower(code),lower($1))>0 or strpos(lower(client),lower($1))>0 order by code', r => `${r.id}  ${r.code}  ${r.name}`],
    locations: ["select l.* from locations l join sites t on t.id=l.site_id where l.id::text=lower($1) or lower(t.code || '/' || l.code)=lower($1) or lower(l.code)=lower($1)",
      "select l.*, t.code as site from locations l join sites t on t.id=l.site_id where starts_with(l.id::text,lower($1)) or strpos(lower(t.code || '/' || l.code),lower($1))>0 or strpos(lower(l.name),lower($1))>0 order by t.code,l.code", r => `${r.id}  ${r.site ? r.site + '/' : ''}${r.code}  ${r.name}`],
    samples: ['select * from samples where id::text=lower($1) or lower(code)=lower($1)',
      'select * from samples where starts_with(id::text,lower($1)) or strpos(lower(code),lower($1))>0 order by code', r => `${r.id}  ${r.code}  ${r.sampled_on}`],
    consents: ['select * from consents where id::text=lower($1) or lower(ref)=lower($1)',
      'select * from consents where starts_with(id::text,lower($1)) or strpos(lower(ref),lower($1))>0 order by ref', r => `${r.id}  ${r.ref}`],
    sets: ['select * from criteria_sets where id::text=lower($1) or lower(code)=lower($1)',
      'select * from criteria_sets where starts_with(id::text,lower($1)) or strpos(lower(code),lower($1))>0 or strpos(lower(name),lower($1))>0 order by code', r => `${r.id}  ${r.code}  ${r.name}`],
  }[kind];
  if (!q) throw Error('Unknown record type');
  const exact = await db.query(q[0], [s]);
  if (exact.length === 1) return exact[0];
  const rows = exact.length > 1 ? exact : await db.query(q[1], [s]);
  if (rows.length === 1) return rows[0];
  throw Error(rows.length ? `Ambiguous ${kind}:\n${rows.map(q[2]).join('\n')}` : `No matching ${kind}: ${s}`);
}
async function audit(db, kind, ref, actor, action, note = '') { await db.query('insert into activity(record_kind,record_ref,actor,action,note) values($1,$2,$3,$4,$5)', [kind, ref, actor, action, note]); }
async function transaction(db, fn, dry = false) { await db.exec('begin'); try { const r = await fn(); await db.exec(dry ? 'rollback' : 'commit'); return r; } catch (e) { await db.exec('rollback'); throw e; } }
async function insert(db, t, data) { const k = Object.keys(data); return (await db.query(`insert into ${t}(${k.join(',')}) values(${k.map((_, i) => `$${i + 1}`).join(',')}) returning *`, Object.values(data)))[0]; }
async function update(db, t, id, data) { const k = Object.keys(data); if (!k.length) throw Error('No changed fields supplied'); return (await db.query(`update ${t} set ${k.map((c, i) => `${c}=$${i + 1}`).join(',')} where id=$${k.length + 1} returning *`, [...Object.values(data), id]))[0]; }
function writeDraft(prefix, text) { const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts'); fs.mkdirSync(dir, {recursive: true}); const file = path.join(dir, `${prefix}-${today()}-${randomUUID().slice(0, 8)}.md`); fs.writeFileSync(file, text, {flag: 'wx'}); return file; }
const block = rows => '```\n' + human(rows) + '\n```';
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const org = async db => (await db.query('select * from organisation'))[0] || {name: 'Your Business', country: 'NZ'};
const limits = (r, u = r.limit_unit) => `${r.limit_low !== null && r.limit_low !== undefined ? r.limit_low + ' to ' : ''}${r.limit_high ?? ''} ${u}`.trim();
const findingsFor = (db, like) => db.query('select severity,rule,reference,finding from compliance_findings where reference like $1 order by severity,rule,reference', [like]);

// ------------------------------------------------------------------ import (EQuIS EDD or a lab's CSV)

export const importFields = {
  location: ['sys_loc_code', 'Location', 'Location Code', 'Location ID', 'Site Location'], sample: ['sys_sample_code', 'Sample ID', 'Sample Code', 'Client Sample ID', 'Sample Name', 'Field ID'],
  sampled: ['sample_date', 'Sample Date', 'Sampled Date', 'Date Sampled', 'Sampled'], sample_type: ['sample_type_code', 'Sample Type', 'QC Type'], parent: ['parent_sample_code', 'Parent Sample', 'Parent Sample ID'],
  matrix: ['matrix_code', 'sample_matrix_code', 'Matrix'], depth: ['start_depth', 'Depth', 'Depth (m)', 'Top Depth'], lab: ['lab_name_code', 'Lab', 'Laboratory'],
  report: ['lab_sdg', 'sample_delivery_group', 'Lab Report', 'Report Number', 'Batch', 'Work Order'], analyte: ['chemical_name', 'Analyte', 'Parameter', 'Compound'],
  cas: ['cas_rn', 'CAS', 'CAS Number'], fraction: ['fraction', 'Fraction'], value: ['result_value', 'Result', 'Value'], unit: ['result_unit', 'Units', 'Unit'],
  detected: ['detect_flag', 'Detected', 'Detect'], lor: ['reporting_detection_limit', 'LOR', 'Reporting Limit', 'PQL', 'Detection Limit'], method: ['lab_anl_method_name', 'Method', 'Analytical Method'],
  analysed: ['analysis_date', 'Analysed Date', 'Analysis Date', 'Date Analysed'], qualifier: ['lab_qualifiers', 'Qualifier', 'Lab Qualifier'],
};
// EQuIS EDDs write MM/DD/YYYY; NZ and AU labs write day first. --dates says which.
export function importDate(v, label, order) {
  const s = String(v || '').trim(); if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) { const [dd, mm] = order === 'mdy' ? [m[2], m[1]] : [m[1], m[2]]; return date(`${m[3]}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`, label, false); }
  return date(s.slice(0, 10), label, false);
}
const MATRIX_CODES = {wg: ['water', 'groundwater'], gw: ['water', 'groundwater'], ws: ['water', 'surface-water'], sw: ['water', 'surface-water'], wl: ['water', 'leachate'], ww: ['water', 'discharge'], w: ['water', 'surface-water'], water: ['water', 'surface-water'],
  wq: ['water', 'surface-water'], so: ['soil', 'soil'], s: ['soil', 'soil'], soil: ['soil', 'soil'], se: ['sediment', 'sediment'], sediment: ['sediment', 'sediment'], aa: ['air', 'air'], a: ['air', 'air'], air: ['air', 'air']};
const TYPE_CODES = {n: 'normal', normal: 'normal', fd: 'field-duplicate', dup: 'field-duplicate', 'field duplicate': 'field-duplicate', tb: 'trip-blank', 'trip blank': 'trip-blank', eb: 'rinsate-blank', rb: 'rinsate-blank', 'rinsate blank': 'rinsate-blank', 'equipment blank': 'rinsate-blank'};
async function importResults(db, source, o) {
  const actor = required(o, 'actor'), file = required(o, 'file'), site = await resolve(db, 'sites', required(o, 'site'));
  const order = o.dates ? oneOf(o.dates, ['dmy', 'mdy'], 'dates') : source === 'equis' ? 'mdy' : 'dmy';
  const rows = parseCsv(fs.readFileSync(file, 'utf8')); if (!rows.length) throw Error('CSV has no records');
  let map = {};
  if (o.map) {
    map = JSON.parse(fs.readFileSync(required(o, 'map'), 'utf8'));
    if (!map || typeof map !== 'object' || Array.isArray(map)) throw Error('Column map must be an object');
    for (const [k, v] of Object.entries(map)) if (!(k in importFields) || typeof v !== 'string' || !v.trim()) throw Error(`Unknown or invalid map field: ${k}`);
    for (const column of Object.values(map)) if (!Object.keys(rows[0]).some(k => k.toLowerCase() === column.toLowerCase())) throw Error(`Mapped column missing: ${column}`);
  }
  const cas = new Map((await db.query("select name,cas from analytes where cas<>''")).map(r => [r.cas, r.name]));
  const metals = new Set((await db.query("select name from analytes where analyte_group='metals'")).map(r => r.name));
  const samples = new Map(), results = [], seen = new Set();
  for (const [i, row] of rows.entries()) {
    const at = `Row ${i + 2}`;
    const read = k => String(map[k] ? pick(row, map[k]) : pick(row, ...importFields[k])).trim();
    const code = read('sample'); if (!code) throw Error(`${at}: a sample code is required; map your headings with --map`);
    const type = TYPE_CODES[read('sample_type').toLowerCase() || 'n']; if (!type) throw Error(`${at}: sample type ${read('sample_type')} is not N, FD, TB or EB/RB`);
    const mx = MATRIX_CODES[read('matrix').toLowerCase()]; if (!mx) throw Error(`${at}: matrix ${read('matrix') || '(blank)'} is not a water, soil, sediment or air code`);
    const sampled = importDate(read('sampled'), `${at} sample date`, order); if (!sampled) throw Error(`${at}: sample date is required`);
    if (sampled > today()) throw Error(`${at}: sample date ${sampled} is in the future: check --dates=${order === 'mdy' ? 'dmy' : 'mdy'}`);
    const s = {code, type, matrix: mx[0], kind: mx[1], sampled, location: read('location'), parent: read('parent'), depth: read('depth') ? num(read('depth'), `${at} depth`) : null, lab: read('lab'), report: read('report')};
    if (type === 'normal' && !s.location) throw Error(`${at}: sample ${code} has no location`);
    if (type === 'field-duplicate' && !s.parent) throw Error(`${at}: duplicate ${code} has no parent sample`);
    const prev = samples.get(code.toLowerCase());
    if (prev && (prev.sampled !== s.sampled || prev.location.toLowerCase() !== s.location.toLowerCase() || prev.type !== s.type)) throw Error(`${at}: sample ${code} appears with a different date, location or type`);
    if (!prev) samples.set(code.toLowerCase(), s);
    const casNo = read('cas'), analyte = (casNo && cas.get(casNo)) || analyteName(read('analyte'));
    const fr = read('fraction').toLowerCase(), fraction = fr === 'd' || fr === 'dissolved' ? 'dissolved' : (fr === 't' || fr === 'total') && metals.has(analyte) ? 'total' : ''; // EQuIS marks most tests T; only metals have a second fraction
    let raw = read('value'), flag = read('detected').toLowerCase(), lor = read('lor').replace(/^</, '');
    if (raw.startsWith('<')) { lor = lor || raw.slice(1); raw = ''; flag = 'n'; }
    const detected = flag ? ['y', 'yes', 'true', '1'].includes(flag) : raw !== '';
    if (detected && raw === '') throw Error(`${at}: ${analyte} is flagged detected with no value`);
    if (!detected && !lor) throw Error(`${at}: ${analyte} is not detected and has no LOR`);
    const key = `${code.toLowerCase()}|${analyte}|${fraction}`; if (seen.has(key)) throw Error(`${at}: ${analyte} appears twice for ${code}`); seen.add(key);
    results.push({sample: code.toLowerCase(), analyte, cas: casNo, fraction, value: detected ? num(raw, `${at} result`) : null, unit: unit(read('unit')), detected, lor: lor ? num(lor, `${at} LOR`) : null,
      method: read('method'), analysed_on: importDate(read('analysed'), `${at} analysis date`, order), lab_qualifier: read('qualifier')});
  }
  return transaction(db, async () => {
    let samples_added = 0, samples_existing = 0, added = 0, unchanged = 0, locations_added = 0; const ids = new Map();
    const ordered = [...samples.values()].sort((a, b) => (a.type === 'field-duplicate') - (b.type === 'field-duplicate'));
    for (const s of ordered) {
      let loc = null;
      if (s.location) {
        loc = (await db.query('select * from locations where site_id=$1 and lower(code)=lower($2)', [site.id, s.location]))[0];
        if (!loc) { loc = await insert(db, 'locations', {site_id: site.id, code: s.location, kind: s.kind}); locations_added++; await audit(db, 'site', site.code, actor, 'import', `Location ${s.location} created from the ${source} import`); }
      }
      let parent = null;
      if (s.parent) { parent = ids.get(s.parent.toLowerCase()) || (await db.query('select * from samples where lower(code)=lower($1)', [s.parent]))[0]; if (!parent) throw Error(`Duplicate ${s.code}: parent ${s.parent} is not in the file or the database`); }
      const old = (await db.query('select * from samples where lower(code)=lower($1)', [s.code]))[0];
      if (old) {
        if (old.site_id !== site.id || old.sampled_on !== s.sampled || old.sample_type !== s.type || (loc && old.location_id !== loc.id)) throw Error(`Sample ${s.code} is already recorded with a different site, date, type or location. Reconcile it by hand before re-importing.`);
        ids.set(s.code.toLowerCase(), old); samples_existing++; continue;
      }
      const row = await insert(db, 'samples', {site_id: site.id, location_id: s.type === 'field-duplicate' ? null : loc?.id ?? null, code: s.code, sampled_on: s.sampled, matrix: s.matrix, sample_type: s.type,
        parent_id: s.type === 'field-duplicate' ? parent.id : null, depth_m: s.depth, lab: s.lab, lab_report: s.report, submitted_on: s.sampled, source_id: `${source}:${s.code}`});
      ids.set(s.code.toLowerCase(), row); samples_added++;
    }
    for (const r of results) {
      const sample = ids.get(r.sample); const {sample: _, ...data} = r;
      const old = (await db.query('select * from results where sample_id=$1 and analyte=$2 and fraction=$3', [sample.id, r.analyte, r.fraction]))[0];
      if (old) {
        const same = old.detected === r.detected && old.unit === r.unit && Number(old.value ?? NaN) === Number(r.value ?? NaN) || (old.value === null && r.value === null && old.detected === r.detected && Number(old.lor) === Number(r.lor) && old.unit === r.unit);
        if (!same) throw Error(`${sample.code} ${r.analyte} changed since the last import (${old.value ?? '<' + old.lor} ${old.unit} now ${r.value ?? '<' + r.lor} ${r.unit}). Reconcile it by hand before re-importing.`);
        unchanged++; continue;
      }
      await insert(db, 'results', {...data, sample_id: sample.id, received_on: today(), source}); added++;
    }
    await audit(db, 'site', site.code, actor, 'import', `${source}: ${samples_added} samples, ${added} results from ${path.basename(file)}`);
    return {site: site.code, source, dates: order, samples_added, samples_existing, results_added: added, results_unchanged: unchanged, locations_added, dry_run: Boolean(o['dry-run'])};
  }, Boolean(o['dry-run']));
}

// ------------------------------------------------------------------ drafts

async function draftExceedanceNotice(db, o) {
  const k = await resolve(db, 'consents', required(o, 'consent')); const g = await org(db);
  const site = (await db.query('select * from sites where id=$1', [k.site_id]))[0];
  const rows = await db.query("select sample,location,sampled_on,received_on,analyte,fraction,value,unit,limit_low,limit_high,limit_unit,times_limit,notify_by from exceedances where consent_id=$1 and action is null order by sampled_on,location,analyte", [k.id]);
  if (!rows.length) throw Error(`No un-actioned exceedances on ${k.ref}`);
  const law = site.country === 'AU' ? 'If this is a pollution incident that causes or threatens material harm, POEO Act 1997 s148 requires notification immediately, by phone to the EPA Environment Line first. Confirm with the licensee before you send this.' : 'Check the notification condition in the consent for the time limit and who to send it to.';
  const text = `# Exceedance notice: ${k.ref}\n\nDRAFT. Nothing has been sent. ${law}\n\nTo: ${k.regulator || '[regulator]'}\nFrom: ${g.name} on behalf of ${site.client || site.name}\nRe: ${k.ref}, ${site.name}\n\n` +
    `We are writing to notify you of ${rows.length === 1 ? 'a result' : `${rows.length} results`} above the limits in ${k.ref}.\n\n| Sample | Location | Sampled | Results received | Analyte | Result | Limit |\n|---|---|---|---|---|---|---|\n` +
    rows.map(r => `| ${r.sample} | ${r.location} | ${r.sampled_on} | ${r.received_on || ''} | ${r.analyte}${r.fraction ? ` (${r.fraction})` : ''} | ${r.value} ${r.unit} | ${limits(r)} |`).join('\n') +
    `\n\n## What we know\n\n[cause, if known]\n\n## What has been done\n\n[actions taken on site, resampling booked]\n\n## Next steps\n\nWe will resample and report the results to you by [date].\n\n[your name]\n${g.name}\n`;
  return {file: writeDraft(`exceedance-${slug(k.ref)}`, text), consent: k.ref, exceedances: rows.length};
}

async function draftMonitoringReport(db, o) {
  const k = await resolve(db, 'consents', required(o, 'consent')); const g = await org(db);
  const st = (await db.query('select * from consent_status where id=$1', [k.id]))[0];
  const site = (await db.query('select * from sites where id=$1', [k.site_id]))[0];
  const from = date(o.from ?? k.last_report_on ?? new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), '--from', false), to = date(o.to ?? today(), '--to', false);
  if (from > to) throw Error('--from is after --to');
  const plan = await db.query('select l.code as location,m.suite,m.every_days from monitoring_plan m join locations l on l.id=m.location_id where m.consent_id=$1 order by l.code', [k.id]);
  const rounds = await db.query("select l.code as location,count(*)::int as samples,min(s.sampled_on) as first,max(s.sampled_on) as last from samples s join locations l on l.id=s.location_id join monitoring_plan m on m.location_id=l.id and m.consent_id=$1 where s.sample_type='normal' and s.sampled_on between $2 and $3 group by l.code order by l.code", [k.id, from, to]);
  const res = await db.query("select location,sample,sampled_on,analyte,fraction,value,unit,detected,lor,limit_low,limit_high,limit_unit,exceeds from result_screen where consent_id=$1 and sampled_on between $2 and $3 order by location,analyte,sampled_on", [k.id, from, to]);
  const exc = await db.query("select sample,location,sampled_on,analyte,value,unit,limit_low,limit_high,limit_unit,coalesce(action,'none recorded') as action,acted_on,action_ref from exceedances where consent_id=$1 and sampled_on between $2 and $3 order by sampled_on", [k.id, from, to]);
  const qa = await db.query("select rule,reference,finding from compliance_findings where rule in ('POLICY-HOLDING','POLICY-RPD','POLICY-BLANK','POLICY-LOR') and reference like $1 order by rule,reference", [`${site.code}/%`]);
  const missed = (await db.query("select location,suite,next_due,days_overdue from monitoring_due where consent=$1 and days_overdue>0", [k.ref]));
  const text = `# Monitoring report: ${k.ref}\n\nDRAFT for review by the consent holder. Nothing has been sent.\n\n| | |\n|---|---|\n| Consent holder | ${site.client || '[consent holder]'} |\n| Site | ${site.name} |\n| ${k.kind === 'epa-licence' ? 'Licence' : 'Consent'} | ${k.ref} (${k.regulator}) |\n| Period | ${from} to ${to} |\n| Prepared by | ${g.name} |\n\n` +
    `## Monitoring required and done\n\n${block(plan)}\n\n${block(rounds)}\n\n${missed.length ? `Rounds not done on time:\n\n${block(missed)}\n\n` : 'Every required round was done on time.\n\n'}` +
    `## Results against the limits\n\n${block(res.map(r => ({location: r.location, sampled: r.sampled_on, analyte: r.analyte + (r.fraction ? ` (${r.fraction})` : ''), result: r.detected ? `${r.value} ${r.unit}` : `<${r.lor} ${r.unit}`, limit: limits(r), complies: r.exceeds ? 'NO' : 'yes'})))}\n\n` +
    `## Exceedances and what was done\n\n${exc.length ? block(exc) : 'No result exceeded a limit in the period.'}\n\n## Data quality\n\n${qa.length ? block(qa) : 'No duplicate, blank, holding time or LOR issue was found.'}\n\n` +
    `## Next report\n\nDue ${st?.report_due || '[date]'}.${k.expires_on ? ` The ${k.kind === 'epa-licence' ? 'licence' : 'consent'} expires ${k.expires_on}.` : ''}\n`;
  return {file: writeDraft(`monitoring-report-${slug(k.ref)}`, text), consent: k.ref, from, to, results: res.length, exceedances: exc.length};
}

async function draftResultsLetter(db, o) {
  const t = await resolve(db, 'sites', required(o, 'site')); const g = await org(db);
  const last = (await db.query("select max(sampled_on) as d from samples where site_id=$1 and sample_type='normal' and exists (select 1 from results r where r.sample_id=samples.id)", [t.id]))[0].d;
  if (!last) throw Error(`No results recorded at ${t.code}`);
  const round = await db.query("select location,analyte,result,unit,criteria,exceeds from latest_results where site_id=$1 and sampled_on>=$2::date-14 order by exceeds desc,location,analyte", [t.id, last]);
  const over = round.filter(r => r.exceeds);
  const qa = await findingsFor(db, `${t.code}/%`);
  const text = `# Results letter: ${t.name}\n\nDRAFT. Nothing has been sent. Check every number against the lab report before it goes to ${t.client || 'the client'}.\n\nHi [name],\n\n` +
    `The results from the round ending ${last} at ${t.name} are back. ${over.length ? `${over.length} result${over.length === 1 ? ' is' : 's are'} above the criteria that apply:` : 'No result is above the criteria that apply.'}\n\n` +
    (over.length ? over.map(r => `- ${r.location}: ${r.analyte} ${r.result} ${r.unit} (criteria ${r.criteria})`).join('\n') + '\n\n' : '') +
    `The full table is below.\n\n${block(round.map(({exceeds, ...r}) => ({...r, over: exceeds ? 'yes' : ''})))}\n\n` +
    (qa.filter(f => f.rule.startsWith('POLICY')).length ? `Data quality notes:\n\n${qa.filter(f => f.rule.startsWith('POLICY')).map(f => `- ${f.finding}`).join('\n')}\n\n` : '') +
    `[what this means and what we recommend]\n\n[your name]\n${g.name}\n`;
  return {file: writeDraft(`results-${slug(t.code)}`, text), site: t.code, round_ending: last, results: round.length, over_criteria: over.length};
}

// ------------------------------------------------------------------ run

const ALLOWED = {
  help: [], sites: [], site: ['site'], locations: ['site', 'kind'], criteria: ['set', 'site'], results: ['site', 'location', 'analyte', 'since'], screen: ['sample', 'report'],
  exceedances: ['site', 'kind', 'since'], trends: ['site', 'rising'], duplicates: [], blanks: [], 'holding-times': [], qa: [], due: ['days'], awaiting: [], consents: [], compliance: [], attention: [], 'weekly-review': [],
  activity: ['record'], 'draft-exceedance-notice': ['consent'], 'draft-monitoring-report': ['consent', 'from', 'to'], 'draft-results-letter': ['site'],
  settings: ['name', 'country', 'rpd-water', 'rpd-soil', 'results-within', 'report-lead', 'actor'], 'add-site': ['code', 'name', 'country', 'client', 'region', 'actor'],
  'add-location': ['site', 'code', 'kind', 'name', 'actor'], 'add-consent': ['site', 'ref', 'kind', 'regulator', 'granted', 'expires', 'notify-within', 'report-every', 'last-report', 'actor'],
  'add-set': ['code', 'name', 'matrix', 'source', 'actor'], 'add-criterion': ['set', 'analyte', 'unit', 'max', 'min', 'fraction', 'note', 'actor'],
  'add-limit': ['consent', 'analyte', 'unit', 'matrix', 'max', 'min', 'location', 'fraction', 'note', 'actor'], 'apply-set': ['site', 'set', 'kind', 'actor'],
  plan: ['location', 'suite', 'every', 'consent', 'actor'], sample: ['site', 'code', 'date', 'matrix', 'location', 'type', 'parent', 'depth', 'sampler', 'lab', 'report', 'submitted', 'actor'],
  result: ['sample', 'analyte', 'unit', 'value', 'nd', 'lor', 'fraction', 'method', 'analysed', 'received', 'qualifier', 'actor'], notify: ['sample', 'analyte', 'action', 'ref', 'date', 'note', 'actor'],
  'report-submitted': ['consent', 'date', 'actor'], 'renewal-lodged': ['consent', 'date', 'actor'], 'close-site': ['site', 'reason', 'actor'], log: ['record', 'note', 'actor'],
  import: ['site', 'file', 'map', 'dates', 'dry-run', 'actor'], export: [],
};
const sinceOf = o => date(o.since ?? new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), 'since', false);

export async function run(db, argv) {
  const {o, p} = args(argv); const command = p[0] || 'help';
  if (!(command in commands)) throw Error(`Unknown command ${command}. Use help.`);
  for (const k of Object.keys(o)) if (k !== 'json' && !ALLOWED[command].includes(k)) throw Error(`Unknown option --${k} for ${command}`);
  for (const k of ['json', 'dry-run', 'nd', 'rising']) if (Object.hasOwn(o, k) && o[k] !== true) throw Error(`--${k} is a bare flag`);
  if (p.length > (command === 'import' ? 2 : 1)) throw Error('Unexpected positional argument');
  const pastOrToday = (v, label) => { const d = date(v ?? today(), label, false); if (d > today()) throw Error(`--${label} cannot be in the future`); return d; };

  switch (command) {
    case 'help': return Object.entries(commands).map(([command, usage]) => ({command, usage}));
    case 'sites': return db.query(`select t.code,t.name,t.client,t.country,t.region,t.status,
        (select count(*)::int from locations l where l.site_id=t.id and l.active) as locations,
        (select string_agg(k.ref, ', ' order by k.ref) from consents k where k.site_id=t.id and k.status='active') as consents,
        (select max(s.sampled_on) from samples s where s.site_id=t.id) as last_sampled,
        (select count(*)::int from compliance_findings f where f.reference like t.code || '/%' and f.severity=1)
          + (select count(*)::int from compliance_findings f join consents k on k.ref=f.reference where k.site_id=t.id and f.severity=1) as breached
      from sites t order by t.status,t.code`);
    case 'site': {
      const t = await resolve(db, 'sites', required(o, 'site'));
      return {site: {code: t.code, name: t.name, client: t.client, country: t.country, region: t.region, status: t.status},
        locations: await db.query('select code,name,kind,active from locations where site_id=$1 order by code', [t.id]),
        consents: await db.query('select ref,kind,regulator,expires_on,report_due,days_to_report,exceedances_12m,not_actioned from consent_status where site=$1 order by ref', [t.code]),
        criteria: await db.query("select cs.code,cs.name,coalesce(sc.location_kind,'all locations') as applies_to from site_criteria sc join criteria_sets cs on cs.id=sc.set_id where sc.site_id=$1 order by cs.code", [t.id]),
        monitoring: await db.query('select location,suite,every_days,consent,last_sampled,next_due,days_overdue from monitoring_due where site=$1 order by next_due', [t.code]),
        findings: (await db.query('select f.severity,f.rule,f.reference,f.finding from compliance_findings f left join consents k on k.ref=f.reference where f.reference like $1 or k.site_id=$2 order by f.severity,f.rule', [`${t.code}/%`, t.id])),
        activity: await db.query("select created_at,actor,action,note from activity where record_kind='site' and record_ref=$1 order by created_at desc,id desc limit 20", [t.code])};
    }
    case 'locations': {
      const w = [], v = [];
      if (o.site) { v.push((await resolve(db, 'sites', o.site)).id); w.push(`l.site_id=$${v.length}`); }
      if (o.kind) { v.push(oneOf(o.kind, KINDS, 'kind')); w.push(`l.kind=$${v.length}`); }
      return db.query(`select t.code as site,l.code,l.name,l.kind,l.active,(select max(s.sampled_on) from samples s where s.location_id=l.id) as last_sampled,(select count(*)::int from samples s where s.location_id=l.id) as samples
        from locations l join sites t on t.id=l.site_id ${w.length ? 'where ' + w.join(' and ') : ''} order by t.code,l.code`, v);
    }
    case 'criteria': {
      const w = [], v = [];
      if (o.set) { v.push((await resolve(db, 'sets', o.set)).id); w.push(`cs.id=$${v.length}`); }
      if (o.site) { const t = await resolve(db, 'sites', o.site); v.push(t.id); w.push(`(exists (select 1 from site_criteria sc where sc.set_id=cs.id and sc.site_id=$${v.length}) or exists (select 1 from consents k where k.id=cs.consent_id and k.site_id=$${v.length}))`); }
      return db.query(`select cs.code as set,cs.kind,cs.matrix,c.analyte,c.fraction,c.limit_low,c.limit_high,c.unit,l.code as location from criteria c join criteria_sets cs on cs.id=c.set_id left join locations l on l.id=c.location_id
        ${w.length ? 'where ' + w.join(' and ') : ''} order by cs.code,c.analyte,c.fraction,l.code`, v);
    }
    case 'results': {
      const w = ['d.sampled_on >= $1'], v = [sinceOf(o)];
      if (o.site) { v.push((await resolve(db, 'sites', o.site)).id); w.push(`d.site_id=$${v.length}`); }
      if (o.location) { v.push((await resolve(db, 'locations', o.location)).id); w.push(`d.location_id=$${v.length}`); }
      if (o.analyte) { v.push(analyteName(o.analyte)); w.push(`strpos(d.analyte,$${v.length})>0`); }
      return db.query(`select d.site,d.location,d.sample,d.sample_type,d.sampled_on,d.analyte,d.fraction,case when d.detected then d.value::text else '<' || d.lor end as result,d.unit,d.lab_qualifier,
        exists (select 1 from result_screen x where x.result_id=d.id and x.exceeds) as exceeds
        from result_detail d where ${w.join(' and ')} order by d.sampled_on desc,d.site,d.location,d.analyte`, v);
    }
    case 'screen': {
      if (!o.sample === !o.report) throw Error('Give --sample or --report');
      const rows = o.sample ? await db.query('select * from result_screen where sample=(select code from samples where id=$1) order by analyte,set_code', [(await resolve(db, 'samples', o.sample)).id])
        : await db.query('select x.* from result_screen x join samples s on s.code=x.sample where lower(s.lab_report)=lower($1) order by x.location,x.analyte,x.set_code', [required(o, 'report')]);
      if (!rows.length) throw Error('No results with criteria to screen: apply a guideline set to the site (apply-set) or add consent limits');
      return rows.map(r => ({sample: r.sample, location: r.location, analyte: r.analyte + (r.fraction ? ` (${r.fraction})` : ''), result: r.detected ? `${r.value} ${r.unit}` : `<${r.lor} ${r.unit}`, set: r.set_code, limit: limits(r),
        outcome: r.unit_mismatch ? 'units differ' : r.exceeds ? `OVER${r.times_limit ? ` x${r.times_limit}` : ''}` : !r.detected && r.lor_in_limit_unit > r.limit_high ? 'LOR above limit' : 'ok'}));
    }
    case 'exceedances': {
      const w = ['sampled_on >= $1'], v = [sinceOf(o)];
      if (o.site) { v.push((await resolve(db, 'sites', o.site)).code); w.push(`site=$${v.length}`); }
      if (o.kind) { v.push(oneOf(o.kind, ['guideline', 'consent'], 'kind')); w.push(`set_kind=$${v.length}`); }
      return db.query(`select site,location,sample,sampled_on,analyte,fraction,value,unit,set_code as criterion,limit_low,limit_high,limit_unit,times_limit,set_kind,consent,notify_by,action,acted_on from exceedances where ${w.join(' and ')} order by set_kind desc,sampled_on desc,site,location`, v);
    }
    case 'trends': {
      const w = [], v = [];
      if (o.site) { v.push((await resolve(db, 'sites', o.site)).code); w.push(`site=$${v.length}`); }
      if (o.rising) w.push('change_pct >= 50');
      return db.query(`select site,location,analyte,fraction,unit,latest_on,latest,previous_mean,previous_n,change_pct from analyte_trend ${w.length ? 'where ' + w.join(' and ') : ''} order by change_pct desc nulls last,site,location`, v);
    }
    case 'duplicates': return db.query('select site,duplicate,parent,location,analyte,parent_value,duplicate_value,unit,rpd_pct,limit_pct,rpd_pct>limit_pct as fails from duplicate_rpd order by rpd_pct>limit_pct desc,rpd_pct desc');
    case 'blanks': return db.query('select site,sample,sample_type,sampled_on,analyte,value,unit,lor from blank_detections order by sampled_on desc,sample');
    case 'holding-times': return db.query('select site,sample,location,analyte,sampled_on,analysed_on,days_held,holding_days from holding_breaches order by sampled_on desc');
    case 'qa': return db.query("select rule,reference,finding from compliance_findings where rule like 'POLICY-%' order by rule,reference");
    case 'due': return db.query('select site,location,kind,suite,every_days,consent,last_sampled,next_due,days_overdue from monitoring_due where next_due <= current_date + $1::int order by next_due,site,location', [intIn(o.days ?? '30', 0, 3660, 'days')]);
    case 'awaiting': return db.query('select site,sample,sample_type,lab,sampled_on,submitted_on,days_at_lab from awaiting_results order by days_at_lab desc');
    case 'consents': return db.query('select ref,site,kind,regulator,expires_on,days_to_expiry,lodge_renewal_by,renewal_lodged_on,last_report_on,report_due,days_to_report,exceedances_12m,not_actioned from consent_status order by report_due,ref');
    case 'compliance': return db.query('select severity,kind,reference,rule,finding from compliance_findings order by severity,rule,reference');
    case 'attention': {
      const f = await db.query("select severity,'finding' as what,reference,rule,finding from compliance_findings where severity<=2 order by severity,rule,reference");
      const due = await db.query("select 3 as severity,'round due' as what,site || '/' || location as reference,'MONITORING-DUE' as rule,suite || ' due ' || next_due || coalesce(' under ' || consent,'') as finding from monitoring_due where days_overdue between -7 and 0 order by next_due");
      return [...f, ...due];
    }
    case 'weekly-review': return {
      breached: await db.query('select rule,reference,finding from compliance_findings where severity=1 order by rule,reference'),
      exceedances_last_30_days: await db.query('select site,location,sampled_on,analyte,value,unit,set_code as criterion,limit_high,limit_unit,action from exceedances where sampled_on>=current_date-30 order by set_kind desc,sampled_on desc'),
      rounds_due_14_days: await db.query('select site,location,suite,next_due,days_overdue,consent from monitoring_due where next_due<=current_date+14 order by next_due'),
      data_quality: await db.query("select rule,reference,finding from compliance_findings where rule like 'POLICY-%' order by rule"),
      reports_and_renewals: await db.query('select ref,site,report_due,days_to_report,expires_on,lodge_renewal_by,renewal_lodged_on from consent_status where days_to_report<=60 or (lodge_renewal_by is not null and renewal_lodged_on is null and lodge_renewal_by<=current_date+180) order by report_due'),
      rising: await db.query('select site,location,analyte,latest,previous_mean,change_pct from analyte_trend where change_pct>=50 and previous_n>=2 order by change_pct desc'),
    };
    case 'activity': return o.record ? db.query('select created_at,record_kind,record_ref,actor,action,note from activity where lower(record_ref)=lower($1) order by created_at desc,id desc', [String(o.record)]) : db.query('select created_at,record_kind,record_ref,actor,action,note from activity order by created_at desc,id desc limit 50');
    case 'draft-exceedance-notice': return draftExceedanceNotice(db, o);
    case 'draft-monitoring-report': return draftMonitoringReport(db, o);
    case 'draft-results-letter': return draftResultsLetter(db, o);
    case 'import': { const src = p[1]; if (!['equis', 'lab'].includes(src)) throw Error('Use: import equis|lab --site=<site> --file=<csv> --actor=<name>'); return importResults(db, src, o); }
    case 'export': {
      const tables = ['organisation', 'sites', 'locations', 'analytes', 'consents', 'criteria_sets', 'criteria', 'site_criteria', 'monitoring_plan', 'samples', 'results', 'exceedance_actions', 'activity'];
      const records = {}; for (const t of tables) records[t] = await db.query(`select * from ${t} order by 1`);
      const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'exports'); fs.mkdirSync(dir, {recursive: true});
      const file = path.join(dir, `environmental-data-${today()}-${randomUUID().slice(0, 8)}.json`); fs.writeFileSync(file, JSON.stringify({exported_at: new Date().toISOString(), records}, null, 2), {flag: 'wx'});
      return {file, tables: tables.length, rows: Object.values(records).reduce((n, r) => n + r.length, 0)};
    }
  }

  // ---- writes: every one needs --actor and runs in a transaction
  if (command === 'settings' && Object.keys(o).filter(k => k !== 'json').length === 0) return org(db);
  const actor = required(o, 'actor');
  return transaction(db, async () => {
    switch (command) {
      case 'settings': {
        const d = {};
        if (o.name !== undefined) d.name = required(o, 'name');
        if (o.country !== undefined) d.country = oneOf(String(o.country).toUpperCase(), ['AU', 'NZ'], 'country');
        if (o['rpd-water'] !== undefined) d.rpd_water_pct = intIn(o['rpd-water'], 1, 200, 'rpd-water');
        if (o['rpd-soil'] !== undefined) d.rpd_soil_pct = intIn(o['rpd-soil'], 1, 200, 'rpd-soil');
        if (o['results-within'] !== undefined) d.results_within_days = intIn(o['results-within'], 1, 90, 'results-within');
        if (o['report-lead'] !== undefined) d.report_lead_days = intIn(o['report-lead'], 1, 120, 'report-lead');
        await db.query('insert into organisation(id) values(true) on conflict do nothing');
        const u = await update(db, 'organisation', true, d); await audit(db, 'settings', 'organisation', actor, command, JSON.stringify(d)); return u;
      }
      case 'add-site': {
        const code = required(o, 'code').toUpperCase(); if ((await db.query('select 1 from sites where lower(code)=lower($1)', [code])).length) throw Error(`Site ${code} already exists`);
        const t = await insert(db, 'sites', {code, name: required(o, 'name'), country: oneOf(String(required(o, 'country')).toUpperCase(), ['AU', 'NZ'], 'country'), client: o.client ? String(o.client) : '', region: o.region ? String(o.region) : ''});
        await audit(db, 'site', code, actor, command, t.name); return t;
      }
      case 'add-location': {
        const t = await resolve(db, 'sites', required(o, 'site')); const code = required(o, 'code');
        if ((await db.query('select 1 from locations where site_id=$1 and lower(code)=lower($2)', [t.id, code])).length) throw Error(`${t.code}/${code} already exists`);
        const l = await insert(db, 'locations', {site_id: t.id, code, kind: oneOf(required(o, 'kind'), KINDS, 'kind'), name: o.name ? String(o.name) : ''});
        await audit(db, 'site', t.code, actor, command, `${code} (${l.kind})`); return l;
      }
      case 'add-consent': {
        const t = await resolve(db, 'sites', required(o, 'site')); const ref = required(o, 'ref');
        if ((await db.query('select 1 from consents where lower(ref)=lower($1)', [ref])).length) throw Error(`${ref} already exists`);
        const k = await insert(db, 'consents', {site_id: t.id, ref, kind: oneOf(required(o, 'kind'), ['resource-consent', 'epa-licence'], 'kind'), regulator: o.regulator ? String(o.regulator) : '',
          granted_on: date(o.granted, '--granted'), expires_on: date(o.expires, '--expires'), notify_within_days: o['notify-within'] !== undefined ? intIn(o['notify-within'], 0, 60, 'notify-within') : 1,
          report_every_months: o['report-every'] !== undefined ? intIn(o['report-every'], 1, 60, 'report-every') : 12, last_report_on: date(o['last-report'], '--last-report')});
        await audit(db, 'consent', ref, actor, command, `${t.code}, ${k.kind}`); return k;
      }
      case 'add-set': {
        const code = required(o, 'code').toUpperCase(); if ((await db.query('select 1 from criteria_sets where lower(code)=lower($1)', [code])).length) throw Error(`Set ${code} already exists`);
        const source = required(o, 'source'); if (!/^https?:\/\//.test(source)) throw Error('--source must be the URL of the published guideline');
        const s = await insert(db, 'criteria_sets', {code, name: required(o, 'name'), kind: 'guideline', matrix: oneOf(required(o, 'matrix'), MATRICES, 'matrix'), source});
        await audit(db, 'set', code, actor, command, s.name); return s;
      }
      case 'add-criterion': case 'add-limit': {
        let set, location_id = null;
        if (command === 'add-criterion') { set = await resolve(db, 'sets', required(o, 'set')); if (set.kind !== 'guideline') throw Error(`${set.code} is a consent's limits: use add-limit`); }
        else {
          const k = await resolve(db, 'consents', required(o, 'consent')); const matrix = oneOf(required(o, 'matrix'), MATRICES, 'matrix');
          set = (await db.query('select * from criteria_sets where consent_id=$1 and matrix=$2', [k.id, matrix]))[0]
            || await insert(db, 'criteria_sets', {code: (await db.query('select 1 from criteria_sets where lower(code)=lower($1)', [k.ref])).length ? `${k.ref} ${matrix}` : k.ref, name: `${k.ref} limits (${matrix})`, kind: 'consent', matrix, source: 'Consent conditions', consent_id: k.id});
          if (o.location) { const l = await resolve(db, 'locations', o.location); if (l.site_id !== k.site_id) throw Error('That location is not on the consent\'s site'); location_id = l.id; }
        }
        if (o.max === undefined && o.min === undefined) throw Error('Give --max, --min or both');
        const c = await insert(db, 'criteria', {set_id: set.id, analyte: analyteName(required(o, 'analyte')), fraction: oneOf(o.fraction ?? '', FRACTIONS, 'fraction'), unit: unit(required(o, 'unit')),
          limit_low: o.min !== undefined ? num(o.min, '--min') : null, limit_high: o.max !== undefined ? num(o.max, '--max') : null, location_id, note: o.note ? String(o.note) : ''});
        await audit(db, 'set', set.code, actor, command, `${c.analyte} ${limits(c, c.unit)}`); return c;
      }
      case 'apply-set': {
        const t = await resolve(db, 'sites', required(o, 'site')), s = await resolve(db, 'sets', required(o, 'set')); if (s.kind !== 'guideline') throw Error('Consent limits apply to their own site already');
        const kind = o.kind ? oneOf(o.kind, KINDS, 'kind') : null;
        await db.query('insert into site_criteria(site_id,set_id,location_kind) values($1,$2,$3) on conflict (site_id,set_id) do update set location_kind=excluded.location_kind', [t.id, s.id, kind]);
        await audit(db, 'site', t.code, actor, command, `${s.code}${kind ? ' to ' + kind : ''}`); return {site: t.code, set: s.code, applies_to: kind || 'all locations'};
      }
      case 'plan': {
        const l = await resolve(db, 'locations', required(o, 'location')); const k = o.consent ? await resolve(db, 'consents', o.consent) : null;
        if (k && k.site_id !== l.site_id) throw Error('That consent is for a different site');
        const r = (await db.query('insert into monitoring_plan(location_id,suite,every_days,consent_id) values($1,$2,$3,$4) on conflict (location_id,lower(suite)) do update set every_days=excluded.every_days,consent_id=excluded.consent_id returning *',
          [l.id, required(o, 'suite'), intIn(required(o, 'every'), 1, 1830, 'every'), k?.id ?? null]))[0];
        await audit(db, 'location', l.code, actor, command, `${r.suite} every ${r.every_days} days${k ? ' under ' + k.ref : ''}`); return r;
      }
      case 'sample': {
        const t = await resolve(db, 'sites', required(o, 'site')); const code = required(o, 'code');
        if ((await db.query('select 1 from samples where lower(code)=lower($1)', [code])).length) throw Error(`Sample ${code} already exists`);
        const type = oneOf(o.type ?? 'normal', ['normal', 'field-duplicate', 'trip-blank', 'rinsate-blank'], 'type');
        const l = o.location ? await resolve(db, 'locations', o.location) : null; if (l && l.site_id !== t.id) throw Error('That location is not on this site');
        if (type === 'normal' && !l) throw Error('--location is required for a normal sample');
        const parent = o.parent ? await resolve(db, 'samples', o.parent) : null; if (type === 'field-duplicate' && !parent) throw Error('--parent is required for a field duplicate');
        if (parent && type !== 'field-duplicate') throw Error('--parent is only for a field duplicate');
        const sampled = pastOrToday(required(o, 'date'), 'date'), submitted = o.submitted !== undefined ? pastOrToday(o.submitted, 'submitted') : null;
        if (submitted && submitted < sampled) throw Error('--submitted cannot be before --date');
        const s = await insert(db, 'samples', {site_id: t.id, location_id: type === 'field-duplicate' ? null : l?.id ?? null, code, sampled_on: sampled, matrix: oneOf(required(o, 'matrix'), MATRICES, 'matrix'), sample_type: type, parent_id: parent?.id ?? null,
          depth_m: o.depth !== undefined ? num(o.depth, '--depth') : null, sampler: o.sampler ? String(o.sampler) : '', lab: o.lab ? String(o.lab) : '', lab_report: o.report ? String(o.report) : '', submitted_on: submitted});
        await audit(db, 'site', t.code, actor, command, `${code} ${type} ${sampled}`); return s;
      }
      case 'result': {
        const s = await resolve(db, 'samples', required(o, 'sample')); const nd = Boolean(o.nd);
        if (nd === (o.value !== undefined)) throw Error('Give --value, or --nd with --lor for a non-detect');
        if (nd && o.lor === undefined) throw Error('--lor is required with --nd');
        const analysed = o.analysed !== undefined ? pastOrToday(o.analysed, 'analysed') : null; if (analysed && analysed < s.sampled_on) throw Error('--analysed cannot be before the sample date');
        const analyte = analyteName(required(o, 'analyte')), fraction = oneOf(o.fraction ?? '', FRACTIONS, 'fraction');
        if ((await db.query('select 1 from results where sample_id=$1 and analyte=$2 and fraction=$3', [s.id, analyte, fraction])).length) throw Error(`${s.code} already has a ${analyte} result: correct it with /customise or a note, never a second row`);
        const r = await insert(db, 'results', {sample_id: s.id, analyte, fraction, value: nd ? null : num(o.value, '--value'), unit: unit(required(o, 'unit')), detected: !nd, lor: o.lor !== undefined ? num(o.lor, '--lor') : null,
          method: o.method ? String(o.method) : '', analysed_on: analysed, received_on: o.received !== undefined ? pastOrToday(o.received, 'received') : today(), lab_qualifier: o.qualifier ? String(o.qualifier) : ''});
        const over = await db.query('select set_code,limit_high,limit_low,limit_unit from result_screen where result_id=$1 and exceeds', [r.id]);
        await audit(db, 'site', (await db.query('select code from sites where id=$1', [s.site_id]))[0].code, actor, command, `${s.code} ${analyte} ${nd ? '<' + r.lor : r.value} ${r.unit}`);
        return {...r, exceeds: over.map(x => `${x.set_code} ${limits(x)}`).join(', ') || 'none'};
      }
      case 'notify': {
        const s = await resolve(db, 'samples', required(o, 'sample')); const analyte = analyteName(required(o, 'analyte'));
        const rows = await db.query("select result_id,criterion_id,set_code,consent from exceedances where sample=$1 and analyte=$2 and set_kind='consent'", [s.code, analyte]);
        if (!rows.length) throw Error(`${s.code} ${analyte} does not exceed a consent or licence limit`);
        const action = oneOf(required(o, 'action'), ['notified', 'not-required'], 'action'); const on = pastOrToday(o.date, 'date');
        if (action === 'not-required' && !o.note) throw Error('--note is required: say who decided notification was not required, and why');
        for (const r of rows) await db.query('insert into exceedance_actions(result_id,criterion_id,action,acted_on,reference,note,actor) values($1,$2,$3,$4,$5,$6,$7) on conflict (result_id,criterion_id) do update set action=excluded.action,acted_on=excluded.acted_on,reference=excluded.reference,note=excluded.note,actor=excluded.actor',
          [r.result_id, r.criterion_id, action, on, o.ref ? String(o.ref) : '', o.note ? String(o.note) : '', actor]);
        await audit(db, 'consent', rows[0].consent, actor, command, `${s.code} ${analyte}: ${action} ${on}${o.ref ? ' ' + o.ref : ''}`); return {sample: s.code, analyte, consent: rows[0].consent, action, on};
      }
      case 'report-submitted': case 'renewal-lodged': {
        const k = await resolve(db, 'consents', required(o, 'consent')); const on = pastOrToday(o.date, 'date');
        const u = await update(db, 'consents', k.id, command === 'report-submitted' ? {last_report_on: on} : {renewal_lodged_on: on}); await audit(db, 'consent', k.ref, actor, command, on); return u;
      }
      case 'close-site': {
        const t = await resolve(db, 'sites', required(o, 'site')); if (t.status === 'closed') throw Error(`${t.code} is already closed`);
        const live = await db.query("select ref from consents where site_id=$1 and status='active'", [t.id]); if (live.length) throw Error(`Active consents on ${t.code}: ${live.map(k => k.ref).join(', ')}. Surrender or transfer them first.`);
        const u = await update(db, 'sites', t.id, {status: 'closed'}); await audit(db, 'site', t.code, actor, command, required(o, 'reason')); return u;
      }
      case 'log': {
        const ref = required(o, 'record');
        for (const [t, col, kind] of [['sites', 'code', 'site'], ['consents', 'ref', 'consent'], ['samples', 'code', 'sample']]) { const hit = await db.query(`select ${col} as ref from ${t} where lower(${col})=lower($1)`, [ref]); if (hit.length === 1) { await audit(db, kind, hit[0].ref, actor, 'note', required(o, 'note')); return {record: hit[0].ref, recorded: true}; } }
        throw Error(`No site, consent or sample with reference ${ref}`);
      }
    }
    throw Error(`Unimplemented command ${command}`);
  });
}

// ------------------------------------------------------------------ output

const HIDE = ['id', 'site_id', 'location_id', 'sample_id', 'set_id', 'parent_id', 'consent_id', 'criterion_id', 'result_id', 'source_id', 'source_hash', 'created_at', 'updated_at'];
export function human(result) {
  if (Array.isArray(result)) {
    if (!result.length) return '  (none)';
    const cols = Object.keys(result[0]).filter(k => !HIDE.includes(k));
    return table(result, cols.map(key => ({key, label: key, width: 90, format: v => v instanceof Date ? v.toISOString().slice(0, 16).replace('T', ' ') : v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')})));
  }
  if (result && typeof result === 'object') return Object.entries(result).map(([k, v]) => v && typeof v === 'object' && !(v instanceof Date) ? `${k}\n${human(Array.isArray(v) ? v : [v])}` : `${k}: ${v ?? ''}`).join('\n\n');
  return String(result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let db;
  try { db = await getDb(); const result = await run(db, process.argv.slice(2)); console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : human(result)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { if (db) await db.close(); }
}
