import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";
import type { Database } from "./types";

// Client with the service_role key: it bypasses RLS and sees every column,
// including booking_ical_url and guest data. Server only. Every caller
// decides which columns may leave the server.

function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see .env.example)");

  return createClient<Database>(supabaseUrl(), serviceKey, {
    // No user session: this client acts as the server itself.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let adminClient: ReturnType<typeof createAdminClient> | undefined;

/** One shared client per server instance; it holds no user state. */
export function getSupabaseAdmin() {
  adminClient ??= createAdminClient();
  return adminClient;
}
