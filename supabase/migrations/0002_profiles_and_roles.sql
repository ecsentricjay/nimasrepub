-- 0002_profiles_and_roles.sql
-- User profiles + role assignments. Role-check helper functions are
-- defined here (security definer) so every later migration's RLS
-- policies can call them without re-querying user_roles directly,
-- which would otherwise risk RLS recursion on user_roles itself.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  affiliation text,
  orcid text,
  bio text,
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- One row per (user, role[, section]). section_id is only meaningful
-- for 'section_editor' — null means the role applies platform-wide,
-- which is how 'admin' and 'editor_in_chief' are stored.
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role app_role not null,
  section_id uuid, -- FK added in 0003_taxonomy.sql once sections exists
  created_at timestamptz not null default now(),
  unique (user_id, role, section_id)
);

-- ---------------------------------------------------------------------
-- Helper functions used throughout RLS policies in later migrations.
-- security definer + a pinned search_path so they run with the
-- privileges needed to read user_roles regardless of the caller's RLS,
-- without becoming an injection vector.
-- ---------------------------------------------------------------------

create or replace function has_role(_user_id uuid, _role app_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function is_admin(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_role(_user_id, 'admin');
$$;

create or replace function is_admin_or_eic(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_role(_user_id, 'admin') or has_role(_user_id, 'editor_in_chief');
$$;

create or replace function is_section_editor_of(_user_id uuid, _section_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from user_roles
    where user_id = _user_id
      and role = 'section_editor'
      and section_id = _section_id
  );
$$;

create or replace function is_any_editor(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_admin_or_eic(_user_id) or has_role(_user_id, 'section_editor');
$$;

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table profiles enable row level security;
alter table user_roles enable row level security;

-- Profiles are readable by anyone — author names/affiliations need to
-- be publicly visible on published articles and the editorial board
-- page. Nothing sensitive (no auth identifiers beyond id) lives here.
create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admins can update any profile"
  on profiles for update
  using (is_admin(auth.uid()));

create policy "admins can deactivate or remove profiles"
  on profiles for delete
  using (is_admin(auth.uid()));

-- user_roles: a user can see their own role assignments; admins and
-- the editor-in-chief can see everyone's (needed to staff sections and
-- assign reviewers). Only admins can grant/revoke roles in v1 — see
-- build plan Phase 0 decision on Admin vs Editor-in-Chief permissions.
create policy "users can view their own roles"
  on user_roles for select
  using (auth.uid() = user_id);

create policy "admins and eic can view all roles"
  on user_roles for select
  using (is_admin_or_eic(auth.uid()));

create policy "only admins manage roles"
  on user_roles for insert
  with check (is_admin(auth.uid()));

create policy "only admins update roles"
  on user_roles for update
  using (is_admin(auth.uid()));

create policy "only admins delete roles"
  on user_roles for delete
  using (is_admin(auth.uid()));
