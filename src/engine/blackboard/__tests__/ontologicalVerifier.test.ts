import { describe, it, expect } from "vitest";
import { verifyWrite } from "../ontologicalVerifier";

const ctx = (section: string, incoming: unknown, current: unknown) => ({
  section: section as any,
  incoming,
  current,
  agentName: "test-agent",
});

describe("verifyWrite", () => {
  it("approves a valid first write (null → object)", () => {
    const result = verifyWrite(ctx("funnelResult", { some: "data" }, null));
    expect(result.ok).toBe(true);
  });

  it("approves overwriting with a different object", () => {
    const result = verifyWrite(ctx("discProfile", { primary: "D" }, { primary: "C" }));
    expect(result.ok).toBe(true);
  });

  it("approves null → null (no-op, not information destruction)", () => {
    const result = verifyWrite(ctx("knowledgeGraph", null, null));
    expect(result.ok).toBe(true);
  });

  it("rejects write to restricted section 'completedAgents'", () => {
    const result = verifyWrite(ctx("completedAgents", ["agent-a"], []));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/restricted_section/);
  });

  it("rejects write to restricted section 'errors'", () => {
    const result = verifyWrite(ctx("errors", [], []));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/restricted_section/);
  });

  it("rejects null overwrite of existing value (null_payload)", () => {
    const result = verifyWrite(ctx("funnelResult", null, { some: "data" }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/null_payload/);
  });

  it("rejects empty object (zero information content)", () => {
    const result = verifyWrite(ctx("discProfile", {}, null));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/empty_object/);
  });

  it("rejects primitive identity write (same string)", () => {
    const result = verifyWrite(ctx("formData", "same" as any, "same" as any));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/identity_write/);
  });

  it("approves changing a primitive value", () => {
    const result = verifyWrite(ctx("formData", "new" as any, "old" as any));
    expect(result.ok).toBe(true);
  });

  it("does NOT reject empty array (arrays are not objects for the empty-object rule)", () => {
    const result = verifyWrite(ctx("researchSession", [] as any, null));
    expect(result.ok).toBe(true);
  });
});
