import { describe, expect, it } from "vitest";
import { isOwnerEmail } from "@/lib/admin-access";

const owner = "vlasnik@example.com";

describe("isOwnerEmail", () => {
  it("accepts the owner's email, whatever the letter case and spaces", () => {
    expect(isOwnerEmail("vlasnik@example.com", owner)).toBe(true);
    expect(isOwnerEmail("Vlasnik@Example.com", owner)).toBe(true);
    expect(isOwnerEmail("vlasnik@example.com", "  VLASNIK@example.com ")).toBe(true);
  });

  it("refuses any other account", () => {
    expect(isOwnerEmail("gost@example.com", owner)).toBe(false);
    expect(isOwnerEmail("vlasnik@example.co", owner)).toBe(false);
  });

  it("refuses an account without an email", () => {
    expect(isOwnerEmail(undefined, owner)).toBe(false);
    expect(isOwnerEmail(null, owner)).toBe(false);
    expect(isOwnerEmail("", owner)).toBe(false);
  });

  it("refuses everyone when OWNER_EMAIL is missing or empty", () => {
    expect(isOwnerEmail("vlasnik@example.com", undefined)).toBe(false);
    expect(isOwnerEmail("vlasnik@example.com", "")).toBe(false);
    expect(isOwnerEmail("", "")).toBe(false);
  });
});
