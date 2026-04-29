import { describe, it, expect, vi, beforeEach } from "vitest";

// ── External dep mocks ────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (url: string, init?: RequestInit) => fetch(url, init),
}));

vi.mock("../llmRouter", () => ({
  selectModel: vi.fn(() => ({
    model: "claude-haiku",
    maxTokens: 512,
    tier: "fast",
  })),
  trackUsage: vi.fn(),
  isOverMonthlyBudget: vi.fn(() => false),
  getMonthlyUsage: vi.fn(() => ({ totalCostNIS: 10 })),
  getMonthlyCap: vi.fn(() => 50),
  wouldExceedCostCap: vi.fn(() => false),
}));

vi.mock("@/engine/perplexityBurstiness", () => ({
  analyzeAIDetection: vi.fn(() => ({
    humanScore: 77,
    verdict: "likely-human",
    tips: [{ he: "טיפ", en: "tip" }],
  })),
}));

vi.mock("../cohortBenchmarks", () => ({
  buildCohortPromptSection: vi.fn(() => ""),
}));

vi.mock("@/engine/promptOptimizerLoop", () => ({
  getActivePromptPatches: vi.fn(() => []),
  buildPatchPromptSection: vi.fn(() => ""),
}));

vi.mock("@/hooks/useStylomeProfile", () => ({
  getStoredStylomePrompt: vi.fn(() => null),
}));

// ── Module under test ─────────────────────────────────────────────────────

import { generateCopy, ENGINE_MANIFEST } from "../aiCopyService";
import type { CopyGenerationRequest } from "../aiCopyService";
import {
  selectModel,
  trackUsage,
  isOverMonthlyBudget,
  getMonthlyUsage,
  getMonthlyCap,
} from "../llmRouter";
import { analyzeAIDetection } from "@/engine/perplexityBurstiness";

// Helper: set up a successful fetch mock
function mockFetch(body: Record<string, unknown>, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Internal Server Error",
    json: () => Promise.resolve(body),
  } as Response);
}

