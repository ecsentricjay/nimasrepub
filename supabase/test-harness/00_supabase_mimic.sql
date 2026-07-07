-- Minimal mimic of the parts of a real Supabase project our migrations
-- and RLS policies depend on. NOT part of the actual migration set —
-- this only exists to validate migrations locally before they ever
-- touch a real Supabase project.

create extension if not exists pgcrypto;

create schema if not exists auth;
create schema if not exists storage;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Mirrors Supabase's auth.uid(), which reads the JWT's `sub` claim.
-- Tests "log in" by setting request.jwt.claims for the session.
create or replace function auth.uid() returns uuid as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is null then null
    else nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
  end
$$ language sql stable;

create or replace function auth.role() returns text as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is null then null
    else nullif(current_setting('request.jwt.claims', true)::json->>'role', '')::text
  end
$$ language sql stable;

-- Roles Supabase uses for its PostgREST layer.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

-- Minimal stand-in for storage.objects (just enough to test bucket
-- policies that reference article ownership via folder paths).
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

create or replace function storage.foldername(name text) returns text[] as $$
  select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1]
$$ language sql immutable;

-- Real Supabase already has RLS enabled on storage.objects by default
-- (owned by the supabase_storage_admin role) — we replicate that here
-- purely so our storage policies are testable locally.
alter table storage.objects enable row level security;
