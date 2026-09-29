import { describe, expect, it } from "vitest";
import {
  availableActions,
  DEFAULT_STATUS_FILTER,
  formatReceivedAt,
  formatStayDates,
  guestsLabel,
  nightsLabel,
  parseStatusFilter,
  readGuestNotified,
  STATUS_FILTERS,
  statusChangeError,
  statusChangeNotice,
  stayNote,
} from "@/lib/admin-reservations";
import { adminText } from "@/lib/admin-text";

const e = adminText.reservations.changeErrors;
const n = adminText.reservations.notices;

const TODAY = "2026-09-29";

describe("parseStatusFilter", () => {
  it("accepts every known filter", () => {
    for (const filter of STATUS_FILTERS) expect(parseStatusFilter(filter)).toBe(filter);
  });

  it("falls back to pending for anything else", () => {
    expect(DEFAULT_STATUS_FILTER).toBe("pending");
    for (const value of [undefined, "", "PENDING", "deleted", ["pending", "all"], 1]) {
      expect(parseStatusFilter(value)).toBe("pending");
    }
  });
});

describe("formatStayDates", () => {
  it("shows arrival and departure day without the year in the current year", () => {
    // Arrive Friday 2 Oct, leave Sunday 4 Oct: nights of 2 and 3 Oct.
    expect(formatStayDates("2026-10-02", "2026-10-04", TODAY)).toBe("pet 2. okt – ned 4. okt");
  });

  it("adds the year to a day in another year (New Year's Eve stay)", () => {
    expect(formatStayDates("2026-12-31", "2027-01-02", TODAY)).toBe("čet 31. dec – sub 2. jan 2027.");
    expect(formatStayDates("2025-11-07", "2025-11-09", TODAY)).toBe("pet 7. nov 2025. – ned 9. nov 2025.");
  });
});

describe("nightsLabel", () => {
  it("counts nights with an exclusive check_out and uses Serbian plurals", () => {
    expect(nightsLabel("2026-10-02", "2026-10-03")).toBe("1 noć");
    expect(nightsLabel("2026-10-02", "2026-10-04")).toBe("2 noći");
    expect(nightsLabel("2026-10-01", "2026-10-06")).toBe("5 noći");
    expect(nightsLabel("2026-10-01", "2026-10-22")).toBe("21 noć");
  });

  it("crosses a month and the switch to winter time (25 Oct 2026)", () => {
    expect(nightsLabel("2026-10-24", "2026-10-26")).toBe("2 noći");
    expect(nightsLabel("2026-10-30", "2026-11-02")).toBe("3 noći");
  });
});

describe("guestsLabel", () => {
  it("uses Serbian plurals", () => {
    expect(guestsLabel(1)).toBe("1 gost");
    expect(guestsLabel(2)).toBe("2 gosta");
    expect(guestsLabel(5)).toBe("5 gostiju");
  });
});

describe("formatReceivedAt", () => {
  it("shows the moment in Belgrade time (summer, UTC+2)", () => {
    expect(formatReceivedAt("2026-09-29T12:32:00.123+00:00")).toBe("29. sep 2026. u 14:32");
  });

  it("follows the switch to winter time (UTC+1)", () => {
    // 25 Oct 2026, 00:30 UTC is still summer time in Belgrade; 01:30 UTC is winter time.
    expect(formatReceivedAt("2026-10-25T00:30:00Z")).toBe("25. okt 2026. u 02:30");
    expect(formatReceivedAt("2026-10-25T01:30:00Z")).toBe("25. okt 2026. u 02:30");
  });

  it("moves to the next day (and year) when Belgrade is already past midnight", () => {
    expect(formatReceivedAt("2026-12-31T23:30:00Z")).toBe("1. jan 2027. u 00:30");
  });
});

