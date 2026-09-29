import { validationMessages } from "./validation";

// Helpers shared by the API routes. An error is always { error: string }
// with a fitting HTTP status.

/** Postgres: the reservations_no_overlap EXCLUDE constraint was violated (→ 409). */
export const EXCLUSION_VIOLATION = "23P01";

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** The request body as JSON, or undefined when it is not JSON (zod then answers 400). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** The first validation message (written in Serbian in lib/validation.ts), 400 unless told otherwise. */
export function validationError(error: { issues: ReadonlyArray<{ message: string }> }, status = 400): Response {
  return jsonError(error.issues[0]?.message ?? validationMessages.invalidRequest, status);
}

/** Logs where it failed and why, never the request data (no guest data in logs). */
export function logError(where: string, error: unknown): void {
  const reason =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "unknown error";
  console.error(`[api] ${where} failed: ${reason}`);
}
