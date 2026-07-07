# NIMASREPUB

Nigerian Medical and Allied Sciences Research Publication — open-access,
peer-reviewed journal platform.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres, Auth, Storage) · Paystack · Resend

This repo is being built in phases. This commit covers **Phase 1**
(architecture & environment setup), **Phase 2** (database schema),
**Phase 3** (public article pages), and a design pass on the homepage
and auth pages.

## What's in Phase 1

- Next.js 16 scaffold (App Router, TypeScript, Tailwind v4, ESLint)
- Brand tokens in `src/app/globals.css`, pulled from the NIMASREPUB logo
  (navy `#0b1f4e`, green `#1c8c44`, blue `#1e88d1`)
- Typography: Source Serif 4 (headlines) + Inter (body/UI)
- Supabase client helpers for all three contexts the app will need:
  - `src/lib/supabase/client.ts` — browser
  - `src/lib/supabase/server.ts` — Server Components / Server Actions
  - `src/lib/supabase/service-role.ts` — privileged server-only operations
    (webhooks, admin actions) — **bypasses RLS, never import client-side**
- `src/proxy.ts` — keeps Supabase auth sessions fresh across requests
  (Next.js 16's replacement for `middleware.ts`)
- `src/app/robots.ts` and `src/app/sitemap.ts` — placeholders that matter a
  lot later: Google Scholar indexing depends on every published article
  appearing in the sitemap and nothing blocking the crawler

## What's in Phase 2

Full database schema in `supabase/migrations/` — 11 migrations covering
profiles/roles, sections/volumes/issues, articles/authors/manuscripts,
the review workflow, payments (with admin-configurable APC pricing),
announcements/audit log, and storage bucket policies.

**This schema has been tested against a real Postgres instance**, not
just written and reviewed — see `supabase/SCHEMA.md` for what was
verified (role-by-role read scoping, ghost-publishing restrictions,
the public-PDF-for-Scholar requirement, and one real recursion bug that
was caught and fixed along the way).

### Auth fix (mid-Phase-2 addendum)

Added the missing pieces that commonly cause "404 on sign-in" and
"profile data not saving" with Supabase + Next.js:

- `src/app/auth/callback/route.ts` — exchanges Supabase's auth code for
  a session. Its absence is the most common cause of a 404 right when
  login should complete.
- `src/app/auth/auth-code-error/page.tsx` — a real error page instead
  of a generic 404 when that exchange fails
- `src/app/login/`, `src/app/signup/` — sign-in/sign-up pages using
  Server Actions (`src/lib/auth/actions.ts`), avoiding the client-side
  insert race that usually causes profile data to silently not save
- Profile creation itself happens via the `handle_new_user()` database
  trigger (see `0002_profiles_and_roles.sql`), not a client-side insert
  — it runs server-side in the same transaction as the `auth.users`
  insert, so there's no window where RLS can block it

## Homepage & auth pages (design pass)

The homepage and all auth pages were rebuilt with real design intent
rather than placeholder markup:

- `src/components/site-header.tsx` / `site-footer.tsx` — a journal
  masthead treatment (utility bar, nameplate, double-rule under the
  title) rather than a generic SaaS nav
- `src/components/helix-divider.tsx` — the site's one signature visual
  element, an abstracted double helix pulled directly from the logo's
  DNA strand, animated in once on scroll (respects
  `prefers-reduced-motion`)
- `src/app/page.tsx` — real homepage content: hero, three editorial
  commitments (open access / double-blind review / Nigeria-rooted), subject
  areas, a submission callout. Deliberately doesn't link to pages that
  don't exist yet (Aims & Scope, Author Guidelines, etc. — those land
  in Phase 3)
- `src/components/auth-card.tsx`, `form-field.tsx`, `submit-button.tsx`
  — shared, accessible auth UI with real pending states (`useFormStatus`)
  so you can actually see requests in flight while testing
- `public/favicon.ico`, `apple-touch-icon.png`, `site.webmanifest` —
  cropped from the actual logo's icon mark, not the default Next.js icon

## What's in Phase 3

The public-facing article experience, built around the Google Scholar
indexing requirement from day one:

