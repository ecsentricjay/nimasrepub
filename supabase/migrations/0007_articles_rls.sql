-- 0007_articles_rls.sql
--
-- Note on scope: these policies handle READ scoping strictly (that's
-- the part that protects confidentiality) and provide baseline write
-- safety. The precise article status state machine (submitted ->
-- under_review -> accepted -> awaiting_payment -> ...) is enforced in
-- Server Actions, not fully encoded here — RLS guarantees you can only
-- touch articles/files you have a legitimate relationship to, the
-- application layer guarantees you can only move them through valid
-- transitions.

-- articles: select
create policy "published articles are public"
  on articles for select
  using (status = 'published');

create policy "authors can view their own articles"
  on articles for select
  using (is_article_author(id, auth.uid()));

create policy "section editors view articles in their section"
  on articles for select
  using (is_section_editor_of(auth.uid(), section_id));

create policy "admins and eic view all articles"
  on articles for select
  using (is_admin_or_eic(auth.uid()));

create policy "assigned reviewers view their assigned articles"
  on articles for select
  using (is_assigned_reviewer(id, auth.uid()));

-- articles: insert
create policy "authenticated users can submit their own articles"
  on articles for insert
  with check (
    auth.uid() is not null
    and submitted_via = 'self'
  );

create policy "admins and eic can ghost-publish articles"
  on articles for insert
  with check (
    is_admin_or_eic(auth.uid())
    and submitted_via = 'admin_proxy'
    and created_by = auth.uid()
  );

-- articles: update
create policy "authors can edit their own pre-review articles"
  on articles for update
  using (
    is_article_author(id, auth.uid())
    and status in ('draft', 'submitted', 'revisions_requested')
  );

create policy "section editors update articles in their section"
  on articles for update
  using (is_section_editor_of(auth.uid(), section_id));

create policy "admins and eic update any article"
  on articles for update
  using (is_admin_or_eic(auth.uid()));

-- articles: delete (only ever a draft an author abandons, or admin cleanup)
create policy "authors can delete their own draft articles"
  on articles for delete
  using (status = 'draft' and is_article_author(id, auth.uid()));

create policy "admins can delete any article"
  on articles for delete
  using (is_admin(auth.uid()));

-- article_authors: select
create policy "authors of published articles are public"
  on article_authors for select
  using (is_published_article(article_id));

create policy "users can view their own author records"
  on article_authors for select
  using (user_id = auth.uid());

create policy "co-authors can view each other"
  on article_authors for select
  using (is_article_author(article_id, auth.uid()));

create policy "section editors view authors in their section"
  on article_authors for select
  using (is_section_editor_of_article(auth.uid(), article_id));

create policy "admins and eic view all article authors"
  on article_authors for select
  using (is_admin_or_eic(auth.uid()));

create policy "accepted reviewers view co-author list for their article"
  on article_authors for select
  using (is_assigned_reviewer(article_id, auth.uid()));

-- article_authors: write
create policy "article owners and editors manage authors"
  on article_authors for insert
  with check (
    is_admin_or_eic(auth.uid())
    or user_id = auth.uid()
    or is_article_author(article_id, auth.uid())
  );

create policy "article owners and editors update authors"
  on article_authors for update
  using (
    is_admin_or_eic(auth.uid())
    or is_article_author(article_id, auth.uid())
  );

create policy "article owners and editors remove authors"
  on article_authors for delete
  using (
    is_admin_or_eic(auth.uid())
    or is_article_author(article_id, auth.uid())
  );

-- manuscript_files: select (NOT public — these are pre-publication
-- working files, distinct from the public final PDF referenced by
-- articles.pdf_path)
create policy "article owners view their manuscript files"
  on manuscript_files for select
  using (is_article_author(article_id, auth.uid()));

create policy "section editors view manuscript files in their section"
  on manuscript_files for select
  using (is_section_editor_of_article(auth.uid(), article_id));

create policy "admins and eic view all manuscript files"
  on manuscript_files for select
  using (is_admin_or_eic(auth.uid()));

create policy "accepted reviewers view manuscript files for their article"
  on manuscript_files for select
  using (is_assigned_reviewer(article_id, auth.uid()));

-- manuscript_files: write
create policy "article owners upload their manuscript files"
  on manuscript_files for insert
  with check (
    is_article_author(article_id, auth.uid())
    or is_admin_or_eic(auth.uid())
  );

create policy "only admins and eic modify manuscript files"
  on manuscript_files for update
  using (is_admin_or_eic(auth.uid()));

create policy "only admins and eic delete manuscript files"
  on manuscript_files for delete
  using (is_admin_or_eic(auth.uid()));
