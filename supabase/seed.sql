-- Demo data: Southern Rivers Environmental, a fictional consultancy working both sides of the Tasman.
-- Three sites: a closed landfill under a Northland resource consent, a former depot in Newcastle under
-- investigation, and a quarry with a licensed discharge in New South Wales. Every consent, licence, client
-- and result here is invented. The guideline values are the published ones; check them against the current
-- version before you rely on them (docs/compliance.md). Dates are relative to today so the notification
-- clock, the overdue rounds and the report dates always have something to say. Safe to run twice.

insert into organisation (id, name, country, rpd_water_pct, rpd_soil_pct, results_within_days, report_lead_days)
values (true, 'Southern Rivers Environmental', 'NZ', 30, 50, 10, 21)
on conflict do nothing;

-- Holding times are house values for the demo. Use your laboratory's own table.
insert into analytes (name, cas, analyte_group, holding_days) values
('ammoniacal nitrogen','7664-41-7','nutrients',28),('zinc','7440-66-6','metals',180),('copper','7440-50-8','metals',180),
('lead','7439-92-1','metals',180),('arsenic','7440-38-2','metals',180),('cadmium','7440-43-9','metals',180),
('nickel','7440-02-0','metals',180),('mercury','7439-97-6','metals',28),('total suspended solids','','physical',7),
('ph','','physical',null),('oil and grease','','organics',28)
on conflict do nothing;

insert into sites (id, code, name, client, country, region) values
('10000000-0000-0000-0000-000000000001', 'KLF', 'Kaiwaka Road Closed Landfill', 'Northern Coast District Council', 'NZ', 'Northland'),
('10000000-0000-0000-0000-000000000002', 'HSD', 'Former Harbourside Depot', 'Hunter Wharf Holdings', 'AU', 'NSW'),
('10000000-0000-0000-0000-000000000003', 'RBQ', 'Riverbend Quarry', 'Riverbend Aggregates Pty Ltd', 'AU', 'NSW')
on conflict do nothing;

