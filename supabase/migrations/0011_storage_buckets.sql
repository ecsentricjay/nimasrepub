-- 0008_storage_buckets.sql
--
-- Two buckets, deliberately different visibility:
--   - manuscripts: private working files (submissions, revisions,
--     cover letters). Same access rules as the manuscript_files table.
--   - published-pdfs: PUBLIC, no auth required. This is non-negotiable
--     for Google Scholar — its crawler must be able to fetch the PDF
--     with no login wall, or indexing silently fails.
--
-- Path convention for both buckets: {article_id}/{filename}
-- storage.foldername(name) splits that into an array, so
-- (storage.foldername(name))[1] gives the article_id as text.

insert into storage.buckets (id, name, public)
values
  ('manuscripts', 'manuscripts', false),
  ('published-pdfs', 'published-pdfs', true)
on conflict (id) do nothing;

-- manuscripts bucket
create policy "article owners read their manuscript files in storage"
  on storage.objects for select
  using (
    bucket_id = 'manuscripts'
    and exists (
      select 1 from article_authors
      where article_authors.article_id = ((storage.foldername(name))[1])::uuid
        and article_authors.user_id = auth.uid()
    )
  );

create policy "accepted reviewers read manuscript files in storage"
  on storage.objects for select
  using (
    bucket_id = 'manuscripts'
    and exists (
      select 1 from review_invitations
      where review_invitations.article_id = ((storage.foldername(name))[1])::uuid
        and review_invitations.reviewer_id = auth.uid()
        and review_invitations.status = 'accepted'
    )
  );

create policy "section editors read manuscript files in their section"
  on storage.objects for select
  using (
    bucket_id = 'manuscripts'
    and exists (
      select 1 from articles
      where articles.id = ((storage.foldername(name))[1])::uuid
        and is_section_editor_of(auth.uid(), articles.section_id)
    )
  );

create policy "admins and eic read all manuscript files in storage"
  on storage.objects for select
  using (bucket_id = 'manuscripts' and is_admin_or_eic(auth.uid()));

create policy "article owners upload manuscript files"
  on storage.objects for insert
  with check (
    bucket_id = 'manuscripts'
    and (
      exists (
        select 1 from article_authors
        where article_authors.article_id = ((storage.foldername(name))[1])::uuid
          and article_authors.user_id = auth.uid()
      )
      or is_admin_or_eic(auth.uid())
    )
  );

create policy "only admins and eic modify manuscript files in storage"
  on storage.objects for update
  using (bucket_id = 'manuscripts' and is_admin_or_eic(auth.uid()));

create policy "only admins and eic delete manuscript files in storage"
  on storage.objects for delete
  using (bucket_id = 'manuscripts' and is_admin_or_eic(auth.uid()));

-- published-pdfs bucket — public read, no auth.uid() check at all.
-- This is the policy Google Scholar's crawler depends on.
create policy "published pdfs are publicly readable"
  on storage.objects for select
  using (bucket_id = 'published-pdfs');

create policy "only admins and eic publish pdfs"
  on storage.objects for insert
  with check (bucket_id = 'published-pdfs' and is_admin_or_eic(auth.uid()));

create policy "only admins and eic update published pdfs"
  on storage.objects for update
  using (bucket_id = 'published-pdfs' and is_admin_or_eic(auth.uid()));

create policy "only admins and eic remove published pdfs"
  on storage.objects for delete
  using (bucket_id = 'published-pdfs' and is_admin_or_eic(auth.uid()));
