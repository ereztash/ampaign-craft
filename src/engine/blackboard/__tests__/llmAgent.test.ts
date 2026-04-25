import { describe, it, expect, vi, beforeEach } from "vitest";
import { getModelForTier, parseLLMJson, createLLMAgent } from "../llmAgent";

vi.mock("@/services/llmRouter", () => ({
  selectModel: vi.fn(() => "claude-sonnet-4-6"),
  trackUsage: vi.fn(),
  calculateCostNIS: vi.fn(() => 0),
}));
vi.mock("../ontologicalVerifier", () => ({
  verifyWrite: vi.fn(() => ({ ok: true })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// ── getModelForTier ───────────────────────────────────────────────────────────

describe("getModelForTier", () => {
  it("fast → claude-haiku-4-5-20251001", () => {
    expect(getModelForTier("fast")).toBe("claude-haiku-4-5-20251001");
  });

  it("standard → claude-sonnet-4-6", () => {
    expect(getModelForTier("standard")).toBe("claude-sonnet-4-6");
  });

  it("deep → claude-opus-4-6", () => {
    expect(getModelForTier("deep")).toBe("claude-opus-4-6");
  });
});

// ── parseLLMJson ──────────────────────────────────────────────────────────────

describe("parseLLMJson", () => {
  it("parses clean JSON object", () => {
    expect(parseLLMJson('{"score":90}')).toEqual({ score: 90 });
  });

  it("parses JSON array", () => {
    expect(parseLLMJson("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("extracts JSON from ```json fence", () => {
    const raw = "```json\n{\"key\":\"val\"}\n```";
    expect(parseLLMJson(raw)).toEqual({ key: "val" });
  });

  it("extracts JSON from ``` fence without language tag", () => {
    const raw = "```\n{\"x\":1}\n```";
    expect(parseLLMJson(raw)).toEqual({ x: 1 });
  });

  it("extracts first JSON object from prose text", () => {
    const raw = 'Here is the answer: {"result":"ok"} — done.';
    expect(parseLLMJson(raw)).toEqual({ result: "ok" });
  });

  it("extracts first JSON array from prose text", () => {
    const raw = 'Output: [1, 2, 3] as requested.';
    expect(parseLLMJson(raw)).toEqual([1, 2, 3]);
  });

  it("throws descriptive error when no JSON found", () => {
    expect(() => parseLLMJson("Sorry, I cannot help.")).toThrow(/parseLLMJson/);
  });

  it("parses nested objects", () => {
    const raw = '{"a":{"b":{"c":42}}}';
    expect(parseLLMJson(raw)).toEqual({ a: { b: { c: 42 } } });
  });
});

// ── createLLMAgent ────────────────────────────────────────────────────────────

describe("createLLMAgent", () => {
  const baseConfig = {
    name: "test-llm-agent",
    dependencies: [] as string[],
    writes: ["discProfile"] as any,
    systemPrompt: "You are a test agent.",
    userPrompt: vi.fn(() => "Analyze this."),
    outputParser: vi.fn((raw: string) => JSON.parse(raw)),
    modelTier: "standard" as const,
  };

  it("creates agent with correct name and dependencies", () => {
    const agent = createLLMAgent(baseConfig);
    expect(agent.name).toBe("test-llm-agent");
    expect(agent.dependencies).toEqual([]);
    expect(agent.writes).toContain("discProfile");
  });

  it("sets timeout to 55000ms", () => {
    const agent = createLLMAgent(baseConfig);
    expect(agent.timeout).toBe(55_000);
  });

  it("sets maxRetries to 1", () => {
    const agent = createLLMAgent(baseConfig);
    expect(agent.maxRetries).toBe(1);
  });

  it("sets modelTier from config", () => {
    const agent = createLLMAgent({ ...baseConfig, modelTier: "deep" });
    expect(agent.modelTier).toBe("deep");
  });

  describe("run()", () => {
    let board: any;

    beforeEach(() => {
      board = {
        verifiedSet: vi.fn(),
        getState: vi.fn(() => ({})),
      };
      vi.stubGlobal("fetch", vi.fn());
    });

    it("calls fetch with correct endpoint and model", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ text: '{"primary":"D"}' }),
      };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const agent = createLLMAgent(baseConfig);
      await agent.run(board);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/agent-executor"),
        expect.objectContaining({ method: "POST" }),
      );
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.model).toBe("claude-sonnet-4-6");
    });

    it("calls outputParser with the LLM response text", async () => {
      const parser = vi.fn((raw: string) => JSON.parse(raw));
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: '{"primary":"D"}' }),
      });

      const agent = createLLMAgent({ ...baseConfig, outputParser: parser });
      await agent.run(board);

      expect(parser).toHaveBeenCalledWith('{"primary":"D"}');
    });

    it("calls board.verifiedSet for each write section", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: '{"primary":"D"}' }),
      });

      const agent = createLLMAgent(baseConfig);
      await agent.run(board);

      expect(board.verifiedSet).toHaveBeenCalledWith(
        "discProfile",
        expect.anything(),
        expect.objectContaining({ agentName: "test-llm-agent" }),
      );
    });

    it("throws when API returns non-ok response", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
        json: vi.fn().mockResolvedValue({ error: "LLM failure" }),
      });

      const agent = createLLMAgent(baseConfig);
      await expect(agent.run(board)).rejects.toThrow(/test-llm-agent.*failed/);
    });

    it("throws when API returns empty text", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: "" }),
      });

      const agent = createLLMAgent(baseConfig);
      await expect(agent.run(board)).rejects.toThrow(/empty response/);
    });

    it("appends fast-tier JSON enforcement to system prompt for 'fast' tier", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: '{"primary":"D"}' }),
      });

      const agent = createLLMAgent({ ...baseConfig, modelTier: "fast" });
      await agent.run(board);

      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.systemPrompt).toMatch(/STRICT OUTPUT CONTRACT/);
    });

    it("does NOT append JSON enforcement for 'standard' tier", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: '{"primary":"D"}' }),
      });

      const agent = createLLMAgent({ ...baseConfig, modelTier: "standard" });
      await agent.run(board);

      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.systemPrompt).not.toMatch(/STRICT OUTPUT CONTRACT/);
    });

    it("supports systemPrompt as a function", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ text: '{"primary":"D"}' }),
      });

      const systemPromptFn = vi.fn(() => "dynamic prompt");
      const agent = createLLMAgent({ ...baseConfig, systemPrompt: systemPromptFn });
      await agent.run(board);

      expect(systemPromptFn).toHaveBeenCalledWith(board);
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.systemPrompt).toBe("dynamic prompt");
    });
  });
});
