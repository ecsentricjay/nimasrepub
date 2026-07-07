-- Real Supabase automatically grants base table privileges to the
-- anon/authenticated roles on the public schema (RLS then restricts
-- what those base privileges actually allow on a row-by-row basis).
-- This file replicates that default purely for local testing — it is
-- NOT part of the migration set applied to a real Supabase project.

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage on all sequences in schema public to anon, authenticated;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on all tables in schema storage to anon, authenticated;
