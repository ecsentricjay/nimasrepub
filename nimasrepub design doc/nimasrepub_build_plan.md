# NIMASREPUB — Build Plan
**Nigerian Medical and Allied Sciences Research Publication**
Domain: nimasrepub.com.ng | Stack: React (Next.js), Supabase, Paystack, Resend

---

## Guiding constraint: Google Scholar indexing

Everything in this plan is shaped around one hard requirement — Google Scholar will only index articles if the platform behaves like a real scholarly repository, not a blog. Specifically it needs:

- **Open, crawlable abstract/PDF pages** — no login wall on the article landing page or PDF.
- **Highwire Press meta tags** on every article page (`citation_title`, `citation_author`, `citation_publication_date`, `citation_journal_title`, `citation_pdf_url`, `citation_doi`, etc.) — this is the #1 reason most journal sites fail to get indexed.
- **One PDF per article**, with real embedded title/author metadata (not "untitled.pdf").
- **Stable, permanent URLs** per article (no breaking links after redesigns).
- **A clean XML sitemap** Google can crawl.
- **DOIs via CrossRef** (or at minimum consistent permalinks) — strongly recommended, not optional, for credibility and discoverability.
- Site must be reachable by Googlebot — no aggressive bot-blocking, no JS-only rendering of citation meta tags (must be in server-rendered HTML).

This need is why **Next.js (App Router, SSR)** is the right choice over plain client-side React — Google Scholar's crawler does not execute JS reliably, so article metadata must be present in the initial HTML response.

---

## Phase 0 — Foundation & Decisions

**Decisions locked in:**

| Question | Decision | Implication |
|---|---|---|
| Journal structure | **Single journal**, multiple sections (Medicine, Nursing, Public Health, Lab Sciences, etc.) | No `journals` table needed — just a `sections` table. Simpler URL structure: `nimasrepub.com.ng/articles/[slug]` |
| APC timing | **Charged upon acceptance**, not at submission | Payment step sits between "Accepted" decision and "In Production" status, not in the submission wizard |
| APC currency/waivers | **Naira**, with **admin able to waive payment per-author/per-article** | `payments` table needs a `waived_by` (admin user_id) + `waived_reason` field, not just a boolean |
| Peer review model | **Double-blind peer review** with author and reviewer identities hidden from each other | Reviewer comments are visible to the author and editorial team, but reviewer identity is not disclosed to authors and reviews are never published publicly |
| DOI / CrossRef | **Design for "add later"** | Schema includes a nullable `doi` field and a `doi_status` flag from day one, but no CrossRef API integration in v1. Article pages already render Highwire meta tags either way — that part doesn't depend on DOI |
| Editorial board size | **5 board members + reviewers at launch**, growing later | Manual invite (admin adds user, assigns role) is enough for v1 — no bulk CSV import needed yet, but schema/UI shouldn't block adding it later |
| `Admin` vs `Editor-in-Chief` | **Distinct roles**, Admin is higher-privileged | Both can ghost-publish; no other editor role can. Role hierarchy: `admin` > `editor_in_chief` > `section_editor` > `reviewer`/`author`. Permission checks should reference role explicitly, not just "is editor" |
| Ghost / proxy publishing | **Admin or Editor-in-Chief only** can publish on behalf of a client who has no account | Major schema implication — see Phase 4B below. Permission check restricted to these two roles specifically |
| Ghost-published article payment | **Manual payment recording by default**, unless admin explicitly waives it | Proxy-publish flow doesn't skip payment by default — it routes to the same `payments` table with `payment_method: manual_offline` unless an admin actively chooses `waived` |

**Remaining open items:**

| Task | Notes |
|---|---|
| Register domain `nimasrepub.com.ng` | Confirm DNS access, plan to point to Vercel |
| Apply for ISSN (print/online) | Via National Library of Nigeria. Needed for legitimacy + future CrossRef registration. Takes time — start early even though DOI integration itself is deferred |
| Content/legal pages needed | Aims & Scope, Author Guidelines, Double-Blind Review Policy, Publication Ethics, Privacy Policy, Copyright/Licensing (CC BY is Scholar/DOAJ-friendly) |

