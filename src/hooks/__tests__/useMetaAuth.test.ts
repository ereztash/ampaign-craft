import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock META_ENABLED to be true by default
vi.mock("@/lib/validateEnv", () => ({
  META_ENABLED: true,
  ALLOW_LOCAL_AUTH: true,
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    remove: vi.fn(),
  },
  safeSessionStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@/services/metaApi", () => ({
  buildMetaOAuthUrl: vi.fn(() => "https://facebook.com/oauth?client_id=123"),
  parseTokenFromHash: vi.fn(() => null),
  exchangeForLongLivedToken: vi.fn(),
  getAdAccounts: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { safeSessionStorage } from "@/lib/safeStorage";
import {
  buildMetaOAuthUrl,
  parseTokenFromHash,
  exchangeForLongLivedToken,
  getAdAccounts,
} from "@/services/metaApi";
import { useMetaAuth } from "../useMetaAuth";

const mockSafeSessionStorage = vi.mocked(safeSessionStorage);
const mockParseTokenFromHash = vi.mocked(parseTokenFromHash);
const mockExchangeForLongLivedToken = vi.mocked(exchangeForLongLivedToken);
const mockGetAdAccounts = vi.mocked(getAdAccounts);
const mockBuildMetaOAuthUrl = vi.mocked(buildMetaOAuthUrl);

describe("useMetaAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseTokenFromHash.mockReturnValue(null);
    mockSafeSessionStorage.getJSON.mockReturnValue(null);
    mockGetAdAccounts.mockResolvedValue([]);
    // Reset window.history.replaceState
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with auth=null when no session stored", () => {
    const { result } = renderHook(() => useMetaAuth());
    expect(result.current.auth).toBeNull();
  });

  it("starts with empty accounts array", () => {
    const { result } = renderHook(() => useMetaAuth());
    expect(result.current.accounts).toEqual([]);
  });

  it("starts with error=null", () => {
    const { result } = renderHook(() => useMetaAuth());
    expect(result.current.error).toBeNull();
  });

  it("exposes connect and disconnect functions", () => {
    const { result } = renderHook(() => useMetaAuth());
    expect(typeof result.current.connect).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
  });

  it("disabled is false when META_ENABLED is true", () => {
    const { result } = renderHook(() => useMetaAuth());
    expect(result.current.disabled).toBe(false);
  });

  it("loads auth from session storage when present and not expired", () => {
    const futureTime = Date.now() + 3600_000;
    mockSafeSessionStorage.getJSON.mockReturnValue({
      accessToken: "tok-123",
      userId: "me",
      expiresAt: futureTime,
    });

    const { result } = renderHook(() => useMetaAuth());
    expect(result.current.auth?.accessToken).toBe("tok-123");
  });

  it("ignores expired auth from session storage", () => {
    const pastTime = Date.now() - 1000;
    mockSafeSessionStorage.getJSON.mockReturnValue({
      accessToken: "old-tok",
      userId: "me",
      expiresAt: pastTime,
    });

    const { result } = renderHook(() => useMetaAuth());
    expect(result.current.auth).toBeNull();
  });

  it("exchanges token when parseTokenFromHash returns data", async () => {
    mockParseTokenFromHash.mockReturnValue({ access_token: "short-lived", expires_in: "3600" });
    mockExchangeForLongLivedToken.mockResolvedValue({
      access_token: "long-lived-tok",
      expires_in: 3600,
    });

    const { result } = renderHook(() => useMetaAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockExchangeForLongLivedToken).toHaveBeenCalledWith("short-lived");
    expect(result.current.auth?.accessToken).toBe("long-lived-tok");
  });

  it("sets error when token exchange fails", async () => {
    mockParseTokenFromHash.mockReturnValue({ access_token: "bad-token", expires_in: "3600" });
    mockExchangeForLongLivedToken.mockRejectedValue(new Error("Exchange failed"));

    const { result } = renderHook(() => useMetaAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
  });

  it("loads ad accounts when auth is set", async () => {
    const futureTime = Date.now() + 3600_000;
    mockSafeSessionStorage.getJSON.mockReturnValue({
      accessToken: "tok-123",
      userId: "me",
      expiresAt: futureTime,
    });
    mockGetAdAccounts.mockResolvedValue([
      { id: "act_123", name: "Test Account", currency: "ILS", account_status: 1 },
    ] as ReturnType<typeof mockGetAdAccounts> extends Promise<infer T> ? T : never);

    const { result } = renderHook(() => useMetaAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.accounts).toHaveLength(1);
  });

  it("disconnect clears auth and accounts", async () => {
    const futureTime = Date.now() + 3600_000;
    mockSafeSessionStorage.getJSON.mockReturnValue({
      accessToken: "tok-123",
      userId: "me",
      expiresAt: futureTime,
    });

    const { result } = renderHook(() => useMetaAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.auth).toBeNull();
    expect(result.current.accounts).toEqual([]);
    expect(mockSafeSessionStorage.remove).toHaveBeenCalledWith("meta_auth");
  });

  it("dispatching meta:reconnect-required event clears auth", async () => {
    const futureTime = Date.now() + 3600_000;
    mockSafeSessionStorage.getJSON.mockReturnValue({
      accessToken: "tok-123",
      userId: "me",
      expiresAt: futureTime,
    });

    const { result } = renderHook(() => useMetaAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      window.dispatchEvent(new CustomEvent("meta:reconnect-required"));
    });

    expect(result.current.auth).toBeNull();
    expect(result.current.error).not.toBeNull();
  });
});
