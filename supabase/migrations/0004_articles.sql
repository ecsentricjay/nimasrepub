-- 0004_articles.sql
-- The core content model. Tables only — RLS policies live in
-- 0007_articles_rls.sql, after the cross-table helper functions they
-- depend on are defined (see 0006_cross_table_helpers.sql for why).
--
-- Two design decisions from the build plan are load-bearing here:
--
-- 1. article_authors.user_id is NULLABLE — an author is a name/email/
--    affiliation record first, and only optionally linked to a real
--    account. This is what makes ghost/proxy publishing possible
--    without a schema rewrite (Phase 4B).
-- 2. Highwire Press citation meta tags (required for Google Scholar
--    indexing) are generated from these columns at render time, not
--    stored as pre-rendered HTML — so title/authors/date/section all
--    need to be reliably structured data, not free text blobs.

create table articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  abstract text not null,
  keywords text[] not null default '{}',
  section_id uuid not null references sections(id),
  issue_id uuid references issues(id),

  status article_status not null default 'draft',
  submitted_via submission_source not null default 'self',
  -- Set only when submitted_via = 'admin_proxy': which admin/EIC
  -- ghost-published this article. Logged again in audit_log for
  -- a durable record even if this row is later edited.
  created_by uuid references profiles(id),

  doi text unique,
  doi_status doi_status not null default 'none',

  license text not null default 'CC BY 4.0',
  language text not null default 'en',

  publication_date date,
  pdf_path text, -- storage path in the public 'published-pdfs' bucket

  submitted_at timestamptz,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_idx on articles (status);
create index articles_section_idx on articles (section_id);
create index articles_issue_idx on articles (issue_id);

create trigger articles_set_updated_at
  before update on articles
  for each row execute function set_updated_at();

-- Author records — decoupled from real accounts on purpose (see header).
create table article_authors (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  user_id uuid references profiles(id), -- nullable: ghost-published authors may have no account
  display_name text not null,
  email text,
  affiliation text,
  orcid text,
  author_order int not null default 0,
  is_corresponding boolean not null default false,
  created_at timestamptz not null default now()
);

create index article_authors_article_idx on article_authors (article_id);
create index article_authors_user_idx on article_authors (user_id);

create table manuscript_files (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  file_type manuscript_file_type not null,
  file_path text not null, -- storage path in the private 'manuscripts' bucket
  version int not null default 1,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index manuscript_files_article_idx on manuscript_files (article_id);

alter table articles enable row level security;
alter table article_authors enable row level security;
alter table manuscript_files enable row level security;