---

## Phase 1 — Architecture & Environment Setup

1. **Frontend/Backend**: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
2. **Database/Auth/Storage**: Supabase
   - Postgres for relational data
   - Supabase Auth for users (with role claims)
   - Supabase Storage for manuscript files, final PDFs, supplementary files
3. **Payments**: Paystack (APC payments, possibly subscriptions for institutional access later)
4. **Email**: Resend (submission confirmations, review invitations, decision letters, payment receipts)
5. **Hosting**: Vercel (best Next.js SSR support + easy domain mapping)
6. **Repo setup**: monorepo or single Next.js app; CI via GitHub Actions (lint, typecheck, build on PR)

**Deliverable:** repo scaffolded, Supabase project created, environment variables wired, domain connected to a "coming soon" deploy.

---

## Phase 2 — Database Schema (Supabase/Postgres)

Core tables (high-level):

- `users` (extends Supabase auth) — name, affiliation, ORCID, role(s), bio
- `roles` — `admin` / `editor_in_chief` / `section_editor` / `reviewer` / `author` (many-to-many with users, but with a clear hierarchy: admin > editor_in_chief > section_editor > reviewer/author). Ghost-publishing permission checks against `admin` and `editor_in_chief` specifically, not a generic "is editor" check
- `sections` — Medicine, Nursing, Public Health, Lab Sciences, etc. (single journal, multiple sections)
- `volumes`, `issues`
- `articles` — title, abstract, keywords, status (submitted → under_review → revisions → accepted → awaiting_payment → in_production → published), doi (nullable), doi_status, publication_date, pdf_url, citation_meta (json), **`submitted_via` enum: `self` / `admin_proxy`**, **`created_by` (user_id of admin/editor if ghost-published)**
- `article_authors` — **`user_id` nullable**, plus `display_name`, `email`, `affiliation`, `orcid`, ordering, corresponding-author flag. This is the key decoupling: an author entry does *not* require a linked Supabase user account, which is what makes ghost publishing possible. If the named author later registers, `user_id` can be backfilled to claim their article history.
- `manuscript_files` — versioned uploads (original submission, revisions, final typeset PDF)
- `reviews` — reviewer_id, article_id, recommendation, comments, score, deadline. Double-blind review model: reviewer identity is **not** disclosed to authors, but submitted comments to the author are visible to the author, reviewer, and editors/admins. Reviews are never public
- `review_invitations` — track invite/accept/decline
- `editorial_decisions` — decision log per round
- `payments` — Paystack reference, **`amount_charged`** (Naira, snapshotted at time of charge — not a live reference to the current rate), status, linked article, `payment_method` enum: `paystack` / `manual_offline` / `waived`, `waived_by` (admin user_id, nullable), `waived_reason` (nullable), `recorded_by` (admin) for manual entries
- `apc_rates` — admin-editable APC amount(s). `amount`, `section_id` (nullable — null means "applies to all sections"), `effective_from`, `is_active`. Admin dashboard reads/writes here; the rate applied to a new `payments` row is always the active rate at that moment, then frozen into `amount_charged`
- `announcements` — for the admin-driven news/announcements feed
- `audit_log` — who changed what, when. **Critical for ghost publishing** — every proxy-created/proxy-published article must log which admin/editor acted and when, for editorial transparency and dispute resolution

**Row Level Security (RLS)** is critical here: authors should only see their own submissions; reviewers only see assigned papers; editors see everything in their section; admins see everything. **Ghost-published articles add a wrinkle**: since there's no `user_id` on the author record, there's no "owner" to scope RLS to — these articles are effectively admin/editor-owned until/unless the named author later registers and is linked. This needs to be designed *before* building UI, not retrofitted.

**Deliverable:** ER diagram + RLS policy table + migration files.

---

## Phase 3 — Public-Facing Site (SEO/Scholar-critical layer)

This is the part that determines whether Google Scholar indexes you, so it gets built early and tested early — don't leave it for the end.

