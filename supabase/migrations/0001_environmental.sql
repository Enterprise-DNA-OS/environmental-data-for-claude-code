-- Environmental Data for Claude Code: sites, monitoring locations, samples, lab results,
-- guideline criteria and consent limits, with the screening, QA and consent rules a consultant
-- or consent holder answers for. Plain Postgres. Runs the same on PGlite. No extensions.

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Converts between the mass units labs report in. Null when the units do not convert:
-- the screen then reports a unit mismatch instead of guessing.
create function to_unit(v numeric, from_unit text, to_unit text) returns numeric language sql immutable as $$
  select case
    when v is null then null
    when lower(from_unit) = lower(to_unit) then v
    when lower(from_unit) = 'mg/l' and lower(to_unit) = 'ug/l' then v * 1000
    when lower(from_unit) = 'ug/l' and lower(to_unit) = 'mg/l' then v / 1000
    when lower(from_unit) = 'g/m3' and lower(to_unit) = 'mg/l' then v
    when lower(from_unit) = 'mg/l' and lower(to_unit) = 'g/m3' then v
    when lower(from_unit) = 'g/m3' and lower(to_unit) = 'ug/l' then v * 1000
    when lower(from_unit) = 'ug/l' and lower(to_unit) = 'g/m3' then v / 1000
    when lower(from_unit) = 'mg/kg' and lower(to_unit) = 'ug/kg' then v * 1000
    when lower(from_unit) = 'ug/kg' and lower(to_unit) = 'mg/kg' then v / 1000
  end $$;

-- One row: who this is. /customise changes it.
create table organisation (
  id boolean primary key default true check (id),
  name text not null default 'Your Business',
  country text not null default 'NZ' check (country in ('AU','NZ')),
  rpd_water_pct numeric(5,1) not null default 30 check (rpd_water_pct between 1 and 200),
  rpd_soil_pct numeric(5,1) not null default 50 check (rpd_soil_pct between 1 and 200),
  results_within_days int not null default 10 check (results_within_days between 1 and 90),
  report_lead_days int not null default 21 check (report_lead_days between 1 and 120),
  updated_at timestamptz not null default now()
);