describe("stayNote", () => {
  const stay = { checkIn: "2026-10-02", checkOut: "2026-10-05", status: "confirmed" as const };

  it("marks arrival day, the nights in between and departure day", () => {
    expect(stayNote(stay, "2026-10-02")).toBe("Dolazak danas");
    expect(stayNote(stay, "2026-10-03")).toBe("Gost je u apartmanu");
    expect(stayNote(stay, "2026-10-04")).toBe("Gost je u apartmanu");
    // check_out is exclusive: on 5 Oct the guest leaves.
    expect(stayNote(stay, "2026-10-05")).toBe("Odlazak danas");
  });

  it("says nothing before or after the stay", () => {
    expect(stayNote(stay, "2026-10-01")).toBeNull();
    expect(stayNote(stay, "2026-10-06")).toBeNull();
  });

  it("works for pending requests, but not for blocks or cancelled ones", () => {
    expect(stayNote({ ...stay, status: "pending" }, "2026-10-02")).toBe("Dolazak danas");
    expect(stayNote({ ...stay, status: "blocked" }, "2026-10-02")).toBeNull();
    expect(stayNote({ ...stay, status: "cancelled" }, "2026-10-03")).toBeNull();
  });
});

describe("statusChangeError", () => {
  const future = "2026-10-05";

  it("lets a pending request be confirmed or cancelled", () => {
    expect(statusChangeError("pending", "confirmed", future, TODAY)).toBeNull();
    expect(statusChangeError("pending", "cancelled", future, TODAY)).toBeNull();
  });

  it("lets a confirmed reservation be cancelled, but not confirmed again", () => {
    expect(statusChangeError("confirmed", "cancelled", future, TODAY)).toBeNull();
    expect(statusChangeError("confirmed", "confirmed", future, TODAY)).toBe(e.alreadyConfirmed);
  });

  it("lets a block be removed, but never confirmed (it has no guest)", () => {
    expect(statusChangeError("blocked", "cancelled", future, TODAY)).toBeNull();
    expect(statusChangeError("blocked", "confirmed", future, TODAY)).toBe(e.blockCannotBeConfirmed);
  });

  it("never brings a cancelled reservation back (its dates may be taken)", () => {
    expect(statusChangeError("cancelled", "confirmed", future, TODAY)).toBe(e.alreadyCancelled);
    expect(statusChangeError("cancelled", "cancelled", future, TODAY)).toBe(e.alreadyCancelled);
  });

  it("allows changes up to the check_out day, not after", () => {
    // check_out is exclusive: on that day the guest is still leaving.
    expect(statusChangeError("confirmed", "cancelled", TODAY, TODAY)).toBeNull();
    expect(statusChangeError("confirmed", "cancelled", "2026-09-28", TODAY)).toBe(e.stayOver);
    expect(statusChangeError("pending", "confirmed", "2026-09-28", TODAY)).toBe(e.stayOver);
  });
});

describe("availableActions", () => {
  const future = "2026-10-05";

  it("shows both buttons on a pending request and only Otkaži on a confirmed one", () => {
    expect(availableActions({ status: "pending", checkOut: future }, TODAY)).toEqual({ confirm: true, cancel: true });
    expect(availableActions({ status: "confirmed", checkOut: future }, TODAY)).toEqual({ confirm: false, cancel: true });
  });

  it("shows no buttons on blocks, cancelled ones and stays that are over", () => {
    const none = { confirm: false, cancel: false };
    expect(availableActions({ status: "blocked", checkOut: future }, TODAY)).toEqual(none);
    expect(availableActions({ status: "cancelled", checkOut: future }, TODAY)).toEqual(none);
    expect(availableActions({ status: "pending", checkOut: "2026-09-28" }, TODAY)).toEqual(none);
  });
});

describe("notice after a change", () => {
  it("reads guestNotified only when it is exactly true", () => {
    expect(readGuestNotified({ id: "x", status: "confirmed", guestNotified: true })).toBe(true);
    for (const data of [{ guestNotified: false }, { guestNotified: "true" }, {}, null, undefined, "ok"]) {
      expect(readGuestNotified(data)).toBe(false);
    }
  });

  it("tells the owner to call the guest when no email went out", () => {
    expect(statusChangeNotice("confirmed", true)).toBe(n.confirmedNotified);
    expect(statusChangeNotice("confirmed", false)).toBe(n.confirmedNotNotified);
    expect(statusChangeNotice("cancelled", true)).toBe(n.cancelledNotified);
    expect(statusChangeNotice("cancelled", false)).toBe(n.cancelledNotNotified);
  });
});
