-- supabase/seed.sql
--
-- Sample/demo data for testing Phase 3 (public article pages, browse,
-- sitemap). NOT real research — every article here is placeholder
-- content to exercise the UI.
--
-- IMPORTANT: every seeded row uses a slug prefixed `sample-` specifically
-- so it's trivial to find and delete before this site goes live for
-- real. Publishing fake "peer-reviewed" articles where Google Scholar
-- (or anyone else) could index them would be a real problem, not just
-- a cosmetic one — delete this data before launch. See the cleanup
-- query at the bottom of this file.
--
-- Run this with RLS bypassed, same as the migrations.

-- Sections (matches what the homepage already displays)
insert into sections (name, slug, description) values
  ('Medicine', 'medicine', 'Clinical & translational research'),
  ('Nursing', 'nursing', 'Practice, education & policy'),
  ('Public Health', 'public-health', 'Epidemiology & community health'),
  ('Laboratory Sciences', 'laboratory-sciences', 'Diagnostics & pathology'),
  ('Pharmacy', 'pharmacy', 'Pharmacology & drug development'),
  ('Allied Health Sciences', 'allied-health-sciences', 'Rehabilitation & related fields')
on conflict (slug) do nothing;

insert into volumes (number, year) values (1, 2026)
on conflict (number) do nothing;

insert into issues (volume_id, number, title, published_at)
select id, 1, 'Inaugural Issue', '2026-01-15'
from volumes where number = 1
on conflict (volume_id, number) do nothing;

-- Article 1 — Medicine
with v as (
  insert into articles (
    title, slug, abstract, keywords, section_id, issue_id,
    status, license, language, publication_date, submitted_at, published_at
  )
  select
    'Patterns of Hypertension Among Adults in Urban Port Harcourt: A Cross-Sectional Study',
    'sample-hypertension-port-harcourt',
    'Hypertension remains a leading contributor to cardiovascular morbidity in urban Nigerian populations, yet local prevalence data are limited. This cross-sectional study surveyed adults across three urban districts of Port Harcourt using structured questionnaires and standardized blood pressure measurement. We describe the study design, sampling approach, and measurement protocol, and discuss how the resulting prevalence estimates and associated risk factors can inform local screening and primary-care referral pathways. Implications for community health programming in similar urban Nigerian settings are considered.',
    array['hypertension','cardiovascular health','urban health','Nigeria','cross-sectional study'],
    s.id, i.id, 'published', 'CC BY 4.0', 'en', '2026-01-15', '2025-11-02', '2026-01-15'
  from sections s, issues i
  where s.slug = 'medicine' and i.number = 1
  returning id
)
insert into article_authors (article_id, display_name, affiliation, author_order, is_corresponding)
select id, x.name, x.affiliation, x.ord, x.corr
from v, (values
  ('Dr. Ifeoma Chukwu', 'University of Port Harcourt Teaching Hospital', 1, true),
  ('Dr. Tamuno Wokoma', 'Rivers State University College of Medicine', 2, false)
) as x(name, affiliation, ord, corr);

-- Article 2 — Public Health
with v as (
  insert into articles (
    title, slug, abstract, keywords, section_id, issue_id,
    status, license, language, publication_date, submitted_at, published_at
  )
  select
    'Determinants of Childhood Immunization Uptake in Rural Rivers State',
    'sample-childhood-immunization-rivers-state',
    'Childhood immunization coverage varies considerably between urban and rural areas of Nigeria. This study examines caregiver-reported determinants of immunization uptake among children under five in rural communities of Rivers State, using a household survey design with structured interviews. We outline the sampling frame, data collection instruments, and analytic approach, and discuss how the identified barriers and facilitators relate to existing literature on routine immunization programs in similar settings, with attention to implications for community health worker outreach.',
    array['immunization','child health','public health','rural health','Nigeria'],
    s.id, i.id, 'published', 'CC BY 4.0', 'en', '2026-01-20', '2025-11-10', '2026-01-20'
  from sections s, issues i
  where s.slug = 'public-health' and i.number = 1
  returning id
)
insert into article_authors (article_id, display_name, affiliation, author_order, is_corresponding)
select id, x.name, x.affiliation, x.ord, x.corr
from v, (values
  ('Dr. Blessing Amadi', 'Rivers State Ministry of Health', 1, true),
  ('Prof. Emeka Nwachukwu', 'University of Port Harcourt', 2, false),
  ('Dr. Grace Obi', 'Rivers State University College of Medicine', 3, false)
) as x(name, affiliation, ord, corr);