-- A facility: a landfill, a quarry, a contaminated site under investigation, a plant with a discharge.
create table sites (
  id uuid primary key default gen_random_uuid(),
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  client text not null default '',
  country text not null check (country in ('AU','NZ')),
  region text not null default '',
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sites_code_ci_idx on sites(lower(code));

-- Where samples come from: bores, surface water points, discharge points, test pits.
create table locations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  code text not null check (btrim(code) <> ''),
  name text not null default '',
  kind text not null check (kind in ('groundwater','surface-water','discharge','leachate','soil','sediment','air')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index locations_site_code_idx on locations(site_id, lower(code));

-- Analyte reference: holding time from sampling to analysis (house values; your lab's own table wins).
create table analytes (
  name text primary key check (name = lower(name) and btrim(name) <> ''),
  cas text not null default '',
  analyte_group text not null default '',
  holding_days int check (holding_days between 0 and 400)
);

-- Resource consents (NZ) and environment protection licences (AU).
create table consents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  ref text not null check (btrim(ref) <> ''),
  regulator text not null default '',
  kind text not null check (kind in ('resource-consent','epa-licence')),
  granted_on date,
  expires_on date,
  notify_within_days int not null default 1 check (notify_within_days between 0 and 60),
  report_every_months int not null default 12 check (report_every_months between 1 and 60),
  last_report_on date,
  renewal_lodged_on date,
  status text not null default 'active' check (status in ('active','surrendered','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on is null or granted_on is null or expires_on > granted_on)
);
create unique index consents_ref_ci_idx on consents(lower(ref));

-- A set of criteria: a published guideline (ANZG, NEPM, NESCS) or one consent's limits.
create table criteria_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  kind text not null check (kind in ('guideline','consent')),
  matrix text not null check (matrix in ('water','soil','sediment','air')),
  source text not null default '',
  consent_id uuid references consents(id),
  check ((kind = 'consent') = (consent_id is not null))
);
create unique index criteria_sets_code_ci_idx on criteria_sets(lower(code));

-- One limit. A blank fraction applies to any fraction; 'dissolved' only to dissolved results.
-- A consent limit can be tied to one location (the discharge point it names).
create table criteria (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references criteria_sets(id),
  analyte text not null check (analyte = lower(analyte) and btrim(analyte) <> ''),
  fraction text not null default '' check (fraction in ('','total','dissolved')),
  unit text not null check (btrim(unit) <> ''),
  limit_low numeric,
  limit_high numeric,
  location_id uuid references locations(id),
  note text not null default '',
  check (limit_low is not null or limit_high is not null),
  check (limit_low is null or limit_high is null or limit_low < limit_high)
);
create unique index criteria_unique_idx on criteria(set_id, analyte, fraction, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Which guideline sets apply at a site, optionally to one kind of location only.
create table site_criteria (
  site_id uuid not null references sites(id),
  set_id uuid not null references criteria_sets(id),
  location_kind text check (location_kind in ('groundwater','surface-water','discharge','leachate','soil','sediment','air')),
  primary key (site_id, set_id)
);

-- What has to be sampled, how often, and whether a consent requires it.
create table monitoring_plan (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  suite text not null check (btrim(suite) <> ''),
  every_days int not null check (every_days between 1 and 1830),
  consent_id uuid references consents(id),
  created_at timestamptz not null default now()
);
create unique index monitoring_plan_unique_idx on monitoring_plan(location_id, lower(suite));

-- A sample. Duplicates point at their parent; blanks belong to the site and round, not a location.
create table samples (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  location_id uuid references locations(id),
  code text not null check (btrim(code) <> ''),
  sampled_on date not null,
  matrix text not null check (matrix in ('water','soil','sediment','air')),
  sample_type text not null default 'normal' check (sample_type in ('normal','field-duplicate','trip-blank','rinsate-blank')),
  parent_id uuid references samples(id),
  depth_m numeric(7,2),
  sampler text not null default '',
  lab text not null default '',
  lab_report text not null default '',
  submitted_on date,
  source_id text,
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((sample_type = 'field-duplicate') = (parent_id is not null)),
  check (sample_type not in ('normal') or location_id is not null),
  check (submitted_on is null or submitted_on >= sampled_on)
);
create unique index samples_code_ci_idx on samples(lower(code));

-- One lab result. Non-detects keep the LOR and a null value.
create table results (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null references samples(id),
  analyte text not null check (analyte = lower(analyte) and btrim(analyte) <> ''),
  cas text not null default '',
  fraction text not null default '' check (fraction in ('','total','dissolved')),
  value numeric,
  unit text not null check (btrim(unit) <> ''),
  detected boolean not null,
  lor numeric check (lor is null or lor >= 0),
  method text not null default '',
  analysed_on date,
  received_on date,
  lab_qualifier text not null default '',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (detected = (value is not null)),
  check (detected or lor is not null)
);
create unique index results_unique_idx on results(sample_id, analyte, fraction);

-- What was done about an exceedance: the regulator was told, or a person decided it was not required.
create table exceedance_actions (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references results(id),
  criterion_id uuid not null references criteria(id),
  action text not null check (action in ('notified','not-required')),
  acted_on date not null,
  reference text not null default '',
  note text not null default '',
  actor text not null check (btrim(actor) <> ''),
  created_at timestamptz not null default now(),
  unique (result_id, criterion_id)
);

create table activity (
  id bigint generated always as identity primary key,
  record_kind text not null,
  record_ref text not null,
  actor text not null check (btrim(actor) <> ''),
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create trigger organisation_touch before update on organisation for each row execute function touch_updated_at();
create trigger sites_touch before update on sites for each row execute function touch_updated_at();
create trigger locations_touch before update on locations for each row execute function touch_updated_at();
create trigger consents_touch before update on consents for each row execute function touch_updated_at();
create trigger samples_touch before update on samples for each row execute function touch_updated_at();
create trigger results_touch before update on results for each row execute function touch_updated_at();

alter table organisation enable row level security;
alter table sites enable row level security;
alter table locations enable row level security;
alter table analytes enable row level security;
alter table consents enable row level security;
alter table criteria_sets enable row level security;
alter table criteria enable row level security;
alter table site_criteria enable row level security;
alter table monitoring_plan enable row level security;
alter table samples enable row level security;
alter table results enable row level security;
alter table exceedance_actions enable row level security;
alter table activity enable row level security;
revoke all on organisation, sites, locations, analytes, consents, criteria_sets, criteria, site_criteria, monitoring_plan, samples, results, exceedance_actions, activity from public;

-- ------------------------------------------------------------------ views

-- Every result with its sample, site and location. A duplicate takes its parent's location.
create view result_detail with (security_invoker=true) as
select r.*, s.code as sample, s.sampled_on, s.matrix, s.sample_type, s.site_id, s.lab, s.lab_report,
  coalesce(s.location_id, p.location_id) as location_id, t.code as site, l.code as location, l.kind as location_kind
from results r
join samples s on s.id = r.sample_id
join sites t on t.id = s.site_id
left join samples p on p.id = s.parent_id
left join locations l on l.id = coalesce(s.location_id, p.location_id);

-- Each normal result against every criterion that applies to it: the site's guideline sets
-- (matching matrix and, when set, location kind) and the limits of the site's consents.
create view result_screen with (security_invoker=true) as
with applicable as (
  select d.id as result_id, c.id as criterion_id, cs.code as set_code, cs.kind as set_kind, cs.consent_id
  from result_detail d
  join criteria c on c.analyte = d.analyte and (c.fraction = '' or c.fraction = d.fraction)
  join criteria_sets cs on cs.id = c.set_id and cs.matrix = d.matrix
  where d.sample_type = 'normal' and (
    (cs.kind = 'guideline' and c.location_id is null and exists (
      select 1 from site_criteria sc where sc.site_id = d.site_id and sc.set_id = cs.id and (sc.location_kind is null or sc.location_kind = d.location_kind)))
    or (cs.kind = 'consent' and exists (select 1 from consents k where k.id = cs.consent_id and k.site_id = d.site_id and k.status = 'active')
        and (c.location_id is null or c.location_id = d.location_id)))
)
select d.id as result_id, d.site, d.location, d.location_kind, d.sample, d.sampled_on, d.received_on, d.matrix, d.analyte, d.fraction,
  d.value, d.unit, d.detected, d.lor, a.criterion_id, a.set_code, a.set_kind, a.consent_id,
  c.unit as limit_unit, c.limit_low, c.limit_high,
  to_unit(d.value, d.unit, c.unit) as value_in_limit_unit,
  to_unit(d.lor, d.unit, c.unit) as lor_in_limit_unit,
  d.detected and to_unit(d.value, d.unit, c.unit) is not null and (
    (c.limit_high is not null and to_unit(d.value, d.unit, c.unit) > c.limit_high) or
    (c.limit_low is not null and to_unit(d.value, d.unit, c.unit) < c.limit_low)) as exceeds,
  to_unit(coalesce(d.value, d.lor), d.unit, c.unit) is null as unit_mismatch,
  case when d.detected and c.limit_high > 0 then round(to_unit(d.value, d.unit, c.unit) / c.limit_high, 2) end as times_limit
from applicable a
join result_detail d on d.id = a.result_id
join criteria c on c.id = a.criterion_id;

create view exceedances with (security_invoker=true) as
select x.*, k.ref as consent, k.notify_within_days, case when k.id is not null then coalesce(x.received_on, x.sampled_on) + k.notify_within_days end as notify_by,
  ea.action, ea.acted_on, ea.reference as action_ref
from result_screen x
left join consents k on k.id = x.consent_id
left join exceedance_actions ea on ea.result_id = x.result_id and ea.criterion_id = x.criterion_id
where x.exceeds;

-- Field duplicates against their parent: relative percent difference where both were detected.
create view duplicate_rpd with (security_invoker=true) as
select d.site, d.sample as duplicate, p.code as parent, d.location, d.analyte, d.fraction, pr.value as parent_value, d.value as duplicate_value, d.unit,
  round(100 * abs(pr.value - d.value) / nullif((pr.value + d.value) / 2, 0), 1) as rpd_pct,
  case when d.matrix = 'water' then o.rpd_water_pct else o.rpd_soil_pct end as limit_pct
from result_detail d
join samples dup on dup.id = d.sample_id and dup.sample_type = 'field-duplicate'
join samples p on p.id = dup.parent_id
join results pr on pr.sample_id = p.id and pr.analyte = d.analyte and pr.fraction = d.fraction and lower(pr.unit) = lower(d.unit)
cross join organisation o
where d.detected and pr.detected;

create view blank_detections with (security_invoker=true) as
select d.site, d.sample, d.sample_type, d.sampled_on, d.analyte, d.fraction, d.value, d.unit, d.lor
from result_detail d where d.sample_type in ('trip-blank','rinsate-blank') and d.detected;

create view holding_breaches with (security_invoker=true) as
select d.site, d.sample, d.location, d.analyte, d.sampled_on, d.analysed_on, d.analysed_on - d.sampled_on as days_held, a.holding_days
from result_detail d join analytes a on a.name = d.analyte
where d.analysed_on is not null and a.holding_days is not null and d.analysed_on - d.sampled_on > a.holding_days;

-- Samples at the lab past the agreed turnaround with no results back.
create view awaiting_results with (security_invoker=true) as
select t.code as site, s.code as sample, s.sample_type, s.lab, s.sampled_on, s.submitted_on, current_date - s.submitted_on as days_at_lab
from samples s join sites t on t.id = s.site_id cross join organisation o
where s.submitted_on is not null and not exists (select 1 from results r where r.sample_id = s.id)
  and current_date - s.submitted_on > o.results_within_days;

create view monitoring_due with (security_invoker=true) as
select t.code as site, l.code as location, l.kind, m.suite, m.every_days, k.ref as consent,
  last.sampled_on as last_sampled, coalesce(last.sampled_on + m.every_days, current_date) as next_due,
  current_date - coalesce(last.sampled_on + m.every_days, current_date) as days_overdue
from monitoring_plan m
join locations l on l.id = m.location_id and l.active
join sites t on t.id = l.site_id and t.status = 'active'
left join consents k on k.id = m.consent_id
left join lateral (select max(s.sampled_on) as sampled_on from samples s where s.location_id = l.id and s.sample_type = 'normal') last on true;

create view consent_status with (security_invoker=true) as
select k.id, k.ref, t.code as site, t.country, k.kind, k.regulator, k.granted_on, k.expires_on, k.renewal_lodged_on, k.last_report_on,
  (coalesce(k.last_report_on, k.granted_on, current_date) + make_interval(months => k.report_every_months))::date as report_due,
  (coalesce(k.last_report_on, k.granted_on, current_date) + make_interval(months => k.report_every_months))::date - current_date as days_to_report,
  k.expires_on - current_date as days_to_expiry,
  case when t.country = 'NZ' and k.expires_on is not null then (k.expires_on - interval '6 months')::date end as lodge_renewal_by,
  (select count(*)::int from exceedances x where x.consent_id = k.id and x.sampled_on >= current_date - 365) as exceedances_12m,
  (select count(*)::int from exceedances x where x.consent_id = k.id and x.action is null) as not_actioned
from consents k join sites t on t.id = k.site_id where k.status = 'active';

-- Latest detected result per location and analyte against the mean of the four before it.
create view analyte_trend with (security_invoker=true) as
with ranked as (
  select d.site, d.location, d.analyte, d.fraction, d.unit, d.value, d.sampled_on,
    row_number() over (partition by d.location_id, d.analyte, d.fraction order by d.sampled_on desc) as n
  from result_detail d where d.sample_type = 'normal' and d.detected and d.location_id is not null
)
select r.site, r.location, r.analyte, r.fraction, r.unit, r.sampled_on as latest_on, r.value as latest,
  round(avg(p.value), 4) as previous_mean, count(p.value)::int as previous_n,
  round(100 * (r.value - avg(p.value)) / nullif(avg(p.value), 0), 0) as change_pct
from ranked r join ranked p on p.site = r.site and p.location = r.location and p.analyte = r.analyte and p.fraction = r.fraction
  and lower(p.unit) = lower(r.unit) and p.n between 2 and 5
where r.n = 1
group by r.site, r.location, r.analyte, r.fraction, r.unit, r.sampled_on, r.value;

create view compliance_findings with (security_invoker=true) as
-- The consent or licence limit itself: an exceedance is non-compliance with a condition.
select 'result'::text as kind, x.site || '/' || x.sample as reference, 'CONSENT-LIMIT'::text as rule,
  x.analyte || coalesce(' (' || nullif(x.fraction, '') || ')', '') || ' ' || x.value || ' ' || x.unit || ' at ' || x.location || ' on ' || x.sampled_on ||
  ' against ' || x.consent || ' limit ' || concat_ws('-', x.limit_low, x.limit_high) || ' ' || x.limit_unit as finding,
  case when x.action is null then 1 else 3 end as severity
from exceedances x where x.set_kind = 'consent' and x.sampled_on >= current_date - 365
-- Notification: consent conditions set the clock (NZ); POEO Act 1997 (NSW) s148 says immediately for a pollution incident (AU).
union all select 'result', x.site || '/' || x.sample, 'CONSENT-NOTIFY',
  case when current_date > x.notify_by then 'Overdue: tell the regulator about ' || x.analyte || ' at ' || x.location || ' (due ' || x.notify_by || ' under ' || x.consent || '), or record why not'
       else 'Tell the regulator about ' || x.analyte || ' at ' || x.location || ' by ' || x.notify_by || ' under ' || x.consent || ', or record why not' end,
  case when current_date > x.notify_by then 1 else 2 end
from exceedances x where x.set_kind = 'consent' and x.action is null
-- Guideline screening: not a breach, a trigger for assessment (ANZG 2018, NEPM 2013 HILs, NESCS SCS).
union all select 'result', x.site || '/' || x.sample, 'GUIDELINE-' || upper(x.set_code),
  x.analyte || ' ' || x.value || ' ' || x.unit || ' at ' || x.location || ' is ' || coalesce(x.times_limit::text || ' times', 'outside') || ' the ' || x.set_code || ' value ' || concat_ws('-', x.limit_low, x.limit_high) || ' ' || x.limit_unit,
  2
from exceedances x where x.set_kind = 'guideline' and x.sampled_on >= current_date - 365
-- A non-detect whose LOR sits above the criterion proves nothing: ask the lab for a lower LOR.
union all select 'result', x.site || '/' || x.sample, 'POLICY-LOR',
  x.analyte || ' not detected at ' || x.location || ' but the LOR ' || x.lor || ' ' || x.unit || ' is above the ' || x.set_code || ' value ' || x.limit_high || ' ' || x.limit_unit,
  3
from result_screen x where not x.detected and x.limit_high is not null and x.lor_in_limit_unit > x.limit_high and x.sampled_on >= current_date - 365
union all select 'result', x.site || '/' || x.sample, 'POLICY-UNITS',
  x.analyte || ' reported in ' || x.unit || ' cannot be compared with the ' || x.set_code || ' value in ' || x.limit_unit, 2
from result_screen x where x.unit_mismatch and x.sampled_on >= current_date - 365
-- Monitoring frequency: the consent condition or the monitoring plan.
union all select 'location', m.site || '/' || m.location, 'MONITORING-OVERDUE',
  m.suite || ' was due ' || m.next_due || coalesce(' under ' || m.consent, '') || ' (last sampled ' || coalesce(m.last_sampled::text, 'never') || ')',
  case when m.consent is not null then 1 else 2 end
from monitoring_due m where m.days_overdue > 0
-- The monitoring report or annual return the consent or licence requires.
union all select 'consent', k.ref, 'REPORT-DUE',
  case when k.days_to_report < 0 then 'Overdue: the monitoring report was due ' || k.report_due else 'Monitoring report due ' || k.report_due end,
  case when k.days_to_report < 0 then 1 else 2 end
from consent_status k cross join organisation o where k.days_to_report <= o.report_lead_days
-- RMA s124: a replacement application lodged at least six months before expiry lets the activity continue until it is decided;
-- between six and three months, only if the council allows it.
union all select 'consent', k.ref, 'NZ-RMA-124',
  case when current_date > k.lodge_renewal_by then 'Past ' || k.lodge_renewal_by || ' with no replacement application recorded: carrying on after expiry (' || k.expires_on || ') now needs the council to allow a late application'
       else 'Lodge the replacement application by ' || k.lodge_renewal_by || ' (expires ' || k.expires_on || ')' end,
  case when current_date > k.lodge_renewal_by then 1 else 2 end
from consent_status k where k.country = 'NZ' and k.renewal_lodged_on is null and k.lodge_renewal_by <= current_date + 90
-- QA: holding times, duplicates, blanks, turnaround (house rules; values in organisation and analytes).
union all select 'result', h.site || '/' || h.sample, 'POLICY-HOLDING',
  h.analyte || ' analysed ' || h.days_held || ' days after sampling (holding time ' || h.holding_days || ' days): flag the result as estimated', 2
from holding_breaches h where h.sampled_on >= current_date - 365
union all select 'result', r.site || '/' || r.duplicate, 'POLICY-RPD',
  r.analyte || ' RPD ' || r.rpd_pct || '% against ' || r.parent || ' (acceptance ' || r.limit_pct || '%)', 2
from duplicate_rpd r where r.rpd_pct > r.limit_pct
union all select 'result', b.site || '/' || b.sample, 'POLICY-BLANK',
  b.analyte || ' detected at ' || b.value || ' ' || b.unit || ' in the ' || b.sample_type || ': check the round for contamination', 2
from blank_detections b where b.sampled_on >= current_date - 365
union all select 'sample', a.site || '/' || a.sample, 'POLICY-RESULTS-LATE',
  'At ' || coalesce(nullif(a.lab, ''), 'the lab') || ' for ' || a.days_at_lab || ' days with no results', 2
from awaiting_results a;

-- Latest result per location and analyte, for the results summary table a report carries.
create view latest_results with (security_invoker=true) as
select distinct on (d.location_id, d.analyte, d.fraction) d.site_id, d.site, d.location, d.location_kind, d.analyte, d.fraction, d.sampled_on,
  case when d.detected then d.value::text else '<' || d.lor end as result, d.unit,
  (select string_agg(x.set_code || ' ' || concat_ws('-', x.limit_low, x.limit_high), ', ' order by x.set_code) from result_screen x where x.result_id = d.id) as criteria,
  exists (select 1 from result_screen x where x.result_id = d.id and x.exceeds) as exceeds
from result_detail d where d.sample_type = 'normal' and d.location_id is not null
order by d.location_id, d.analyte, d.fraction, d.sampled_on desc;

revoke all on result_detail, result_screen, exceedances, duplicate_rpd, blank_detections, holding_breaches, awaiting_results, monitoring_due, consent_status, analyte_trend, compliance_findings, latest_results from public;
