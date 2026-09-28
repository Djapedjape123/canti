// Who may use the admin panel, and where it sends people.
// No server-only import: proxy.ts uses this file too.

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin/kalendar";
/** A logged-in account that is not the owner's lands here (no redirect loop). */
export const ADMIN_FORBIDDEN_PATH = `${ADMIN_LOGIN_PATH}?error=forbidden`;

/**
 * There is exactly one admin account: the owner's (OWNER_EMAIL).
 * Letter case and surrounding spaces are ignored. Without OWNER_EMAIL nobody gets in.
 */
export function isOwnerEmail(email: string | null | undefined, ownerEmail: string | undefined): boolean {
  const owner = ownerEmail?.trim().toLowerCase();
  if (!owner) return false;
  return email?.trim().toLowerCase() === owner;
}
