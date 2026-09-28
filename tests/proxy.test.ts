import { NextRequest, type NextResponse } from "next/server";
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "@/proxy";

describe("proxy matcher", () => {
  it.each([
    "/admin",
    "/admin/login",
    "/admin/kalendar",
    "/admin/podesavanja",
    "/api/admin/prices",
    "/api/admin/apartments/de-lux",
    "/",
    "/sr",
    "/apartmani/de-lux",
  ])("runs on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each(["/api/availability/de-lux", "/api/ical/de-lux", "/_next/static/chunk.js", "/favicon.ico"])(
    "skips %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    },
  );
});

// Without session cookies Supabase does not make any network call,
// so these tests run offline. The logged-in cases are checked by hand.
describe("proxy without a login", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("OWNER_EMAIL", "vlasnik@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function run(path: string): Promise<NextResponse> {
    const response = await proxy(new NextRequest(new URL(path, "http://localhost:3000")));
    if (!response) throw new Error(`the proxy let ${path} through without a response`);
    return response;
  }

  it("sends admin pages to the login page", async () => {
    for (const path of ["/admin", "/admin/kalendar", "/admin/podesavanja"]) {
      expect(getRedirectUrl(await run(path))).toBe("http://localhost:3000/admin/login");
    }
  });

  it("shows the login page instead of redirecting", async () => {
    const response = await run("/admin/login");
    expect(getRedirectUrl(response)).toBeNull();
    expect(response.status).toBe(200);
  });

  it("answers the admin API with 401 and a Serbian message", async () => {
    const response = await run("/api/admin/prices");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Niste prijavljeni." });
  });

  it("still sends public pages without a language to Serbian", async () => {
    expect(getRedirectUrl(await run("/apartmani/de-lux"))).toBe("http://localhost:3000/sr/apartmani/de-lux");
    expect(await proxy(new NextRequest("http://localhost:3000/sr"))).toBeUndefined();
  });
});
