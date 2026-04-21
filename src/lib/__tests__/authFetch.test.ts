import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
}));

import { authFetch } from "../authFetch";

function mockResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "token-abc" } } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("injects Authorization header when session exists", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse(200, { ok: true }));

    await authFetch("https://example.com/api", { method: "POST" });

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-abc");
  });

  it("does not inject Authorization when no session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse(200));

    await authFetch("https://example.com/api");

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it("retries once on 503 and returns success on second attempt", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const promise = authFetch("https://example.com/api");
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("does NOT retry on 401", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: "Unauthorized" }));

    const res = await authFetch("https://example.com/api");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(401);
  });

  it("does NOT retry on 400", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse(400, { error: "Bad request" }));

    const res = await authFetch("https://example.com/api");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(400);
  });

  it("gives up after max retries and returns the last 5xx response", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(502))
      .mockResolvedValueOnce(mockResponse(500, { error: "final" }));

    const promise = authFetch("https://example.com/api");
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(500);
  });

  it("retries on network throw and rethrows when exhausted", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const promise = authFetch("https://example.com/api");
    // Attach a catch handler BEFORE advancing timers to avoid the unhandled rejection warning.
    const assertion = expect(promise).rejects.toThrow("Failed to fetch");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