- Homepage (journal overview, latest issue, announcements)
- Browse by Volume/Issue
- Article landing page template:
  - Title, authors + affiliations, abstract, keywords
  - **Highwire meta tags in `<head>`, server-rendered**
  - Download PDF button (direct, no login)
  - Citation export (BibTeX/RIS) — nice-to-have, helps researchers cite you
  - DOI link (once available)
- Search & filter (by keyword, author, issue, section)
- Author guidelines / submission guidelines pages
- Editorial board page
- Static legal/policy pages
- `sitemap.xml` (auto-generated, includes every published article) + `robots.txt`
- Schema.org `ScholarlyArticle` structured data as a bonus layer alongside Highwire tags

**Deliverable:** Publicly browsable read-only site, deployed, indexable, even before submission workflow is finished — so Google can start crawling early.

---

## Phase 4 — Author Workflow

- Auth (signup/login, email verification via Resend)
- Author dashboard: "My Submissions" with status tracker
- Submission wizard:
  1. Title, abstract, keywords, section
  2. Author list + affiliations + corresponding author
  3. File upload (manuscript, cover letter, supplementary files)
  4. Conflict of interest / ethics declarations
  5. Review & submit
- Revision flow: author receives decision, uploads revised manuscript + response-to-reviewers letter
- Status notifications via email at every stage transition

---

## Phase 4B — Ghost / Proxy Publishing (admin-side)

A separate, parallel path for clients who want their work published without ever creating an account — restricted to **Admin and Editor-in-Chief only** (no section editor or reviewer has this power).

- **"Publish for Client" flow** in the admin dashboard, separate from the normal submission queue, gated behind a role check for `admin` or `editor_in_chief`:
  1. Admin/EIC enters article metadata directly (title, abstract, keywords, section, authors — as plain name/email/affiliation entries, no account required)
  2. Admin/EIC uploads the manuscript (or already-finalized PDF, if review is being skipped)
  3. Admin/EIC can either:
     - Route it through the normal review pipeline (assign reviewers, collect decisions) — useful if the client wants real peer review but doesn't want platform access, or
     - Mark it as pre-reviewed/external and jump straight to production
  4. **Payment defaults to manual recording**, same as a normal accepted article — not auto-waived. Since the client has no account, payment is typically collected out-of-band (e.g., bank transfer, in-person) and an admin logs it as `manual_offline` with an amount and reference note. An admin can still explicitly choose to `waive` it, but that's a deliberate action, not the default
- **Claiming**: if the named author later signs up with a matching email, optionally surface "is this you?" so they can claim authorship and see it in their own dashboard — nice-to-have, not required for v1
- **Transparency safeguard**: every ghost-published article is tagged `submitted_via: admin_proxy` and logged in `audit_log` with the acting admin/EIC's identity and timestamp — this protects against disputes about who actually published what and keeps the editorial process auditable even when it's bypassed

---

## Phase 5 — Editorial & Peer Review Workflow

- Editor dashboard: incoming submissions queue, assign to section editor
- Reviewer invitation flow (invite → accept/decline → deadline tracking)
- Reviewer dashboard: assigned papers, structured review form (recommendation + comments). Review is **double-blind**: author and reviewer identities are hidden from each other, while comments to the author stay private between the author, reviewer, and editors/admins — never shown on the public article page
- Editor decision screen: accept / minor revisions / major revisions / reject, with decision letter (templated, editable, sent via Resend)
- On **accept**: triggers the APC payment step (Phase 7) before the article moves to production — it does not auto-advance to "in production" until payment is confirmed (or waived/manually recorded)
- Versioning: track manuscript file across rounds

---

## Phase 6 — Production / Publishing Pipeline

- Once accepted: typeset/finalize PDF (manual or templated), assign to a Volume/Issue
- **Embed real PDF metadata** (title, author, subject) — not optional for Scholar
- Generate DOI (if CrossRef integrated) — register on publish
- Auto-generate the article's citation meta tags + sitemap entry on publish
- "Publish" action flips article to public, triggers notification to author + listing on homepage

---

