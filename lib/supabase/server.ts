import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "./types";

/**
 * Client that acts as the visitor, using this request's session cookies.
 * Only for checking who is logged in to the admin panel: with the anon key
 * and RLS without policies it cannot read any table.
 * Create a new one for every request, never share it.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies (only Route Handlers can).
          // The proxy refreshes the session on every /admin request, so
          // nothing is lost here.
        }
      },
    },
  });
}