insert into locations (id, site_id, code, name, kind) values
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'BH01', 'Up-gradient bore', 'groundwater'),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'BH02', 'Down-gradient bore, east', 'groundwater'),
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'BH03', 'Down-gradient bore, toe of fill', 'groundwater'),
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'SW-US', 'Stream upstream of the landfill', 'surface-water'),
('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'SW-DS', 'Stream 50 m downstream (consent mixing zone edge)', 'surface-water'),
('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'TP01', 'Test pit, workshop slab', 'soil'),
('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 'TP02', 'Test pit, wash bay', 'soil'),
('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', 'TP03', 'Test pit, former fuel bowser', 'soil'),
('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000002', 'TP04', 'Test pit, north boundary', 'soil'),
('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000002', 'TP05', 'Test pit, paint store', 'soil'),
('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000002', 'TP06', 'Test pit, stockpile', 'soil'),
('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000003', 'LDP1', 'Licensed discharge point 1, sediment dam outlet', 'discharge')
on conflict do nothing;

insert into consents (id, site_id, ref, regulator, kind, granted_on, expires_on, notify_within_days, report_every_months, last_report_on) values
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'AUT.031207.01', 'Northland Regional Council', 'resource-consent', '1991-11-01', current_date + 150, 2, 12, current_date - 350),
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'EPL 20871', 'NSW EPA', 'epa-licence', '2015-07-01', null, 0, 12, current_date - 380)
on conflict do nothing;

insert into criteria_sets (id, code, name, kind, matrix, source, consent_id) values
('40000000-0000-0000-0000-000000000001', 'ANZG-FW95', 'ANZG 2018 freshwater, 95% species protection (default guideline values at hardness 30 mg/L CaCO3)', 'guideline', 'water', 'https://www.waterquality.gov.au/anz-guidelines/guideline-values/default/water-quality-toxicants', null),
('40000000-0000-0000-0000-000000000002', 'NEPM-HIL-A', 'NEPM 2013 health investigation level A, residential with garden', 'guideline', 'soil', 'https://www.legislation.gov.au/F2013L00768/latest/text', null),
('40000000-0000-0000-0000-000000000003', 'NESCS-RES', 'NESCS soil contaminant standard, residential (10% produce)', 'guideline', 'soil', 'https://environment.govt.nz/publications/methodology-for-deriving-standards-for-contaminants-in-soil-to-protect-human-health/', null),
('40000000-0000-0000-0000-000000000004', 'AUT.031207.01', 'Consent AUT.031207.01 schedule 1 receiving water limits (demo)', 'consent', 'water', 'Consent conditions (fictional demo consent)', '30000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000005', 'EPL 20871', 'EPL 20871 condition L2 concentration limits at LDP1 (demo)', 'consent', 'water', 'Licence conditions (fictional demo licence)', '30000000-0000-0000-0000-000000000002')
on conflict do nothing;

insert into criteria (id, set_id, analyte, fraction, unit, limit_low, limit_high, location_id) values
('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'zinc', 'dissolved', 'ug/L', null, 8, null),
('41000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'copper', 'dissolved', 'ug/L', null, 1.4, null),
('41000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'lead', 'dissolved', 'ug/L', null, 3.4, null),
('41000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'cadmium', 'dissolved', 'ug/L', null, 0.2, null),
('41000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'nickel', 'dissolved', 'ug/L', null, 11, null),
('41000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000002', 'arsenic', '', 'mg/kg', null, 100, null),
('41000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000002', 'cadmium', '', 'mg/kg', null, 20, null),
('41000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000002', 'copper', '', 'mg/kg', null, 6000, null),
('41000000-0000-0000-0000-000000000014', '40000000-0000-0000-0000-000000000002', 'lead', '', 'mg/kg', null, 300, null),
('41000000-0000-0000-0000-000000000015', '40000000-0000-0000-0000-000000000002', 'mercury', '', 'mg/kg', null, 40, null),
('41000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000002', 'nickel', '', 'mg/kg', null, 400, null),
('41000000-0000-0000-0000-000000000017', '40000000-0000-0000-0000-000000000002', 'zinc', '', 'mg/kg', null, 7400, null),
('41000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000003', 'arsenic', '', 'mg/kg', null, 20, null),
('41000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000003', 'lead', '', 'mg/kg', null, 210, null),
('41000000-0000-0000-0000-000000000031', '40000000-0000-0000-0000-000000000004', 'ammoniacal nitrogen', '', 'mg/L', null, 2.5, '20000000-0000-0000-0000-000000000005'),
('41000000-0000-0000-0000-000000000032', '40000000-0000-0000-0000-000000000004', 'zinc', 'dissolved', 'mg/L', null, 0.015, '20000000-0000-0000-0000-000000000005'),
('41000000-0000-0000-0000-000000000033', '40000000-0000-0000-0000-000000000004', 'ph', '', 'pH units', 6.5, 8.5, '20000000-0000-0000-0000-000000000005'),
('41000000-0000-0000-0000-000000000041', '40000000-0000-0000-0000-000000000005', 'total suspended solids', '', 'mg/L', null, 50, '20000000-0000-0000-0000-000000000021'),
('41000000-0000-0000-0000-000000000042', '40000000-0000-0000-0000-000000000005', 'ph', '', 'pH units', 6.5, 8.5, '20000000-0000-0000-0000-000000000021'),
('41000000-0000-0000-0000-000000000043', '40000000-0000-0000-0000-000000000005', 'oil and grease', '', 'mg/L', null, 10, '20000000-0000-0000-0000-000000000021')
on conflict do nothing;

insert into site_criteria (site_id, set_id, location_kind) values
('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'surface-water'),
('10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', null)
on conflict do nothing;

insert into monitoring_plan (id, location_id, suite, every_days, consent_id) values
('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Groundwater suite', 91, '30000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Groundwater suite', 91, '30000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Groundwater suite', 91, '30000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'Surface water suite', 30, '30000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'Surface water suite', 30, '30000000-0000-0000-0000-000000000001'),
('60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000021', 'Discharge suite', 30, '30000000-0000-0000-0000-000000000002')
on conflict do nothing;

insert into samples (id, site_id, location_id, code, sampled_on, matrix, sample_type, parent_id, depth_m, sampler, lab, lab_report, submitted_on) values
('50000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'KLF-SWDS-01', current_date - 200, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4100', current_date - 199),
('50000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'KLF-SWDS-02', current_date - 170, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4101', current_date - 169),
('50000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'KLF-SWDS-03', current_date - 140, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4102', current_date - 139),
('50000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'KLF-SWDS-04', current_date - 110, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4103', current_date - 109),
('50000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'KLF-SWDS-05', current_date - 80, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4104', current_date - 79),
('50000000-0000-0000-0000-000000000106', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'KLF-SWDS-06', current_date - 50, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4105', current_date - 49),
('50000000-0000-0000-0000-000000000107', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'KLF-SWDS-07', current_date - 20, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4106', current_date - 19),
('50000000-0000-0000-0000-000000000111', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'KLF-SWUS-01', current_date - 50, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4105', current_date - 49),
('50000000-0000-0000-0000-000000000112', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'KLF-SWUS-02', current_date - 20, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4106', current_date - 19),
('50000000-0000-0000-0000-000000000113', '10000000-0000-0000-0000-000000000001', null, 'KLF-QC01', current_date - 20, 'water', 'field-duplicate', '50000000-0000-0000-0000-000000000107', null, 'A. Rangi', 'Hill Laboratories', 'HL-4106', current_date - 19),
('50000000-0000-0000-0000-000000000114', '10000000-0000-0000-0000-000000000001', null, 'KLF-TB01', current_date - 20, 'water', 'trip-blank', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4106', current_date - 19),
('50000000-0000-0000-0000-000000000121', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'KLF-BH01-01', current_date - 186, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-3990', current_date - 185),
('50000000-0000-0000-0000-000000000131', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'KLF-BH01-02', current_date - 95, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4060', current_date - 94),
('50000000-0000-0000-0000-000000000122', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'KLF-BH02-01', current_date - 186, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-3990', current_date - 185),
('50000000-0000-0000-0000-000000000132', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'KLF-BH02-02', current_date - 95, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4060', current_date - 94),
('50000000-0000-0000-0000-000000000123', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'KLF-BH03-01', current_date - 186, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-3990', current_date - 185),
('50000000-0000-0000-0000-000000000133', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'KLF-BH03-02', current_date - 95, 'water', 'normal', null, null, 'A. Rangi', 'Hill Laboratories', 'HL-4060', current_date - 94),
('50000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000011', 'HSD-TP01-0.2', current_date - 25, 'soil', 'normal', null, 0.2, 'J. Okafor', 'Eurofins Newcastle', 'EN-88213', current_date - 24),
('50000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000012', 'HSD-TP02-0.5', current_date - 25, 'soil', 'normal', null, 0.5, 'J. Okafor', 'Eurofins Newcastle', 'EN-88213', current_date - 24),
('50000000-0000-0000-0000-000000000203', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000013', 'HSD-TP03-0.3', current_date - 25, 'soil', 'normal', null, 0.3, 'J. Okafor', 'Eurofins Newcastle', 'EN-88213', current_date - 24),
('50000000-0000-0000-0000-000000000204', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000014', 'HSD-TP04-1.0', current_date - 25, 'soil', 'normal', null, 1, 'J. Okafor', 'Eurofins Newcastle', 'EN-88213', current_date - 24),
('50000000-0000-0000-0000-000000000205', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000015', 'HSD-TP05-0.2', current_date - 25, 'soil', 'normal', null, 0.2, 'J. Okafor', 'Eurofins Newcastle', 'EN-88213', current_date - 24),
('50000000-0000-0000-0000-000000000206', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000016', 'HSD-TP06-0.2', current_date - 25, 'soil', 'normal', null, 0.2, 'J. Okafor', 'Eurofins Newcastle', 'EN-88213', current_date - 24),
('50000000-0000-0000-0000-000000000207', '10000000-0000-0000-0000-000000000002', null, 'HSD-QC01', current_date - 25, 'soil', 'field-duplicate', '50000000-0000-0000-0000-000000000202', 0.5, 'J. Okafor', 'Eurofins Newcastle', 'EN-88213', current_date - 24),
('50000000-0000-0000-0000-000000000208', '10000000-0000-0000-0000-000000000002', null, 'HSD-RB01', current_date - 25, 'water', 'rinsate-blank', null, null, 'J. Okafor', 'Eurofins Newcastle', 'EN-88213', current_date - 24),
('50000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000021', 'RBQ-LDP1-01', current_date - 160, 'water', 'normal', null, null, 'M. Doyle', 'ALS Smithfield', 'ES26-1200', current_date - 159),
('50000000-0000-0000-0000-000000000302', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000021', 'RBQ-LDP1-02', current_date - 130, 'water', 'normal', null, null, 'M. Doyle', 'ALS Smithfield', 'ES26-1201', current_date - 129),
('50000000-0000-0000-0000-000000000303', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000021', 'RBQ-LDP1-03', current_date - 100, 'water', 'normal', null, null, 'M. Doyle', 'ALS Smithfield', 'ES26-1202', current_date - 99),
('50000000-0000-0000-0000-000000000304', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000021', 'RBQ-LDP1-04', current_date - 70, 'water', 'normal', null, null, 'M. Doyle', 'ALS Smithfield', 'ES26-1203', current_date - 69),
('50000000-0000-0000-0000-000000000305', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000021', 'RBQ-LDP1-05', current_date - 40, 'water', 'normal', null, null, 'M. Doyle', 'ALS Smithfield', 'ES26-1204', current_date - 39)
on conflict do nothing;

insert into results (sample_id, analyte, fraction, value, unit, detected, lor, analysed_on, received_on, method, source) values
('50000000-0000-0000-0000-000000000101', 'ammoniacal nitrogen', '', 0.8, 'mg/L', true, 0.01, current_date - 197, current_date - 196, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000101', 'ph', '', 7.2, 'pH units', true, null, current_date - 200, current_date - 196, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000102', 'ammoniacal nitrogen', '', 0.9, 'mg/L', true, 0.01, current_date - 167, current_date - 166, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000102', 'ph', '', 7.3, 'pH units', true, null, current_date - 170, current_date - 166, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000103', 'ammoniacal nitrogen', '', 0.85, 'mg/L', true, 0.01, current_date - 137, current_date - 136, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000103', 'ph', '', 7.1, 'pH units', true, null, current_date - 140, current_date - 136, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000104', 'ammoniacal nitrogen', '', 1, 'mg/L', true, 0.01, current_date - 107, current_date - 106, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000104', 'ph', '', 7.4, 'pH units', true, null, current_date - 110, current_date - 106, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000105', 'ammoniacal nitrogen', '', 1.1, 'mg/L', true, 0.01, current_date - 77, current_date - 76, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000105', 'ph', '', 7.3, 'pH units', true, null, current_date - 80, current_date - 76, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000106', 'ammoniacal nitrogen', '', 1.2, 'mg/L', true, 0.01, current_date - 47, current_date - 46, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000106', 'ph', '', 7.2, 'pH units', true, null, current_date - 50, current_date - 46, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000107', 'ammoniacal nitrogen', '', 3.4, 'mg/L', true, 0.01, current_date - 17, current_date - 16, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000107', 'ph', '', 7.4, 'pH units', true, null, current_date - 20, current_date - 16, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000107', 'zinc', 'dissolved', 0.012, 'mg/L', true, 0.001, current_date - 17, current_date - 16, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000107', 'lead', 'dissolved', null, 'mg/L', false, 0.0005, current_date - 17, current_date - 16, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000107', 'cadmium', 'dissolved', null, 'mg/L', false, 0.0005, current_date - 17, current_date - 16, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000107', 'copper', 'dissolved', 0.0011, 'mg/L', true, 0.0005, current_date - 17, current_date - 16, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000106', 'zinc', 'dissolved', 0.006, 'mg/L', true, 0.001, current_date - 47, current_date - 46, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000111', 'ammoniacal nitrogen', '', 0.2, 'mg/L', true, 0.01, current_date - 47, current_date - 46, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000111', 'ph', '', 7, 'pH units', true, null, current_date - 50, current_date - 46, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000112', 'ammoniacal nitrogen', '', 0.3, 'mg/L', true, 0.01, current_date - 17, current_date - 16, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000112', 'ph', '', 7.1, 'pH units', true, null, current_date - 20, current_date - 16, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000112', 'zinc', 'dissolved', 0.004, 'mg/L', true, 0.001, current_date - 17, current_date - 16, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000113', 'ammoniacal nitrogen', '', 3.1, 'mg/L', true, 0.01, current_date - 17, current_date - 16, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000114', 'ammoniacal nitrogen', '', null, 'mg/L', false, 0.01, current_date - 17, current_date - 16, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000121', 'ammoniacal nitrogen', '', 0.05, 'mg/L', true, 0.01, current_date - 183, current_date - 182, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000131', 'ammoniacal nitrogen', '', 0.04, 'mg/L', true, 0.01, current_date - 92, current_date - 91, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000122', 'ammoniacal nitrogen', '', 6.5, 'mg/L', true, 0.01, current_date - 183, current_date - 182, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000132', 'ammoniacal nitrogen', '', 6.8, 'mg/L', true, 0.01, current_date - 92, current_date - 91, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000123', 'ammoniacal nitrogen', '', 9.1, 'mg/L', true, 0.01, current_date - 183, current_date - 182, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000133', 'ammoniacal nitrogen', '', 12.4, 'mg/L', true, 0.01, current_date - 92, current_date - 91, 'APHA 4500-NH3', 'demo'),
('50000000-0000-0000-0000-000000000132', 'zinc', 'dissolved', 0.02, 'mg/L', true, 0.001, current_date - 92, current_date - 91, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000201', 'arsenic', '', 8, 'mg/kg', true, 2, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000201', 'lead', '', 45, 'mg/kg', true, 5, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000201', 'zinc', '', 120, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000201', 'copper', '', 30, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000201', 'nickel', '', 12, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000201', 'cadmium', '', null, 'mg/kg', false, 0.4, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000201', 'mercury', '', null, 'mg/kg', false, 0.1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000202', 'arsenic', '', 12, 'mg/kg', true, 2, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000202', 'lead', '', 180, 'mg/kg', true, 5, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000202', 'zinc', '', 310, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000202', 'copper', '', 55, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000202', 'nickel', '', 15, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000203', 'arsenic', '', 24, 'mg/kg', true, 2, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000203', 'lead', '', 640, 'mg/kg', true, 5, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000203', 'zinc', '', 890, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000203', 'copper', '', 140, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000203', 'nickel', '', 18, 'mg/kg', true, 1, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000204', 'arsenic', '', 5, 'mg/kg', true, 2, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000204', 'lead', '', 22, 'mg/kg', true, 5, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000205', 'arsenic', '', 140, 'mg/kg', true, 2, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000205', 'lead', '', 260, 'mg/kg', true, 5, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000207', 'lead', '', 90, 'mg/kg', true, 5, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000207', 'arsenic', '', 11, 'mg/kg', true, 2, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000208', 'zinc', '', 0.008, 'mg/L', true, 0.001, current_date - 19, current_date - 14, 'USEPA 6020', 'demo'),
('50000000-0000-0000-0000-000000000301', 'total suspended solids', '', 12, 'mg/L', true, 5, current_date - 157, current_date - 156, 'APHA 2540 D', 'demo'),
('50000000-0000-0000-0000-000000000301', 'ph', '', 7.6, 'pH units', true, null, current_date - 160, current_date - 156, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000301', 'oil and grease', '', null, 'mg/L', false, 5, current_date - 157, current_date - 156, 'APHA 5520', 'demo'),
('50000000-0000-0000-0000-000000000302', 'total suspended solids', '', 18, 'mg/L', true, 5, current_date - 127, current_date - 126, 'APHA 2540 D', 'demo'),
('50000000-0000-0000-0000-000000000302', 'ph', '', 7.8, 'pH units', true, null, current_date - 130, current_date - 126, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000302', 'oil and grease', '', null, 'mg/L', false, 5, current_date - 127, current_date - 126, 'APHA 5520', 'demo'),
('50000000-0000-0000-0000-000000000303', 'total suspended solids', '', 9, 'mg/L', true, 5, current_date - 97, current_date - 96, 'APHA 2540 D', 'demo'),
('50000000-0000-0000-0000-000000000303', 'ph', '', 7.4, 'pH units', true, null, current_date - 100, current_date - 96, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000303', 'oil and grease', '', null, 'mg/L', false, 5, current_date - 97, current_date - 96, 'APHA 5520', 'demo'),
('50000000-0000-0000-0000-000000000304', 'total suspended solids', '', 64, 'mg/L', true, 5, current_date - 67, current_date - 66, 'APHA 2540 D', 'demo'),
('50000000-0000-0000-0000-000000000304', 'ph', '', 9.1, 'pH units', true, null, current_date - 70, current_date - 66, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000304', 'oil and grease', '', null, 'mg/L', false, 5, current_date - 67, current_date - 66, 'APHA 5520', 'demo'),
('50000000-0000-0000-0000-000000000305', 'total suspended solids', '', 22, 'mg/L', true, 5, current_date - 31, current_date - 30, 'APHA 2540 D', 'demo'),
('50000000-0000-0000-0000-000000000305', 'ph', '', 7.7, 'pH units', true, null, current_date - 40, current_date - 36, 'Field meter', 'demo'),
('50000000-0000-0000-0000-000000000305', 'oil and grease', '', null, 'mg/L', false, 5, current_date - 37, current_date - 36, 'APHA 5520', 'demo')
on conflict do nothing;

-- The licence exceedance two months ago was reported to the EPA the same day.
insert into exceedance_actions (result_id, criterion_id, action, acted_on, reference, note, actor)
select r.id, c.id, 'notified', current_date - 66, 'EPA Environment Line 26-04117', 'Phoned the Environment Line, written follow-up within 7 days', 'M. Doyle'
from results r join criteria c on c.id in ('41000000-0000-0000-0000-000000000041', '41000000-0000-0000-0000-000000000042') and c.analyte = r.analyte
where r.sample_id = '50000000-0000-0000-0000-000000000304'
on conflict do nothing;

insert into activity (record_kind, record_ref, actor, action, note)
select 'site', 'KLF', 'A. Rangi', 'round', 'Surface water round done, bores postponed: track to BH03 washed out'
where not exists (select 1 from activity where record_ref = 'KLF' and action = 'round');
insert into activity (record_kind, record_ref, actor, action, note)
select 'site', 'HSD', 'J. Okafor', 'round', 'Six test pits logged; TP06 sample sent with the batch'
where not exists (select 1 from activity where record_ref = 'HSD' and action = 'round');
