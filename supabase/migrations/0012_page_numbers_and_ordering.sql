-- 0012_page_numbers_and_ordering.sql
--
-- Adds page numbers and ordering for articles within a journal issue.
-- page_start / page_end: the actual page range as it appears in print.
-- article_order: editorial ordering within an issue (used to auto-calculate
--   page ranges and to sort the table of contents). Lower number = earlier.
--
-- All nullable — articles without an assigned issue don't have page numbers.

alter table articles
  add column if not exists page_start integer,
  add column if not exists page_end  integer,
  add column if not exists article_order integer;

comment on column articles.page_start is
  'First page of this article in its issue (e.g. 1, 14, 27).';
comment on column articles.page_end is
  'Last page of this article in its issue.';
comment on column articles.article_order is
  'Editorial ordering within the issue. Lower numbers appear first in the TOC.';

create index if not exists articles_issue_order_idx
  on articles (issue_id, article_order);
