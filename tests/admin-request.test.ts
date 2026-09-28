import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_REQUEST_TIMEOUT_MS, sendAdminChange } from "@/lib/admin-request";
import { adminText } from "@/lib/admin-text";

// fetch is replaced by a fake, so no request leaves the test.
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const change = { slug: "de-lux", from: "2026-12-31", to: "2027-01-02", price: 120 };

describe("sendAdminChange", () => {
  it("sends JSON with the given method and reports success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true, days: 3 }));

    await expect(sendAdminChange("/api/admin/prices", "PUT", change)).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/prices");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual(change);
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("passes on the Serbian message of the API", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "Prvi dan ne sme biti posle poslednjeg." }));

    await expect(sendAdminChange("/api/admin/prices", "PUT", change)).resolves.toEqual({
      ok: false,
      message: "Prvi dan ne sme biti posle poslednjeg.",
      login: false,
    });
  });

  it("asks the owner to log in again after 401", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Niste prijavljeni." }));

    await expect(sendAdminChange("/api/admin/prices", "DELETE", change)).resolves.toEqual({
      ok: false,
      message: adminText.form.sessionExpired,
      login: true,
    });
  });

  it("uses a general message when the answer is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));

    await expect(sendAdminChange("/api/admin/apartments/de-lux", "PATCH", { price_weekday: 70 })).resolves.toEqual({
      ok: false,
      message: adminText.api.saveFailed,
      login: false,
    });
  });

  it("reports a missing connection", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(sendAdminChange("/api/admin/prices", "PUT", change)).resolves.toEqual({
      ok: false,
      message: adminText.form.networkError,
      login: false,
    });
  });

  it("gives up after the timeout instead of waiting forever", async () => {
    vi.useFakeTimers();
    // A server that never answers: the request only ends when it is aborted.
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    const result = sendAdminChange("/api/admin/prices", "PUT", change);
    await vi.advanceTimersByTimeAsync(ADMIN_REQUEST_TIMEOUT_MS);

    await expect(result).resolves.toEqual({ ok: false, message: adminText.form.networkError, login: false });
  });
});