-- Article 3 — Laboratory Sciences
with v as (
  insert into articles (
    title, slug, abstract, keywords, section_id, issue_id,
    status, license, language, publication_date, submitted_at, published_at
  )
  select
    'Antimicrobial Resistance Patterns of Escherichia coli Isolates from Tertiary Hospitals in South-South Nigeria',
    'sample-amr-ecoli-south-south-nigeria',
    'Antimicrobial resistance is an escalating concern in Nigerian tertiary care settings. This laboratory-based study describes the collection and susceptibility testing of Escherichia coli isolates from clinical samples across two tertiary hospitals in South-South Nigeria, following standardized microbiological protocols. We detail the isolate collection criteria, susceptibility testing methodology, and quality control procedures used, and discuss how resistance pattern surveillance of this kind contributes to local antimicrobial stewardship and empirical treatment guidance.',
    array['antimicrobial resistance','Escherichia coli','microbiology','tertiary hospitals','Nigeria'],
    s.id, i.id, 'published', 'CC BY 4.0', 'en', '2026-01-22', '2025-11-15', '2026-01-22'
  from sections s, issues i
  where s.slug = 'laboratory-sciences' and i.number = 1
  returning id
)
insert into article_authors (article_id, display_name, affiliation, author_order, is_corresponding)
select id, x.name, x.affiliation, x.ord, x.corr
from v, (values
  ('Dr. Chidinma Eze', 'University of Port Harcourt Teaching Hospital', 1, true),
  ('Dr. Samuel Briggs', 'Rivers State University College of Medicine', 2, false)
) as x(name, affiliation, ord, corr);

-- Article 4 — Nursing
with v as (
  insert into articles (
    title, slug, abstract, keywords, section_id, issue_id,
    status, license, language, publication_date, submitted_at, published_at
  )
  select
    'Nurses'' Knowledge and Practice of Postoperative Pain Assessment: A Survey of Teaching Hospitals in Nigeria',
    'sample-nurses-pain-assessment-nigeria',
    'Effective postoperative pain management depends on consistent, accurate pain assessment by nursing staff. This survey-based study examines nurses'' self-reported knowledge and documented practice of pain assessment across surgical wards in two Nigerian teaching hospitals, using a validated questionnaire alongside chart audit. We describe the instrument, sampling approach, and audit procedure, and discuss the findings in relation to existing pain-management training literature, with attention to implications for continuing nursing education.',
    array['nursing','pain assessment','postoperative care','teaching hospitals','Nigeria'],
    s.id, i.id, 'published', 'CC BY 4.0', 'en', '2026-01-25', '2025-11-18', '2026-01-25'
  from sections s, issues i
  where s.slug = 'nursing' and i.number = 1
  returning id
)
insert into article_authors (article_id, display_name, affiliation, author_order, is_corresponding)
select id, x.name, x.affiliation, x.ord, x.corr
from v, (values
  ('Mrs. Patience Okon', 'University of Port Harcourt Teaching Hospital', 1, true)
) as x(name, affiliation, ord, corr);

-- Article 5 — Pharmacy
with v as (
  insert into articles (
    title, slug, abstract, keywords, section_id, issue_id,
    status, license, language, publication_date, submitted_at, published_at
  )
  select
    'Community Pharmacists'' Role in Antimalarial Drug Counselling in Port Harcourt',
    'sample-pharmacists-antimalarial-counselling',
    'Community pharmacists are frequently a first point of contact for malaria treatment in Nigerian urban settings. This study explores the scope and content of antimalarial drug counselling provided by community pharmacists in Port Harcourt, using direct observation and structured interviews across a sample of registered pharmacies. We outline the observation protocol and interview guide used, and discuss the resulting practice patterns in relation to national malaria treatment guidelines, with implications for pharmacist training and patient counselling standards.',
    array['pharmacy practice','malaria','drug counselling','community health','Nigeria'],
    s.id, i.id, 'published', 'CC BY 4.0', 'en', '2026-01-28', '2025-11-20', '2026-01-28'
  from sections s, issues i
  where s.slug = 'pharmacy' and i.number = 1
  returning id
)
insert into article_authors (article_id, display_name, affiliation, author_order, is_corresponding)
select id, x.name, x.affiliation, x.ord, x.corr
from v, (values
  ('Dr. Ngozi Eke', 'University of Port Harcourt Faculty of Pharmacy', 1, true),
  ('Dr. Victor Amachree', 'Rivers State University', 2, false)
) as x(name, affiliation, ord, corr);

-- ---------------------------------------------------------------------
-- CLEANUP — run this before going live with real Google Scholar
-- indexing. Delete the SQL comment markers and run for real.
-- ---------------------------------------------------------------------
-- delete from article_authors where article_id in (select id from articles where slug like 'sample-%');
-- delete from articles where slug like 'sample-%';
-- delete from issues where title = 'Inaugural Issue';
-- delete from volumes where number = 1 and year = 2026;
