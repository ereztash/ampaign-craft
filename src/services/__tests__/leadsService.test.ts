import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/integrations/supabase/loose", () => ({
  supabaseLoose: { from: (...args: unknown[]) => fromMock(...args) },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  countLeads,
  addInteraction,
  getCachedRecommendations,
  upsertCachedRecommendations,
} from "../leadsService";

const sampleRow = {
  id: "lead-1",
  user_id: "user-1",
  name: "Test Lead",
  phone: "050-000-0000",
  email: "lead@x.com",
  business: "Acme",
  status: "lead",
  notes: "",
  value_nis: 1500,
  next_followup: null,
  source: "facebook",
  why_us: "fast",
  lost_reason: "",
  closed_at: null,
  plan_id: null,
  created_at: "2026-04-25T12:00:00Z",
  updated_at: "2026-04-25T12:00:00Z",
};

beforeEach(() => {
  fromMock.mockReset();
});

describe("leadsService", () => {
  it("listLeads returns mapped rows on success", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [sampleRow], error: null }),
        }),
      }),
    });
    const result = await listLeads("user-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "lead-1", name: "Test Lead", valueNIS: 1500, whyUs: "fast",
    });
  });

  it("listLeads returns empty array on error", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: null, error: { message: "rls" } }),
        }),
      }),
    });
    const result = await listLeads("user-1");
    expect(result).toEqual([]);
  });

  it("createLead returns mapped row when insert succeeds", async () => {
    fromMock.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleRow, error: null }),
        }),
      }),
    });
    const created = await createLead("user-1", {
      name: "Test", phone: "", email: "", business: "",
      status: "lead", notes: "", valueNIS: 1500,
      nextFollowup: null, source: "fb", whyUs: "fast", lostReason: "",
    });
    expect(created?.id).toBe("lead-1");
  });

  it("createLead returns null on error", async () => {
    fromMock.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { message: "rls" } }),
        }),
      }),
    });
    const created = await createLead("user-1", {
      name: "Test", phone: "", email: "", business: "",
      status: "lead", notes: "", valueNIS: 0,
      nextFollowup: null, source: "", whyUs: "", lostReason: "",
    });
    expect(created).toBeNull();
  });

  it("updateLead returns mapped row on success", async () => {
    fromMock.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { ...sampleRow, status: "closed" }, error: null }),
          }),
        }),
      }),
    });
    const updated = await updateLead("lead-1", { status: "closed" });
    expect(updated?.status).toBe("closed");
  });

  it("deleteLead returns true on success", async () => {
    fromMock.mockReturnValue({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    });
    expect(await deleteLead("lead-1")).toBe(true);
  });

  it("deleteLead returns false on error", async () => {
    fromMock.mockReturnValue({
      delete: () => ({
        eq: () => Promise.resolve({ error: { message: "rls" } }),
      }),
    });
    expect(await deleteLead("lead-1")).toBe(false);
  });

  it("countLeads returns count from head query", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => Promise.resolve({ count: 7, error: null }),
      }),
    });
    expect(await countLeads("user-1")).toBe(7);
  });

  it("addInteraction returns mapped row on success", async () => {
    const interactionRow = {
      id: "int-1", lead_id: "lead-1", user_id: "user-1",
      type: "note", note: "Called", occurred_at: "2026-04-25T12:00:00Z",
    };
    fromMock.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: interactionRow, error: null }),
        }),
      }),
    });
    const result = await addInteraction("user-1", "lead-1", "note", "Called");
    expect(result?.note).toBe("Called");
  });

  it("getCachedRecommendations returns null on miss", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });
    expect(await getCachedRecommendations("lead-1")).toBeNull();
  });

  it("upsertCachedRecommendations returns true on success", async () => {
    fromMock.mockReturnValue({
      upsert: () => Promise.resolve({ error: null }),
    });
    expect(await upsertCachedRecommendations("user-1", "lead-1", [{ a: 1 }])).toBe(true);
  });
});
