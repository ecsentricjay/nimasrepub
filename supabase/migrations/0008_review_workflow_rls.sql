-- 0008_review_workflow_rls.sql

-- review_invitations
create policy "reviewers view their own invitations"
  on review_invitations for select
  using (reviewer_id = auth.uid());

create policy "section editors view invitations in their section"
  on review_invitations for select
  using (is_section_editor_of_article(auth.uid(), article_id));

create policy "admins and eic view all invitations"
  on review_invitations for select
  using (is_admin_or_eic(auth.uid()));

create policy "editors create review invitations"
  on review_invitations for insert
  with check (
    is_admin_or_eic(auth.uid())
    or is_section_editor_of_article(auth.uid(), article_id)
  );

create policy "reviewers respond to their own invitation"
  on review_invitations for update
  using (reviewer_id = auth.uid());

create policy "editors manage invitations in their section"
  on review_invitations for update
  using (
    is_admin_or_eic(auth.uid())
    or is_section_editor_of_article(auth.uid(), article_id)
  );

create policy "admins delete invitations"
  on review_invitations for delete
  using (is_admin(auth.uid()));

-- reviews: double-blind model. Reviewer identities are not disclosed to
-- authors or anonymous visitors. Authors can see submitted reviewer
-- comments on their own article; editors/admins can see reviewer
-- identities for workflow and audit purposes.
create policy "reviewers view their own reviews"
  on reviews for select
  using (reviewer_id = auth.uid());

create policy "article authors view reviews on their article"
  on reviews for select
  using (is_article_author(article_id, auth.uid()));

create policy "section editors view reviews in their section"
  on reviews for select
  using (is_section_editor_of_article(auth.uid(), article_id));

create policy "admins and eic view all reviews"
  on reviews for select
  using (is_admin_or_eic(auth.uid()));

create policy "invited reviewers write their review"
  on reviews for insert
  with check (
    reviewer_id = auth.uid()
    and is_assigned_reviewer(article_id, auth.uid())
  );

create policy "reviewers update their own unsubmitted review"
  on reviews for update
  using (reviewer_id = auth.uid() and submitted_at is null);

create policy "admins manage reviews"
  on reviews for update
  using (is_admin(auth.uid()));

create policy "admins delete reviews"
  on reviews for delete
  using (is_admin(auth.uid()));

-- editorial_decisions: visible to the article's authors and editors,
-- never public (decision letters are private correspondence).
create policy "article authors view decisions on their article"
  on editorial_decisions for select
  using (is_article_author(article_id, auth.uid()));

create policy "section editors view decisions in their section"
  on editorial_decisions for select
  using (is_section_editor_of_article(auth.uid(), article_id));

create policy "admins and eic view all decisions"
  on editorial_decisions for select
  using (is_admin_or_eic(auth.uid()));

create policy "editors record decisions"
  on editorial_decisions for insert
  with check (
    decided_by = auth.uid()
    and (
      is_admin_or_eic(auth.uid())
      or is_section_editor_of_article(auth.uid(), article_id)
    )
  );

create policy "admins manage decisions"
  on editorial_decisions for update
  using (is_admin(auth.uid()));

create policy "admins delete decisions"
  on editorial_decisions for delete
  using (is_admin(auth.uid()));