describe("aiCopyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── ENGINE_MANIFEST ─────────────────────────────────────────────────────

  describe("ENGINE_MANIFEST", () => {
    it("has required manifest fields", () => {
      expect(ENGINE_MANIFEST.name).toBe("aiCopyService");
      expect(ENGINE_MANIFEST.stage).toBe("design");
      expect(ENGINE_MANIFEST.isLive).toBe(true);
      expect(Array.isArray(ENGINE_MANIFEST.reads)).toBe(true);
      expect(Array.isArray(ENGINE_MANIFEST.writes)).toBe(true);
    });
  });

  // ── generateCopy — success path ──────────────────────────────────────────

  describe("generateCopy", () => {
    const baseRequest: CopyGenerationRequest = {
      task: "ad-copy",
      prompt: "Write a great ad",
      language: "en",
    };

    it("returns structured result on success", async () => {
      mockFetch({ text: "Hello World", tokensUsed: 100 });

      const result = await generateCopy(baseRequest);

      expect(result.text).toBe("Hello World");
      expect(result.model).toBe("claude-haiku");
      expect(result.humanScore).toBe(77);
      expect(result.humanVerdict).toBe("likely-human");
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.modelSelection).toBeDefined();
    });

    it("calls selectModel with the correct task", async () => {
      mockFetch({ text: "copy text", tokensUsed: 50 });

      await generateCopy({ ...baseRequest, task: "landing-page" });

      expect(selectModel).toHaveBeenCalledWith(
        expect.objectContaining({ task: "landing-page", textLength: "long" }),
        undefined,
      );
    });

    it("calls selectModel with long textLength for email-sequence", async () => {
      mockFetch({ text: "email text", tokensUsed: 50 });

      await generateCopy({ ...baseRequest, task: "email-sequence" });

      expect(selectModel).toHaveBeenCalledWith(
        expect.objectContaining({ textLength: "long" }),
        undefined,
      );
    });

    it("calls selectModel with medium textLength for ad-copy", async () => {
      mockFetch({ text: "ad text", tokensUsed: 20 });

      await generateCopy({ ...baseRequest, task: "ad-copy" });

      expect(selectModel).toHaveBeenCalledWith(
        expect.objectContaining({ textLength: "medium" }),
        undefined,
      );
    });

    it("calls analyzeAIDetection on the generated text", async () => {
      mockFetch({ text: "generated content", tokensUsed: 10 });

      await generateCopy(baseRequest);

      expect(analyzeAIDetection).toHaveBeenCalledWith("generated content");
    });

    it("calls trackUsage after generation", async () => {
      mockFetch({ text: "content", tokensUsed: 123 });

      await generateCopy(baseRequest);

      expect(trackUsage).toHaveBeenCalledWith(
        expect.objectContaining({ task: "ad-copy", model: "claude-haiku", tokensUsed: 123 }),
      );
    });

    it("throws when fetch response is not ok", async () => {
      mockFetch({ error: "server error" }, false, 500);

      await expect(generateCopy(baseRequest)).rejects.toThrow("AI copy generation failed");
    });

    it("throws when over monthly budget", async () => {
      vi.mocked(isOverMonthlyBudget).mockReturnValue(true);
      vi.mocked(getMonthlyUsage).mockReturnValue({ totalCostNIS: 55 } as ReturnType<typeof getMonthlyUsage>);
      vi.mocked(getMonthlyCap).mockReturnValue(50);

      await expect(generateCopy(baseRequest, "starter")).rejects.toThrow(
        "Monthly AI budget reached",
      );
    });

    it("does not call fetch when over budget", async () => {
      vi.mocked(isOverMonthlyBudget).mockReturnValue(true);
      vi.mocked(getMonthlyUsage).mockReturnValue({ totalCostNIS: 55 } as ReturnType<typeof getMonthlyUsage>);
      vi.mocked(getMonthlyCap).mockReturnValue(50);
      global.fetch = vi.fn();

      await generateCopy(baseRequest, "starter").catch(() => {});
      expect(fetch).not.toHaveBeenCalled();
    });

    it("handles missing text gracefully (defaults to empty string)", async () => {
      mockFetch({ tokensUsed: 0 }); // no text field

      const result = await generateCopy(baseRequest);
      expect(result.text).toBe("");
    });

    it("passes qualityPriority to selectModel", async () => {
      mockFetch({ text: "t", tokensUsed: 5 });

      await generateCopy({ ...baseRequest, qualityPriority: "quality" });

      expect(selectModel).toHaveBeenCalledWith(
        expect.objectContaining({ qualityPriority: "quality" }),
        undefined,
      );
    });

    it("passes regime to selectModel when provided", async () => {
      mockFetch({ text: "t", tokensUsed: 5 });

      await generateCopy({ ...baseRequest, regime: "crisis" as never });

      expect(selectModel).toHaveBeenCalledWith(
        expect.objectContaining({ regime: "crisis" }),
        undefined,
      );
    });

    it("builds Hebrew system prompt when language is he", async () => {
      mockFetch({ text: "t", tokensUsed: 5 });

      // Just confirm it doesn't throw when language=he
      await expect(
        generateCopy({ ...baseRequest, language: "he" }),
      ).resolves.toBeDefined();
    });

    it("includes business context in system prompt when formData provided", async () => {
      mockFetch({ text: "copy", tokensUsed: 5 });

      await generateCopy({
        ...baseRequest,
        formData: {
          businessField: "tech",
          productDescription: "A SaaS tool",
          averagePrice: 99,
          audienceType: "b2b",
          mainGoal: "leads",
        } as never,
      });

      // The POST body should include systemPrompt containing business context
      const callBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      ) as { systemPrompt: string };
      expect(callBody.systemPrompt).toContain("tech");
    });
  });
});
