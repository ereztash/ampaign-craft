import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase loose mock ───────────────────────────────────────────────────

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/loose", () => ({
  supabaseLoose: {
    rpc: mockRpc,
  },
}));

// ── Module under test ─────────────────────────────────────────────────────

import {
  extractEmbeddableContent,
  embedPlanContent,
  searchSimilarContent,
} from "../semanticSearch";
import type { FunnelResult } from "@/types/funnel";

// Build a minimal FunnelResult stub
function makeFunnelResult(overrides: Partial<FunnelResult> = {}): FunnelResult {
  return {
    id: "plan-1",
    funnelName: { he: "משפך בדיקה", en: "Test Funnel" },
    stages: [],
    hookTips: [],
    overallTips: [],
    copyLab: { formulas: [] },
    hormoziValue: null,
    ...overrides,
  } as unknown as FunnelResult;
}

describe("semanticSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── extractEmbeddableContent ──────────────────────────────────────────

  describe("extractEmbeddableContent", () => {
    it("includes funnel name item when funnelName.he is present", () => {
      const result = makeFunnelResult();
      const items = extractEmbeddableContent(result);
      const nameItem = items.find((i) => i.contentType === "funnel_name");
      expect(nameItem).toBeDefined();
      expect(nameItem!.text).toContain("משפך בדיקה");
      expect(nameItem!.text).toContain("Test Funnel");
    });

    it("returns empty array when funnelName.he is missing", () => {
      const result = makeFunnelResult({ funnelName: { he: "", en: "Test" } });
      const items = extractEmbeddableContent(result);
      expect(items.find((i) => i.contentType === "funnel_name")).toBeUndefined();
    });

    it("includes stage items for each stage", () => {
      const result = makeFunnelResult({
        stages: [
          {
            name: { he: "שלב 1", en: "Stage 1" },
            description: { he: "תיאור", en: "Desc" },
            budgetPercent: 30,
            channels: [{ name: { he: "פייסבוק", en: "Facebook" }, channel: "facebook" }],
          },
        ] as never,
      });

      const items = extractEmbeddableContent(result);
      const stageItems = items.filter((i) => i.contentType === "funnel_stage");
      expect(stageItems).toHaveLength(1);
      expect(stageItems[0].text).toContain("Stage 1");
      expect(stageItems[0].text).toContain("30%");
    });

    it("includes hook items when hookTips have example.he", () => {
      const result = makeFunnelResult({
        hookTips: [
          {
            law: "loss_aversion",
            lawName: { he: "שנאת הפסד", en: "Loss Aversion" },
            example: { he: "דוגמה בעברית", en: "Example" },
          },
        ] as never,
      });

      const items = extractEmbeddableContent(result);
      const hookItems = items.filter((i) => i.contentType === "hook");
      expect(hookItems).toHaveLength(1);
      expect(hookItems[0].text).toContain("שנאת הפסד");
    });

    it("does not include hook items when example.he is missing", () => {
      const result = makeFunnelResult({
        hookTips: [
          {
            law: "x",
            lawName: { he: "y", en: "z" },
            example: { he: "", en: "eng only" },
          },
        ] as never,
      });

      const items = extractEmbeddableContent(result);
      expect(items.filter((i) => i.contentType === "hook")).toHaveLength(0);
    });

    it("includes copy formula items when formula.example.he is present", () => {
      const result = makeFunnelResult({
        copyLab: {
          formulas: [
            {
              name: { he: "AIDA", en: "AIDA" },
              example: { he: "שים לב…", en: "Attention…" },
            },
          ],
        } as never,
      });

      const items = extractEmbeddableContent(result);
      const formulaItems = items.filter((i) => i.contentType === "copy_formula");
      expect(formulaItems).toHaveLength(1);
      expect(formulaItems[0].text).toContain("AIDA");
    });

    it("includes tip items for overallTips with he text", () => {
      const result = makeFunnelResult({
        overallTips: [
          { he: "טיפ ראשון", en: "First tip" },
          { he: "", en: "No Hebrew" },
        ] as never,
      });

      const items = extractEmbeddableContent(result);
      const tipItems = items.filter((i) => i.contentType === "tip");
      expect(tipItems).toHaveLength(1);
      expect(tipItems[0].text).toBe("טיפ ראשון");
    });

    it("includes plan id in funnel_name metadata", () => {
      const result = makeFunnelResult({ id: "plan-xyz" });
      const items = extractEmbeddableContent(result);
      const nameItem = items.find((i) => i.contentType === "funnel_name");
      expect(nameItem!.metadata?.planId).toBe("plan-xyz");
    });
  });

  // ── embedPlanContent ──────────────────────────────────────────────────

  describe("embedPlanContent", () => {
    it("returns embedded=0 when there are no embeddable items", async () => {
      const result = makeFunnelResult({ funnelName: { he: "", en: "" } });
      const out = await embedPlanContent(result, "user-1");
      expect(out.embedded).toBe(0);
      expect(out.error).toBeUndefined();
    });

    it("calls fetch and returns embedded count on success", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedded: 3 }),
      } as Response);

      const result = makeFunnelResult();
      const out = await embedPlanContent(result, "user-1", "plan-99");
      expect(out.embedded).toBe(3);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/growth/embed-content",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("returns error when fetch fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Service Unavailable",
        json: () => Promise.resolve({ error: "embed error" }),
      } as Response);

      const result = makeFunnelResult();
      const out = await embedPlanContent(result, "user-1");
      expect(out.embedded).toBe(0);
      expect(out.error).toBe("embed error");
    });

    it("uses result.id as planId when planId param is omitted", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedded: 1 }),
      } as Response);

      const result = makeFunnelResult({ id: "plan-abc" });
      await embedPlanContent(result, "user-1");

      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      ) as { planId: string };
      expect(body.planId).toBe("plan-abc");
    });
  });

  // ── searchSimilarContent ──────────────────────────────────────────────

  describe("searchSimilarContent", () => {
    it("returns results when both fetch and rpc succeed", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] }),
      } as Response);

      mockRpc.mockResolvedValue({
        data: [
          {
            id: "r-1",
            plan_id: "p-1",
            content_type: "funnel_name",
            content_text: "test text",
            metadata: {},
            similarity: 0.92,
          },
        ],
        error: null,
      });

      const out = await searchSimilarContent("test query", "user-1");
      expect(out.results).toHaveLength(1);
      expect(out.results[0].similarity).toBe(0.92);
      expect(out.results[0].contentType).toBe("funnel_name");
    });

    it("returns error when embed fetch fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Error",
        json: () => Promise.resolve({ error: "embed failed" }),
      } as Response);

      const out = await searchSimilarContent("query", "user-1");
      expect(out.results).toHaveLength(0);
      expect(out.error).toBe("embed failed");
    });

    it("returns error when rpc fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedding: [0.1] }),
      } as Response);

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "rpc error" },
      });

      const out = await searchSimilarContent("query", "user-1");
      expect(out.results).toHaveLength(0);
      expect(out.error).toBe("rpc error");
    });

    it("calls rpc with default threshold and limit", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedding: [0.1] }),
      } as Response);

      mockRpc.mockResolvedValue({ data: [], error: null });

      await searchSimilarContent("query", "user-1");

      expect(mockRpc).toHaveBeenCalledWith("match_content", expect.objectContaining({
        match_threshold: 0.7,
        match_count: 10,
        filter_type: null,
      }));
    });

    it("passes contentType filter to rpc", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedding: [0.1] }),
      } as Response);

      mockRpc.mockResolvedValue({ data: [], error: null });

      await searchSimilarContent("query", "user-1", { contentType: "hook", threshold: 0.8, limit: 5 });

      expect(mockRpc).toHaveBeenCalledWith("match_content", expect.objectContaining({
        match_threshold: 0.8,
        match_count: 5,
        filter_type: "hook",
      }));
    });
  });
});
