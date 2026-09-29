import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ADMIN_FORBIDDEN_PATH, ADMIN_LOGIN_PATH, isOwnerEmail } from "./admin-access";
import { adminText } from "./admin-text";
import { createSupabaseServerClient } from "./supabase/server";

// The proxy already turns away everyone except the owner, but every admin API
// route and page checks again here: a changed matcher must never be enough to
// open the admin panel.

// cache(): the admin layout and the page both check, but Supabase Auth is asked once per request.
const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  // getUser() asks Supabase Auth to verify the session; a cookie alone is not trusted.
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export type AdminCheck = { ok: true; user: User } | { ok: false; response: Response };

/**
 * For admin API routes:
 *   const admin = await requireAdmin();
 *   if (!admin.ok) return admin.response;
 * 401 when nobody is logged in, 403 when the account is not the owner's.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: Response.json({ error: adminText.api.notLoggedIn }, { status: 401 }) };
  }
  if (!isOwnerEmail(user.email, process.env.OWNER_EMAIL)) {
    return { ok: false, response: Response.json({ error: adminText.api.forbidden }, { status: 403 }) };
  }
  return { ok: true, user };
}

/** For admin pages: anyone who is not the owner goes to the login page. */
export async function requireAdminPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(ADMIN_LOGIN_PATH);
  if (!isOwnerEmail(user.email, process.env.OWNER_EMAIL)) redirect(ADMIN_FORBIDDEN_PATH);
  return user;
}
