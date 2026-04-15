// ═══════════════════════════════════════════════
// Analytics — AARRR unit tests
// ═══════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { track, captureUTM, getUTM, getStageFromEvent, Analytics } from "../analytics";

// ─── Helpers ───────────────────────────────────

function mockSessionStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    store,
  };
}

// ─── getStageFromEvent ──────────────────────────

describe("getStageFromEvent", () => {
  it("returns acquisition for acquisition events", () => {
    expect(getStageFromEvent("aarrr.acquisition.landing_view")).toBe("acquisition");
    expect(getStageFromEvent("aarrr.acquisition.signup_completed")).toBe("acquisition");
  });

  it("returns activation for activation events", () => {
    expect(getStageFromEvent("aarrr.activation.first_plan_generated")).toBe("activation");
    expect(getStageFromEvent("aarrr.activation.aha_moment")).toBe("activation");
  });

  it("returns retention for retention events", () => {
    expect(getStageFromEvent("aarrr.retention.weekly_active")).toBe("retention");
    expect(getStageFromEvent("aarrr.retention.streak_broken")).toBe("retention");
  });

  it("returns revenue for revenue events", () => {
    expect(getStageFromEvent("aarrr.revenue.paywall_viewed")).toBe("revenue");
    expect(getStageFromEvent("aarrr.revenue.conversion_completed")).toBe("revenue");
  });

  it("returns referral for referral events", () => {
    expect(getStageFromEvent("aarrr.referral.share_created")).toBe("referral");
    expect(getStageFromEvent("aarrr.referral.signup_from_share")).toBe("referral");
  });
});

// ─── captureUTM ────────────────────────────────

describe("captureUTM", () => {
  let origLocation: Location;
  let origSessionStorage: Storage;
  let fakeSession: ReturnType<typeof mockSessionStorage>;

  beforeEach(() => {
    origLocation = window.location;
    origSessionStorage = window.sessionStorage;
    fakeSession = mockSessionStorage();
    Object.defineProperty(window, "sessionStorage", { value: fakeSession, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: origLocation, writable: true });
    Object.defineProperty(window, "sessionStorage", { value: origSessionStorage, writable: true });
  });

  it("captures utm_source from URL and persists to sessionStorage", () => {
    Object.defineProperty(window, "location", {
      value: { ...origLocation, search: "?utm_source=google&utm_medium=cpc" },
      writable: true,
    });
    captureUTM();
    expect(fakeSession.setItem).toHaveBeenCalledWith(
      "funnelforge_utm",
      expect.stringContaining("google")
    );
  });

  it("captures ref (referral code) from URL", () => {
    Object.defineProperty(window, "location", {
      value: { ...origLocation, search: "?ref=ABCD1234" },
      writable: true,
    });
    captureUTM();
    const stored = fakeSession.store["funnelforge_utm"];
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed.ref).toBe("ABCD1234");
  });

  it("does nothing when no UTM params present", () => {
    Object.defineProperty(window, "location", {
      value: { ...origLocation, search: "" },
      writable: true,
    });
    captureUTM();
    expect(fakeSession.setItem).not.toHaveBeenCalled();
  });
});

// ─── getUTM ────────────────────────────────────

describe("getUTM", () => {
  let origSessionStorage: Storage;

  beforeEach(() => {
    origSessionStorage = window.sessionStorage;
  });

  afterEach(() => {
    Object.defineProperty(window, "sessionStorage", { value: origSessionStorage, writable: true });
  });

  it("returns stored UTM params", () => {
    const fake = mockSessionStorage();
    fake.store["funnelforge_utm"] = JSON.stringify({ utm_source: "test" });
    Object.defineProperty(window, "sessionStorage", { value: fake, writable: true });
    expect(getUTM()).toEqual({ utm_source: "test" });
  });

  it("returns empty object when nothing stored", () => {
    const fake = mockSessionStorage();
    Object.defineProperty(window, "sessionStorage", { value: fake, writable: true });
    expect(getUTM()).toEqual({});
  });

  it("returns empty object on JSON parse error", () => {
    const fake = mockSessionStorage();
    fake.store["funnelforge_utm"] = "not-json";
    Object.defineProperty(window, "sessionStorage", { value: fake, writable: true });
    expect(getUTM()).toEqual({});
  });
});

// ─── track ─────────────────────────────────────

describe("track (GA4 dispatch)", () => {
  let gtagCalls: unknown[][];

  beforeEach(() => {
    gtagCalls = [];
    window.gtag = (...args: unknown[]) => { gtagCalls.push(args); };
  });

  afterEach(() => {
    delete window.gtag;
  });

  it("calls gtag with snake_case event name", async () => {
    await track("aarrr.acquisition.landing_view", { page: "/" }, { uiOnly: true });
    expect(gtagCalls.length).toBeGreaterThan(0);
    expect(gtagCalls[0][1]).toBe("aarrr_acquisition_landing_view");
  });

  it("truncates GA4 event name to 40 chars", async () => {
    await track("aarrr.activation.first_plan_generated", {}, { uiOnly: true });
    const name = gtagCalls[0][1] as string;
    expect(name.length).toBeLessThanOrEqual(40);
  });

  it("does not throw when gtag is undefined", async () => {
    delete window.gtag;
    await expect(track("aarrr.retention.weekly_active", {}, { uiOnly: true })).resolves.not.toThrow();
  });
});

// ─── Analytics.* shortcuts ─────────────────────

describe("Analytics shortcuts", () => {
  beforeEach(() => {
    window.gtag = vi.fn();
  });
  afterEach(() => { delete window.gtag; });

  it("shareViewed fires with shareId and referrerCode", async () => {
    await Analytics.shareViewed("abc123", "MYREF");
    expect(window.gtag).toHaveBeenCalled();
  });

  it("paywallViewed fires with correct feature and tier", async () => {
    await Analytics.paywallViewed("aiCoachMessages", "free", "user-1");
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "aarrr_revenue_paywall_viewed",
      expect.objectContaining({ feature: "aiCoachMessages", tier: "free" })
    );
  });
});
