-- 0005_review_workflow.sql
-- Tables only — RLS lives in 0008_review_workflow_rls.sql.

create table review_invitations (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  status invitation_status not null default 'invited',
  invited_by uuid references profiles(id),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  deadline date,
  unique (article_id, reviewer_id)
);

create index review_invitations_article_idx on review_invitations (article_id);
create index review_invitations_reviewer_idx on review_invitations (reviewer_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  round int not null default 1,
  recommendation review_recommendation,
  comments_to_author text,
  comments_to_editor text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, reviewer_id, round)
);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

create index reviews_article_idx on reviews (article_id);
create index reviews_reviewer_idx on reviews (reviewer_id);

create table editorial_decisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  decided_by uuid not null references profiles(id),
  decision editorial_decision_type not null,
  round int not null default 1,
  decision_letter text,
  created_at timestamptz not null default now()
);

create index editorial_decisions_article_idx on editorial_decisions (article_id);

alter table review_invitations enable row level security;
alter table reviews enable row level security;
alter table editorial_decisions enable row level security;
