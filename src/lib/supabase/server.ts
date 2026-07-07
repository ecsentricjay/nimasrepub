import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

// ─── Cookie-based client ────────────────────────────────────────────────────
// Use in Server Components and Route Handlers where cookies are reliably
// available and the session token flows through automatically.

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component without a writable cookie store.
            // Safe to ignore if middleware is refreshing sessions.
          }
        },
      },
    }
  );
}

// ─── Token-authenticated client ─────────────────────────────────────────────
// Use in Server Actions for any database write operation.
//
// Why this exists: @supabase/ssr's cookie-based client reliably reads the
// session for auth.getUser() (which hits Supabase's auth server directly),
// but in Next.js Server Actions the same cookie store doesn't always attach
// the access token to PostgREST requests — so auth.uid() returns null inside
// RLS policies, causing "new row violates row-level security policy" even for
// authenticated users.
//
// The fix: read the access token explicitly from the session, then create a
// Supabase JS client with that token set in the Authorization header. PostgREST
// receives the correct JWT, auth.uid() returns the real user ID, and RLS works.
//
// Usage pattern in a Server Action:
//   const { supabase, user } = await getAuthenticatedClient();
//   await supabase.from("articles").insert({ ... });  // RLS works correctly

export async function getAuthenticatedClient() {
  // Step 1: use the cookie-based client to get + verify the session
  const cookieClient = await createClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user) return { supabase: null, user: null };

  // Step 2: get the raw access token from the session
  const {
    data: { session },
  } = await cookieClient.auth.getSession();

  if (!session?.access_token) return { supabase: null, user: null };

  // Step 3: build a plain Supabase JS client with the token explicitly in the
  // Authorization header — this is what PostgREST (and therefore RLS) actually
  // reads, so auth.uid() will correctly return user.id.
  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return { supabase, user };
}
