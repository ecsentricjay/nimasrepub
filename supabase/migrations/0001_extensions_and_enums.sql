-- 0001_extensions_and_enums.sql
-- Extensions and enum types shared across the schema.

create extension if not exists pgcrypto;

-- Role hierarchy: admin > editor_in_chief > section_editor > reviewer/author.
-- A user can hold multiple roles (e.g. an editor who also authors papers
-- elsewhere), so this drives a many-to-many table, not a single column.
create type app_role as enum (
  'admin',
  'editor_in_chief',
  'section_editor',
  'reviewer',
  'author'
);

create type article_status as enum (
  'draft',
  'submitted',
  'under_review',
  'revisions_requested',
  'accepted',
  'awaiting_payment',
  'in_production',
  'published',
  'rejected',
  'withdrawn'
);

create type submission_source as enum (
  'self',
  'admin_proxy'
);

create type doi_status as enum (
  'none',
  'pending',
  'registered'
);

create type manuscript_file_type as enum (
  'original_submission',
  'revision',
  'cover_letter',
  'supplementary',
  'response_to_reviewers',
  'final_pdf'
);

create type review_recommendation as enum (
  'accept',
  'minor_revisions',
  'major_revisions',
  'reject'
);

create type invitation_status as enum (
  'invited',
  'accepted',
  'declined',
  'expired'
);

create type editorial_decision_type as enum (
  'accept',
  'minor_revisions',
  'major_revisions',
  'reject'
);

create type payment_status as enum (
  'pending',
  'paid',
  'failed',
  'waived'
);

create type payment_method as enum (
  'paystack',
  'manual_offline',
  'waived'
);

-- Generic updated_at trigger function, reused by every table that has
-- an updated_at column.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
