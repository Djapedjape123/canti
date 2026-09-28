import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "./types";

/**
 * Client for the browser, only for the admin login form and logout.
 * It uses the public anon key; RLS without policies means it cannot read any table.
 * The session is stored in cookies, so the server and the proxy can see it.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