## Phase 7 — Payments (Paystack)

- APC payment triggered **on acceptance**, not at submission — article sits in `awaiting_payment` status until resolved. **Amount is admin-configurable** (read from `apc_rates`, not hardcoded), in Naira
- Admin dashboard includes an "APC Pricing" panel — set/update the current rate, optionally per section, with a history of past rates for transparency
- Paystack inline checkout or hosted page, sent via email link (works for both normal authors and ghost-published clients who have no account) — the checkout amount is pulled from the active rate at the moment the payment request is generated
- Webhook handler (Supabase Edge Function) to confirm payment server-side — **never trust client-side payment confirmation**
- Receipt email via Resend
- Admin can **waive** payment for any specific author/article (logs `waived_by` + `waived_reason`) — this is a deliberate per-case action, not a default
- Admin view of all transactions, with manual payment recording for offline collections (the default path for ghost-published articles unless explicitly waived)

---

## Phase 8 — Admin Dashboard

- User management (roles, deactivation, impersonation for support)
- Journal/section/issue management
- Announcements/news CMS
- Payment & APC waiver management
- **APC pricing management** — set/update the current rate(s), view rate history
- Site-wide analytics (submissions over time, acceptance rate, time-to-decision)
- Editorial board management (public-facing bios)

---

## Phase 9 — Discoverability Beyond Google Scholar

Google Scholar is the priority, but these meaningfully boost legitimacy and reach, and several gate Scholar trust:

- **DOAJ application** (Directory of Open Access Journals) — has strict criteria, worth targeting once you have ~10 published articles and clear policies
- **OAI-PMH endpoint** — lets repositories (and some Scholar-adjacent systems) harvest your metadata automatically
- **AJOL (African Journals Online)** listing — high relevance for a Nigerian journal
- Google Search Console + Bing Webmaster Tools setup, sitemap submission
- ORCID integration for authors (improves author disambiguation, which Scholar likes)

---

## Phase 10 — QA, Testing & Soft Launch

- Cross-role testing: simulate full lifecycle (submit → review → revise → accept → publish) with test accounts for each role
- RLS policy audit — attempt to access another user's data and confirm it's blocked
- Payment sandbox testing (Paystack test mode) before going live with real keys
- Accessibility check (WCAG basics) and mobile responsiveness
- Submit a handful of real or seed articles, verify they render correctly with Highwire tags (validate via "view source", not browser DevTools, since Scholar sees raw HTML)
- Submit sitemap to Google Search Console, request indexing on first batch of articles

---

## Phase 11 — Launch & Post-Launch

- DNS cutover to `nimasrepub.com.ng`
- Announce to editorial board / target author community
- Monitor Search Console for crawl errors and Scholar indexing status (can take weeks — be patient, don't resubmit aggressively)
- Iterate: add citation export formats, advanced search, author profile pages, etc.

---

## Suggested build order (practical sequencing)

1. Phase 0–1: foundation + scaffolding
2. Phase 2: schema + RLS
3. Phase 3: public site shell (get *something* crawlable live ASAP — Scholar indexing has lag, so the earlier real articles are live, the better)
4. Phase 4–5: author + editorial workflow
5. Phase 6: publishing pipeline (ties back into Phase 3 templates)
6. Phase 7: payments
7. Phase 8: admin
8. Phase 9–11: discoverability, QA, launch

---

## All decisions locked in

No business numbers left to wait on — APC pricing will be **admin-configurable** rather than hardcoded, which actually removes the last blocker. Schema implication: a small `site_settings` (or `apc_rates`) table holding the current APC amount, editable from the admin dashboard, rather than a constant baked into the code. If pricing ever needs to vary by section, `apc_rates` can have an optional `section_id` (nullable = applies to all sections) without a schema rewrite later.

Important: each `payments` record should **snapshot the amount charged at the time**, not just reference the current rate — so if the admin changes the price next month, historical payment records stay accurate and don't retroactively appear wrong.

Ready to move into Phase 1: repo scaffolding, Supabase project setup, and a "coming soon" page live on `nimasrepub.com.ng`.
