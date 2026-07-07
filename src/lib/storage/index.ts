import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const MANUSCRIPTS_BUCKET = "manuscripts";

type AnySupabaseClient = SupabaseClient<Database>;

/**
 * Upload a file to the private manuscripts bucket.
 * Accepts an optional pre-authenticated client — pass this from a Server
 * Action that already has the user's access token attached (via
 * getAuthenticatedClient) so Storage RLS uses the correct JWT.
 * Falls back to the cookie-based client for reads inside Server Components.
 */
export async function uploadManuscriptFile({
  articleId,
  file,
  filename,
  client,
}: {
  articleId: string;
  file: Blob;
  filename: string;
  client?: AnySupabaseClient;
}): Promise<string> {
  const supabase = client ?? (await createClient());
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  const path = `${articleId}/${Date.now()}-${safeName}`;
  const ext = filename.split(".").pop() ?? "pdf";

  const { error } = await supabase.storage
    .from(MANUSCRIPTS_BUCKET)
    .upload(path, file, {
      contentType:
        ext === "pdf" ? "application/pdf" : "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(`File upload failed: ${error.message}`);
  return path;
}

/**
 * Generate a short-lived signed URL for a private manuscript file.
 * Signed URLs expire — never store them; generate fresh each request.
 */
export async function getSignedManuscriptUrl(
  path: string,
  expiresInSeconds = 3600,
  client?: AnySupabaseClient
): Promise<string> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.storage
    .from(MANUSCRIPTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) throw new Error("Could not generate download link.");
  return data.signedUrl;
}
