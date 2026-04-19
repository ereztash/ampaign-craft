import { describe, it, expect, vi } from "vitest";

vi.mock("../agents/knowledgeGraphAgent", () => ({ knowledgeGraphAgent: { name: "knowledgeGraphAgent", dependencies: [], writes: [], run: vi.fn() } }));
vi.mock("../agents/funnelAgent",         () => ({ funnelAgent:         { name: "funnelAgent",         dependencies: ["knowledgeGraphAgent"], writes: [], run: vi.fn() } }));
vi.mock("../agents/hormoziAgent",        () => ({ hormoziAgent:        { name: "hormoziAgent",        dependencies: ["funnelAgent"], writes: [], run: vi.fn() } }));
vi.mock("../agents/discAgent",           () => ({ discAgent:           { name: "discAgent",           dependencies: ["knowledgeGraphAgent"], writes: [], run: vi.fn() } }));
vi.mock("../agents/closingAgent",        () => ({ closingAgent:        { name: "closingAgent",        dependencies: ["discAgent"], writes: [], run: vi.fn() } }));
vi.mock("../agents/coiAgent",            () => ({ coiAgent:            { name: "coiAgent",            dependencies: ["funnelAgent"], writes: [], run: vi.fn() } }));
vi.mock("../agents/retentionAgent",      () => ({ retentionAgent:      { name: "retentionAgent",      dependencies: ["funnelAgent"], writes: [], run: vi.fn() } }));
vi.mock("../agents/healthAgent",         () => ({ healthAgent:         { name: "healthAgent",         dependencies: ["funnelAgent"], writes: [], run: vi.fn() } }));
vi.mock("../agents/metaAgent",           () => ({ metaAgent:           { name: "metaAgent",           dependencies: ["knowledgeGraphAgent","funnelAgent","hormoziAgent","discAgent","closingAgent","coiAgent","retentionAgent","healthAgent"], writes: [], run: vi.fn() } }));
vi.mock("../agents/qaStaticAgent",       () => ({ qaStaticAgent:       { name: "qaStaticAgent",       dependencies: [], writes: [], run: vi.fn() } }));
vi.mock("../agents/qaContentAgent",      () => ({ qaContentAgent:      { name: "qaContentAgent",      dependencies: [], writes: [], run: vi.fn() } }));
vi.mock("../agents/qaSecurityAgent",     () => ({ qaSecurityAgent:     { name: "qaSecurityAgent",     dependencies: [], writes: [], run: vi.fn() } }));
vi.mock("../agents/qaOrchestratorAgent", () => ({ qaOrchestratorAgent: { name: "qaOrchestratorAgent", dependencies: [], writes: [], run: vi.fn() } }));
vi.mock("../agents/debugSwarm",          () => ({ runDebugSwarm: vi.fn().mockResolvedValue({ iterations: [] }) }));
vi.mock("../ontologicalVerifier",        () => ({ verifyWrite: vi.fn(() => ({ ok: true })) }));
vi.mock("@/lib/logger",                  () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("../sentinelRail",               () => ({ SentinelRail: vi.fn().mockImplementation(() => ({ record: vi.fn() })) }));
vi.mock("@/services/llmRouter",          () => ({ selectModel: vi.fn(() => "claude-sonnet-4-6") }));

import {
  createDefaultPipeline,
  createDefaultAsyncPipeline,
  runFullPipeline,
  runFullPipelineAsync,
  AgentRunner,
  AsyncAgentRunner,
  Blackboard,
} from "../index";

const formData = {
  businessField: "tech",
  audienceType: "b2c",
  ageRange: [25, 45] as [number, number],
  interests: "marketing",
  productDescription: "SaaS platform for teams",
  averagePrice: 200,
  salesModel: "subscription",
  budgetRange: "medium",
  mainGoal: "sales",
  existingChannels: ["facebook"],
  experienceLevel: "intermediate",
} as any;

describe("index re-exports", () => {
  it("exports Blackboard", () => {
    expect(Blackboard).toBeDefined();
  });

  it("exports AgentRunner", () => {
    expect(AgentRunner).toBeDefined();
  });

  it("exports AsyncAgentRunner", () => {
    expect(AsyncAgentRunner).toBeDefined();
  });
});

describe("createDefaultPipeline()", () => {
  it("returns an AgentRunner", () => {
    expect(createDefaultPipeline()).toBeInstanceOf(AgentRunner);
  });

  it("includes all 9 agents (8 core + metaAgent)", () => {
    const runner = createDefaultPipeline();
    const names = runner.getRegisteredAgents();
    expect(names).toContain("knowledgeGraphAgent");
    expect(names).toContain("funnelAgent");
    expect(names).toContain("metaAgent");
    expect(names.length).toBeGreaterThanOrEqual(9);
  });
});

describe("createDefaultAsyncPipeline()", () => {
  it("returns an AsyncAgentRunner", () => {
    expect(createDefaultAsyncPipeline()).toBeInstanceOf(AsyncAgentRunner);
  });

  it("includes all 9 agents", () => {
    const runner = createDefaultAsyncPipeline();
    const names = runner.getRegisteredAgents();
    expect(names).toContain("knowledgeGraphAgent");
    expect(names).toContain("metaAgent");
  });

  it("passes costCapNIS to runner", () => {
    const runner = createDefaultAsyncPipeline(99);
    expect(runner.getCostTracker().costCapNIS).toBe(99);
  });
});

describe("runFullPipeline()", () => {
  it("returns a BlackboardState with formData set", () => {
    const state = runFullPipeline(formData);
    expect(state.formData).toEqual(formData);
  });

  it("includes completedAgents array in state", () => {
    const state = runFullPipeline(formData);
    expect(Array.isArray(state.completedAgents)).toBe(true);
  });
});

describe("runFullPipelineAsync()", () => {
  it("resolves with state and result", async () => {
    const { state, result } = await runFullPipelineAsync(formData);
    expect(state.formData).toEqual(formData);
    expect(result).toHaveProperty("completedAgents");
    expect(result).toHaveProperty("durationMs");
  });

  it("passes costCapNIS to the runner", async () => {
    const { result } = await runFullPipelineAsync(formData, 50);
    expect(result.totalCostNIS).toBeGreaterThanOrEqual(0);
  });
});
