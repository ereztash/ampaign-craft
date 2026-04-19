import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures these refs are available inside vi.mock factories
const { mockMaybeSingle, mockFrom } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockEq3 = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockEq2 = vi.fn(() => ({ eq: mockEq3, maybeSingle: mockMaybeSingle }));
  const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
  const mockSelect = vi.fn(() => ({ eq: mockEq1 }));
  const mockInsertMaybeSingle = vi.fn();
  const mockInsertSelect = vi.fn(() => ({ maybeSingle: mockInsertMaybeSingle }));
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));
  const mockUpdateEq3 = vi.fn().mockResolvedValue({ error: null });
  const mockUpdateEq2 = vi.fn(() => ({ eq: mockUpdateEq3 }));
  const mockUpdateEq1 = vi.fn(() => ({ eq: mockUpdateEq2 }));
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq1 }));
  const mockFrom = vi.fn(() => ({ select: mockSelect, insert: mockInsert, update: mockUpdate }));
  return { mockMaybeSingle, mockFrom };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { readContext, writeContext, conceptKey } from "../contract";

const KEY = "BUSINESS-dna-acme" as const;

// ─────────────────────────────────────────────────────────────────────────────

describe("conceptKey()", () => {
  it("formats scope-type-id correctly", () => {
    expect(conceptKey("BUSINESS", "dna", "acme")).toBe("BUSINESS-dna-acme");
    expect(conceptKey("USER", "profile", "u1")).toBe("USER-profile-u1");
    expect(conceptKey("CAMPAIGN", "meta", "c99")).toBe("CAMPAIGN-meta-c99");
  });
});

describe("readContext()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns row data when supabase resolves successfully", async () => {
    const row = { id: "1", concept_key: KEY, payload: {} };
    mockMaybeSingle.mockResolvedValue({ data: row, error: null });
    expect(await readContext("user-1", "plan-1", KEY)).toEqual(row);
  });

  it("returns null when supabase returns error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });
    expect(await readContext("user-1", "plan-1", KEY)).toBeNull();
  });

  it("returns null when row not found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await readContext("user-1", "plan-1", KEY)).toBeNull();
  });

  it("returns null and does not throw when supabase throws", async () => {
    mockMaybeSingle.mockRejectedValue(new Error("network"));
    await expect(readContext("user-1", "plan-1", KEY)).resolves.toBeNull();
  });
});

describe("writeContext()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("silently returns when userId is empty", async () => {
    await writeContext({ userId: "", planId: null, key: KEY, stage: "discover", payload: {}, writtenBy: "engine" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("calls insert when row does not exist", async () => {
    // First call = readContext (no row); second = insert
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "new" }, error: null });
    await writeContext({ userId: "u1", planId: "p1", key: KEY, stage: "discover", payload: { x: 1 }, writtenBy: "engine" });
    expect(mockFrom).toHaveBeenCalled();
  });

  it("does not throw when supabase throws internally", async () => {
    mockMaybeSingle.mockRejectedValue(new Error("timeout"));
    await expect(
      writeContext({ userId: "u1", planId: "p1", key: KEY, stage: "discover", payload: {}, writtenBy: "engine" })
    ).resolves.toBeUndefined();
  });
});