- `src/app/articles/[slug]/page.tsx` — the article detail page.
  `generateMetadata` renders real Highwire Press citation meta tags
  (`citation_title`, `citation_author` — one per author, `citation_doi`,
  `citation_pdf_url`, etc.) server-side into the initial HTML, plus a
  `ScholarlyArticle` JSON-LD block as a secondary structured-data layer
- `src/app/articles/page.tsx`, `src/app/sections/[slug]/page.tsx` —
  browse all articles / browse by section
- `src/app/sitemap.ts` — now pulls real published articles and sections
  from Supabase instead of just listing the homepage
- `src/lib/articles.ts` — the query layer. Deliberately uses separate
  typed queries instead of PostgREST embedded joins (`select("*,
  sections(*)")`) — our hand-written `types.ts` doesn't have accurate
  `Relationships` metadata yet (only `supabase gen types` against a
  real project produces that), so embedded selects would be untyped.
  This approach is fully type-safe regardless and is easy to swap to
  embedded joins later once you've regenerated real types.
- `src/lib/supabase/types.ts` — hand-written to match the actual schema
  in `supabase/migrations/`, so the codebase typechecks correctly
  against real table/column names right now, without waiting on a live
  project. Same shape `supabase gen types` produces, so swapping in the
  real generated file later needs no code changes.
- Homepage now pulls real sections and the 3 latest published articles
  instead of a hardcoded list; subject area cards are real links

### Sample data (`supabase/seed.sql`)

5 placeholder articles across different sections, written so the
abstracts describe study design/methodology rather than asserting
fabricated specific findings — avoids anything that could read as real
(fake) scientific data if it were ever crawled before you've replaced
it. **Every seeded row uses a `sample-` slug prefix specifically so
it's easy to find and delete before going live** — there's a cleanup
query at the bottom of the file. Run it the same way as the migrations
(SQL Editor, RLS bypassed).



```bash
npm install
cp .env.local.example .env.local
# fill in real values in .env.local — see comments in that file
npm run dev
```

You'll need a Supabase project before most of this does anything real:

1. Create a project at supabase.com
2. Project Settings -> API -> copy the URL, anon key, and service role key
   into `.env.local`
3. Run every file in `supabase/migrations/` in order via the SQL Editor
   (or `supabase db push` if you have the CLI linked) — see
   `supabase/SCHEMA.md` for details
4. Optionally run `supabase/seed.sql` for sample articles to test Phase
   3 pages against — remember to delete it before going live, see the
   note above
5. Promote your own account to `admin` after signing up once — see
   `supabase/SCHEMA.md` for the SQL

## Deploying

This is built for Vercel (best Next.js SSR support, which matters for
Google Scholar — its crawler needs server-rendered citation meta tags,
not client-side JS).

1. Push this repo to GitHub
2. Import it in Vercel
3. Add the same environment variables from `.env.local` in Vercel's
   project settings (Production + Preview)
4. Point `nimasrepub.com.ng` DNS at Vercel (Vercel gives you the exact
   records once you add the domain in project settings)

## Project structure

```
src/
  app/                  Routes (App Router)
  components/            Shared UI: header/footer, helix divider, auth shell
  lib/supabase/           Supabase client helpers (browser/server/service-role)
  lib/auth/                 Server Actions for sign-in/sign-up
  lib/utils.ts                cn() class-merging helper
  proxy.ts                      Auth session refresh (Next.js 16 proxy convention)
supabase/
  migrations/             11 SQL migrations — schema + RLS, see SCHEMA.md
  test-harness/            Local-only Supabase mimic, not for real projects
```

## Notes for next phases

- The types in `src/lib/supabase/types.ts` are hand-written and match
  the schema exactly, but you should still run
  `npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts`
  once your project is live — it'll fill in accurate `Relationships`
  metadata, which lets `src/lib/articles.ts` be simplified to use
  embedded PostgREST joins instead of separate queries.
- Phase 4 (next up) is the author submission workflow — the actual
  submission wizard, author dashboard, and status tracking, which is
  what `/signup` currently has nothing behind yet.
"# nimasrepub" 
