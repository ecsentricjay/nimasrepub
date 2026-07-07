-- 0003_taxonomy.sql
-- Sections (single journal, multiple subject sections), plus volumes
-- and issues for grouping published articles.

create table sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- Now that sections exists, wire up the FK we deferred in 0002.
alter table user_roles
  add constraint user_roles_section_id_fkey
  foreign key (section_id) references sections(id) on delete cascade;

create table volumes (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  year int not null,
  created_at timestamptz not null default now()
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  volume_id uuid not null references volumes(id) on delete cascade,
  number int not null,
  title text,
  published_at date,
  created_at timestamptz not null default now(),
  unique (volume_id, number)
);

-- ---------------------------------------------------------------------
-- RLS — all three are reference/taxonomy data: world-readable, only
-- admins and the editor-in-chief can manage them.
-- ---------------------------------------------------------------------

alter table sections enable row level security;
alter table volumes enable row level security;
alter table issues enable row level security;

create policy "sections are publicly readable"
  on sections for select using (true);
create policy "admins and eic manage sections"
  on sections for insert with check (is_admin_or_eic(auth.uid()));
create policy "admins and eic update sections"
  on sections for update using (is_admin_or_eic(auth.uid()));
create policy "admins delete sections"
  on sections for delete using (is_admin(auth.uid()));

create policy "volumes are publicly readable"
  on volumes for select using (true);
create policy "admins and eic manage volumes"
  on volumes for insert with check (is_admin_or_eic(auth.uid()));
create policy "admins and eic update volumes"
  on volumes for update using (is_admin_or_eic(auth.uid()));
create policy "admins delete volumes"
  on volumes for delete using (is_admin(auth.uid()));

create policy "issues are publicly readable"
  on issues for select using (true);
create policy "admins and eic manage issues"
  on issues for insert with check (is_admin_or_eic(auth.uid()));
create policy "admins and eic update issues"
  on issues for update using (is_admin_or_eic(auth.uid()));
create policy "admins delete issues"
  on issues for delete using (is_admin(auth.uid()));
