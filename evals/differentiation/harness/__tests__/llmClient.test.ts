import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { callLLM, parseStrictJSON, resolveMode } from "../llmClient";

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
const ORIGINAL_MODE = process.env.HARNESS_MODE;

describe("llmClient — mode resolution", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.HARNESS_MODE;
  });
  afterEach(() => {
    if (ORIGINAL_KEY) process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY; else delete process.env.ANTHROPIC_API_KEY;
    if (ORIGINAL_MODE) process.env.HARNESS_MODE = ORIGINAL_MODE; else delete process.env.HARNESS_MODE;
  });

  it("defaults to mock when no API key", () => {
    expect(resolveMode()).toBe("mock");
  });

  it("uses live when API key present", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    expect(resolveMode()).toBe("live");
  });

  it("forces mock via HARNESS_MODE=mock even with key", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.HARNESS_MODE = "mock";
    expect(resolveMode()).toBe("mock");
  });
});

describe("llmClient — mock outputs return parseable JSON for each promptKind", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.HARNESS_MODE = "mock";
  });
  afterEach(() => {
    if (ORIGINAL_KEY) process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY; else delete process.env.ANTHROPIC_API_KEY;
    if (ORIGINAL_MODE) process.env.HARNESS_MODE = ORIGINAL_MODE; else delete process.env.HARNESS_MODE;
  });

  const kinds = ["critic", "usability", "ownership", "comparison", "premortem", "oneLiner"] as const;
  for (const kind of kinds) {
    it(`mock returns valid JSON for ${kind}`, async () => {
      const out = await callLLM({
        prompt: "irrelevant",
        promptKind: kind,
        seed: `test-${kind}`,
      });
      expect(() => parseStrictJSON(out)).not.toThrow();
    });
  }

  it("chatgptBaseline returns plain text (not JSON)", async () => {
    const out = await callLLM({
      prompt: "irrelevant",
      promptKind: "chatgptBaseline",
      seed: "test-baseline",
    });
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("parseStrictJSON", () => {
  it("parses clean JSON", () => {
    expect(parseStrictJSON<{ a: number }>(`{"a":1}`)).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    expect(parseStrictJSON<{ a: number }>("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("strips surrounding prose", () => {
    expect(parseStrictJSON<{ a: number }>("Here is the result: {\"a\":1} hope this helps.")).toEqual({ a: 1 });
  });
});
