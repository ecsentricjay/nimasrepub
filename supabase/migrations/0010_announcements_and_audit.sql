-- 0007_announcements_and_audit.sql

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger announcements_set_updated_at
  before update on announcements
  for each row execute function set_updated_at();

create index announcements_published_idx on announcements (published_at);

-- Append-only record of who did what — critical for ghost-published
-- articles (Phase 4B), payment waivers, and any other action taken on
-- someone else's behalf. Written exclusively by server-side code using
-- the service-role client; never by a normal authenticated client.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id);
create index audit_log_actor_idx on audit_log (actor_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table announcements enable row level security;
alter table audit_log enable row level security;

-- announcements: published ones are public; drafts (published_at null
-- or in the future) are only visible to admin/EIC who manage them.
create policy "published announcements are public"
  on announcements for select
  using (published_at is not null and published_at <= now());

create policy "admins and eic view all announcements"
  on announcements for select
  using (is_admin_or_eic(auth.uid()));

create policy "admins and eic create announcements"
  on announcements for insert
  with check (is_admin_or_eic(auth.uid()));

create policy "admins and eic update announcements"
  on announcements for update
  using (is_admin_or_eic(auth.uid()));

create policy "admins and eic delete announcements"
  on announcements for delete
  using (is_admin_or_eic(auth.uid()));

-- audit_log: readable by admins only. No insert/update/delete policy
-- is defined for any role at all — RLS defaults to deny, so normal
-- authenticated clients can never write here. Only the service-role
-- client (which bypasses RLS entirely) can, which is the intended path
-- from Server Actions.
create policy "admins view audit log"
  on audit_log for select
  using (is_admin(auth.uid()));
