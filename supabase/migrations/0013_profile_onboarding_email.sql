-- 0013_profile_onboarding_email.sql
--
-- Tracks whether the post-confirmation welcome/onboarding email has
-- already been sent. Supabase still owns the auth confirmation link, but
-- once the user returns through /auth/callback the app can send a branded
-- Resend onboarding email exactly once.

alter table profiles
  add column if not exists welcome_email_sent_at timestamptz;

comment on column profiles.welcome_email_sent_at is
  'Timestamp for the one-time branded onboarding email sent after auth confirmation.';
