import { adminText } from "./admin-text";

// Sends one change from the admin panel to the admin API (price editor and
// base price form). Every failure comes back as a Serbian message.

/** A save without an answer after this long is reported as failed (no endless waiting). */
export const ADMIN_REQUEST_TIMEOUT_MS = 15_000;

export type AdminRequestResult = { ok: true } | { ok: false; message: string; login: boolean };

export async function sendAdminChange(
  url: string,
  method: "PUT" | "PATCH" | "DELETE",
  body: unknown,
): Promise<AdminRequestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ADMIN_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.ok) return { ok: true };
    // 401: the login has expired, the owner has to log in again.
    if (response.status === 401) return { ok: false, message: adminText.form.sessionExpired, login: true };

    // The API always answers { error } in Serbian.
    const data: unknown = await response.json().catch(() => null);
    const message =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : adminText.api.saveFailed;
    return { ok: false, message, login: false };
  } catch {
    // No connection, or no answer in time.
    return { ok: false, message: adminText.form.networkError, login: false };
  } finally {
    clearTimeout(timer);
  }
}
