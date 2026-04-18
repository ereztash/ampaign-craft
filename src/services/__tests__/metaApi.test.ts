import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Schema mocks ──────────────────────────────────────────────────────────

vi.mock("@/schemas/metaApi", () => ({
  metaAdAccountListSchema: {
    safeParse: vi.fn((raw: unknown) => {
      if (raw && typeof raw === "object" && "data" in (raw as object)) {
        return { success: true, data: raw };
      }
      return { success: false, error: new Error("parse error") };
    }),
  },
  metaErrorSchema: {
    safeParse: vi.fn((_raw: unknown) => ({ success: false })),
  },
  metaInsightsListSchema: {
    safeParse: vi.fn((raw: unknown) => {
      if (raw && typeof raw === "object" && "data" in (raw as object)) {
        return { success: true, data: raw };
      }
      return { success: false, error: new Error("parse error") };
    }),
  },
  metaTokenExchangeSchema: {
    safeParse: vi.fn((raw: unknown) => {
      if (raw && typeof raw === "object" && "access_token" in (raw as object)) {
        return { success: true, data: raw };
      }
      return { success: false, error: new Error("parse error") };
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

// ── Module under test ─────────────────────────────────────────────────────

import {
  MetaAuthExpiredError,
  getAdAccounts,
  getCampaignInsights,
  exchangeForLongLivedToken,
  buildMetaOAuthUrl,
  parseTokenFromHash,
} from "../metaApi";
import {
  metaAdAccountListSchema,
  metaErrorSchema,
  metaInsightsListSchema,
  metaTokenExchangeSchema,
} from "@/schemas/metaApi";
import { logger } from "@/lib/logger";

// Helper to mock fetch with a given response
function mockFetch(body: unknown, status = 200, ok?: boolean) {
  const isOk = ok !== undefined ? ok : status >= 200 && status < 300;
  global.fetch = vi.fn().mockResolvedValue({
    ok: isOk,
    status,
    statusText: isOk ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as Response);
}

describe("metaApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: metaErrorSchema does not match
    vi.mocked(metaErrorSchema.safeParse).mockReturnValue({ success: false } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── MetaAuthExpiredError ──────────────────────────────────────────────

  describe("MetaAuthExpiredError", () => {
    it("is an Error with name MetaAuthExpiredError", () => {
      const err = new MetaAuthExpiredError();
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("MetaAuthExpiredError");
      expect(err.message).toBe("Meta auth expired");
    });

    it("accepts a custom message", () => {
      const err = new MetaAuthExpiredError("custom msg");
      expect(err.message).toBe("custom msg");
    });
  });

  // ── getAdAccounts ─────────────────────────────────────────────────────

  describe("getAdAccounts", () => {
    it("returns accounts array on success", async () => {
      const accounts = [{ id: "act_1", name: "Test Account" }];
      mockFetch({ data: accounts });
      vi.mocked(metaAdAccountListSchema.safeParse).mockReturnValue({
        success: true,
        data: { data: accounts },
      } as never);

      const result = await getAdAccounts("my-token");
      expect(result).toEqual(accounts);
    });

    it("returns empty array when schema parse fails", async () => {
      mockFetch({ weird: true });
      vi.mocked(metaAdAccountListSchema.safeParse).mockReturnValue({
        success: false,
        error: new Error("bad schema"),
      } as never);

      const result = await getAdAccounts("token");
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });

    it("throws MetaAuthExpiredError on 401", async () => {
      mockFetch({}, 401, false);

      await expect(getAdAccounts("expired-token")).rejects.toThrow(MetaAuthExpiredError);
    });

    it("throws MetaAuthExpiredError on 403", async () => {
      mockFetch({}, 403, false);

      await expect(getAdAccounts("token")).rejects.toThrow(MetaAuthExpiredError);
    });

    it("throws when response is not ok and no metaError", async () => {
      mockFetch({ msg: "bad" }, 500, false);

      await expect(getAdAccounts("token")).rejects.toThrow("Meta API 500");
    });

    it("throws when metaErrorSchema matches (API error payload)", async () => {
      mockFetch({ error: { message: "Invalid OAuth token" } });
      vi.mocked(metaErrorSchema.safeParse).mockReturnValue({
        success: true,
        data: { error: { message: "Invalid OAuth token" } },
      } as never);

      await expect(getAdAccounts("token")).rejects.toThrow("Invalid OAuth token");
    });
  });

  // ── getCampaignInsights ───────────────────────────────────────────────

  describe("getCampaignInsights", () => {
    it("returns first insight on success", async () => {
      const insight = { spend: "100", impressions: "5000" };
      mockFetch({ data: [insight] });
      vi.mocked(metaInsightsListSchema.safeParse).mockReturnValue({
        success: true,
        data: { data: [insight] },
      } as never);

      const result = await getCampaignInsights("act_1", "token");
      expect(result).toEqual(insight);
    });

    it("returns null when data array is empty", async () => {
      mockFetch({ data: [] });
      vi.mocked(metaInsightsListSchema.safeParse).mockReturnValue({
        success: true,
        data: { data: [] },
      } as never);

      const result = await getCampaignInsights("act_1", "token");
      expect(result).toBeNull();
    });

    it("returns null when schema parse fails", async () => {
      mockFetch({ bad: true });
      vi.mocked(metaInsightsListSchema.safeParse).mockReturnValue({
        success: false,
        error: new Error("bad"),
      } as never);

      const result = await getCampaignInsights("act_1", "token");
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it("uses default datePreset of last_7d in URL", async () => {
      mockFetch({ data: [] });
      vi.mocked(metaInsightsListSchema.safeParse).mockReturnValue({
        success: true,
        data: { data: [] },
      } as never);

      await getCampaignInsights("act_1", "token");

      const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain("last_7d");
    });

    it("passes datePreset to URL", async () => {
      mockFetch({ data: [] });
      vi.mocked(metaInsightsListSchema.safeParse).mockReturnValue({
        success: true,
        data: { data: [] },
      } as never);

      await getCampaignInsights("act_1", "token", "last_30d");

      const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain("last_30d");
    });
  });

  // ── exchangeForLongLivedToken ─────────────────────────────────────────

  describe("exchangeForLongLivedToken", () => {
    beforeEach(() => {
      import.meta.env.VITE_SUPABASE_URL = "https://test.supabase.co";
      import.meta.env.VITE_SUPABASE_ANON_KEY = "anon-key";
    });

    it("returns access_token and expires_in on success", async () => {
      mockFetch({ access_token: "long-lived-token", expires_in: 5183944 });
      vi.mocked(metaTokenExchangeSchema.safeParse).mockReturnValue({
        success: true,
        data: { access_token: "long-lived-token", expires_in: 5183944 },
      } as never);

      const result = await exchangeForLongLivedToken("short-token");
      expect(result.access_token).toBe("long-lived-token");
      expect(result.expires_in).toBe(5183944);
    });

    it("throws when schema parse fails", async () => {
      mockFetch({ garbage: true });
      vi.mocked(metaTokenExchangeSchema.safeParse).mockReturnValue({
        success: false,
        error: new Error("bad"),
      } as never);

      await expect(exchangeForLongLivedToken("short")).rejects.toThrow(
        "Invalid Meta token response",
      );
    });

    it("throws when metaErrorSchema matches", async () => {
      mockFetch({ error: { message: "invalid token" } });
      vi.mocked(metaErrorSchema.safeParse).mockReturnValue({
        success: true,
        data: { error: { message: "invalid token" } },
      } as never);

      await expect(exchangeForLongLivedToken("bad-token")).rejects.toThrow("invalid token");
    });

    it("throws when response has a generic error field", async () => {
      // metaErrorSchema doesn't match, but data.error is present
      mockFetch({ error: "some error string" });

      await expect(exchangeForLongLivedToken("bad-token")).rejects.toThrow("some error string");
    });
  });

  // ── buildMetaOAuthUrl ─────────────────────────────────────────────────

  describe("buildMetaOAuthUrl", () => {
    it("returns a facebook oauth URL", () => {
      import.meta.env.VITE_META_APP_ID = "12345";

      // jsdom provides window.location
      const url = buildMetaOAuthUrl();
      expect(url).toContain("facebook.com/dialog/oauth");
      expect(url).toContain("client_id=12345");
      expect(url).toContain("ads_read");
      expect(url).toContain("response_type=token");
    });
  });

  // ── parseTokenFromHash ────────────────────────────────────────────────

  describe("parseTokenFromHash", () => {
    afterEach(() => {
      // Reset hash
      window.location.hash = "";
    });

    it("returns token from hash fragment", () => {
      // Simulate hash
      Object.defineProperty(window, "location", {
        value: { ...window.location, hash: "#access_token=abc123&expires_in=3600" },
        writable: true,
      });

      const result = parseTokenFromHash();
      expect(result).not.toBeNull();
      expect(result!.access_token).toBe("abc123");
      expect(result!.expires_in).toBe("3600");
    });

    it("returns null when hash is empty", () => {
      Object.defineProperty(window, "location", {
        value: { ...window.location, hash: "" },
        writable: true,
      });

      const result = parseTokenFromHash();
      expect(result).toBeNull();
    });

    it("returns null when access_token is missing", () => {
      Object.defineProperty(window, "location", {
        value: { ...window.location, hash: "#expires_in=3600" },
        writable: true,
      });

      const result = parseTokenFromHash();
      expect(result).toBeNull();
    });

    it("defaults expires_in to 3600 when missing", () => {
      Object.defineProperty(window, "location", {
        value: { ...window.location, hash: "#access_token=tok123" },
        writable: true,
      });

      const result = parseTokenFromHash();
      expect(result!.expires_in).toBe("3600");
    });
  });
});
