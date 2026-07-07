-- 0006_cross_table_helpers.sql
--
-- Why this file exists: Postgres RLS recursion.
--
-- articles' RLS needs to check article_authors ("is this user an
-- author of this article?"), and article_authors' RLS needs to check
-- articles ("is this article published?", "what section is it in?").
-- If both policies do this via plain inline subqueries, Postgres has
-- to evaluate articles' RLS to answer article_authors' RLS, which
-- requires evaluating article_authors' RLS, which requires evaluating
-- articles' RLS again — infinite recursion. This was caught by running
-- the actual RLS test suite against a real Postgres instance, not just
-- a "policies exist" check.
--
-- The fix: every cross-table check used in RLS goes through a
-- SECURITY DEFINER function instead of an inline subquery. These
-- functions execute as the table owner, which is exempt from RLS
-- unless FORCE ROW LEVEL SECURITY is set (it isn't) — so the query
-- inside the function runs without re-triggering policy evaluation,
-- breaking the cycle. This is the standard, documented pattern for
-- this situation (the same trick already used for has_role() etc. in
-- 0002, which is why those never hit this problem).

create or replace function is_article_author(_article_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from article_authors
    where article_id = _article_id and user_id = _user_id
  );
$$;

create or replace function is_published_article(_article_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from articles
    where id = _article_id and status = 'published'
  );
$$;

create or replace function get_article_section_id(_article_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select section_id from articles where id = _article_id;
$$;

create or replace function is_assigned_reviewer(_article_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from review_invitations
    where article_id = _article_id
      and reviewer_id = _user_id
      and status = 'accepted'
  );
$$;

-- Convenience wrapper combining the two "is this a section editor for
-- this article" checks (used in several policies across 0007/0008/0009).
create or replace function is_section_editor_of_article(_user_id uuid, _article_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_section_editor_of(_user_id, get_article_section_id(_article_id));
$$;
