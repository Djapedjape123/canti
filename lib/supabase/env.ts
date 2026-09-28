// Public Supabase settings, safe for the browser.
// NEXT_PUBLIC_ values must be read as literal `process.env.NEXT_PUBLIC_…`:
// only that form is inlined into the browser bundle by Next.js.
// The service_role key is read in lib/supabase/admin.ts and nowhere else.

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

export function supabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
}

/** Publishable (sb_publishable_…) or legacy anon key. */
export function supabaseAnonKey(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
