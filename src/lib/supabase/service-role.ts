import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client — bypasses Row Level Security entirely.
 *
 * ONLY use this in trusted server contexts: Paystack webhook handlers,
 * scheduled jobs, admin-only Server Actions that have already verified
 * the caller's role. NEVER import this into anything that runs in the
 * browser, and never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
