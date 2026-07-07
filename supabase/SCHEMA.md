# Database Schema — Phase 2

All migrations in `supabase/migrations/` are applied in filename order.
They've been run end-to-end against a real local Postgres 16 instance
(not just reviewed for syntax) with a harness that mimics Supabase's
`auth`/`storage` schemas — see `supabase/test-harness/` — and verified
with actual RLS scenarios for every role (admin, editor-in-chief,
section editor, reviewer, author, stranger, anonymous).

## How to apply this to your real Supabase project

1. Open your Supabase project → SQL Editor
2. Run each file in `supabase/migrations/` **in order**, 0001 through
   0013 — or use the Supabase CLI: `supabase db push` if you have it
   linked locally
3. Do **not** run anything from `supabase/test-harness/` against a real
   Supabase project — those files mimic parts of Supabase's internals
   purely for local testing and would conflict with the real thing
4. After running migrations, regenerate TypeScript types:
   ```
   npx supabase gen types typescript --project-id <your-ref> > src/lib/supabase/types.ts
   ```
5. Manually promote your own account to `admin` once you've signed up
   once (there's no UI for this yet — that's Phase 8):
   ```sql
   insert into user_roles (user_id, role)
   values ('<your-auth-user-id>', 'admin');
   ```

## Migration order and why it's structured this way

| File | Contains |
|---|---|
| `0001_extensions_and_enums.sql` | Extensions, all enum types, generic `updated_at` trigger |
| `0002_profiles_and_roles.sql` | `profiles`, `user_roles`, role-check helper functions (`has_role`, `is_admin_or_eic`, etc.), auto-profile-creation trigger on signup |
| `0003_taxonomy.sql` | `sections`, `volumes`, `issues` |
| `0004_articles.sql` | `articles`, `article_authors`, `manuscript_files` — **tables only** |
| `0005_review_workflow.sql` | `review_invitations`, `reviews`, `editorial_decisions` — **tables only** |
| `0006_cross_table_helpers.sql` | Security-definer helper functions for cross-table RLS checks |
| `0007_articles_rls.sql` | RLS policies for the 0004 tables |
| `0008_review_workflow_rls.sql` | RLS policies for the 0005 tables |
| `0009_payments.sql` | `apc_rates`, `payments` (tables + RLS) |
| `0010_announcements_and_audit.sql` | `announcements`, `audit_log` (tables + RLS) |
| `0011_storage_buckets.sql` | `manuscripts` (private) and `published-pdfs` (public) buckets + their storage policies |
| `0012_page_numbers_and_ordering.sql` | Article page ranges + issue ordering for issue tables of contents |
| `0013_profile_onboarding_email.sql` | One-time branded onboarding email tracking on profiles |

**Why tables and RLS are split into separate files for articles/reviews:**
during testing, an early version of this schema had RLS policies on
`articles` and `article_authors` directly subquery each other inline.
That causes infinite recursion in Postgres — evaluating `articles`'
RLS required evaluating `article_authors`' RLS, which required
evaluating `articles`' RLS again. The fix (and the standard Postgres/
Supabase pattern for this) is routing every cross-table check through
a `SECURITY DEFINER` function instead of an inline subquery, since
those functions run as the table owner and aren't subject to RLS
themselves. That's what `0006_cross_table_helpers.sql` is for, and why
it has to come after the tables it references exist, but before any
policy that calls it.

## What was actually tested (not just written)

Using a harness that mimics Supabase's `auth.uid()`, roles
(`anon`/`authenticated`/`service_role`), and `storage.objects`:

- **Anonymous access** (i.e. what Googlebot/Scholar's crawler looks
  like): sees published articles and can fetch files from the public
  `published-pdfs` bucket with zero authentication. Cannot see
  under-review articles, reviews, payments, or anything in the private
  `manuscripts` bucket.
- **Authors** see their own articles regardless of status, plus all
  published articles — nothing else.
- **Reviewers** with an accepted invitation see the assigned article,
  its manuscript files, and its author list — but explicitly **cannot**
  see payment records, confirming the financial-privacy boundary holds
  even for people with legitimate access to the manuscript.
- **Ghost publishing** (`submitted_via = 'admin_proxy'`) succeeds for
  an Editor-in-Chief, and is correctly rejected by RLS for both a
  regular author and a reviewer attempting to set that flag themselves
  — confirming the Phase 0 decision that this power is restricted to
  Admin and EIC only.
- **Storage bucket separation** confirmed at the object level, not just
  the table level: a PDF uploaded to `published-pdfs` is fetchable by
  `anon`; a manuscript uploaded to `manuscripts` is invisible to `anon`
  and to an unrelated authenticated user, but visible to the article's
  author and an accepted reviewer.

One real bug was caught and fixed during this process: the original
policy set let reviewers see an assigned article's manuscript files and
author list, but not the article row itself (no policy granted that
read). Fixed in `0007_articles_rls.sql` with an explicit
`"assigned reviewers view their assigned articles"` policy.

## Design notes carried over from the build plan

- `article_authors.user_id` is nullable — an author is a name/email/
  affiliation record first, optionally linked to a real account. This
  is what makes ghost publishing (Phase 4B) possible without a schema
  rewrite.
- `payments.amount_charged` is a snapshot, not a live reference to
  `apc_rates` — changing the APC rate later doesn't alter historical
  payment records.
- `reviews` are visible to the reviewer, the article's author(s), and
  editors/admins — never public. The workflow is double-blind:
  reviewer identities are not disclosed to authors, while editors/admins
  retain access to reviewer identity for workflow and audit purposes.
- `audit_log` has no insert/update/delete policy for any role at all —
  by Postgres RLS default-deny, no normal client can write to it. Only
  the service-role client (used from Server Actions, after the action
  is already verified) can write here.
