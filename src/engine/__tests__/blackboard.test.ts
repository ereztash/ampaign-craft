import { describe, it, expect } from "vitest";
import {
  Blackboard,
  AgentRunner,
  createDefaultPipeline,
  runFullPipeline,
  knowledgeGraphAgent,
  funnelAgent,
  hormoziAgent,
  discAgent,
  closingAgent,
  coiAgent,
  retentionAgent,
  healthAgent,
} from "../blackboard";
import { FormData } from "@/types/funnel";
import { generateFunnel } from "../funnelEngine";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("Blackboard Architecture", () => {
  // ═══════════════════════════════════════════════
  // BLACKBOARD STORE
  // ═══════════════════════════════════════════════

  describe("Blackboard Store", () => {
    it("initializes with empty state", () => {
      const board = new Blackboard();
      expect(board.get("formData")).toBeNull();
      expect(board.get("funnelResult")).toBeNull();
      expect(board.getState().completedAgents).toEqual([]);
    });

    it("sets and gets values", () => {
      const board = new Blackboard();
      const fd = makeFormData();
      board.set("formData", fd);
      expect(board.get("formData")).toEqual(fd);
    });

    it("notifies listeners on update", () => {
      const board = new Blackboard();
      const updates: string[] = [];
      board.onUpdate((section) => updates.push(section));
      board.set("formData", makeFormData());
      expect(updates).toContain("formData");
    });

    it("unsubscribe stops notifications", () => {
      const board = new Blackboard();
      const updates: string[] = [];
      const unsub = board.onUpdate((section) => updates.push(section));
      unsub();
      board.set("formData", makeFormData());
      expect(updates).toEqual([]);
    });

    it("tracks completed agents", () => {
      const board = new Blackboard();
      board.markAgentComplete("test-agent");
      expect(board.getState().completedAgents).toContain("test-agent");
    });

    it("records errors", () => {
      const board = new Blackboard();
      board.recordError("test-agent", "something went wrong");
      expect(board.getState().errors).toEqual([{ agent: "test-agent", error: "something went wrong" }]);
    });

    it("resets to empty state", () => {
      const board = new Blackboard();
      board.set("formData", makeFormData());
      board.markAgentComplete("test");
      board.reset();
      expect(board.get("formData")).toBeNull();
      expect(board.getState().completedAgents).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════
  // AGENT RUNNER
  // ═══════════════════════════════════════════════

  describe("Agent Runner", () => {
    it("registers agents", () => {
      const runner = new AgentRunner();
      runner.register(knowledgeGraphAgent);
      expect(runner.getRegisteredAgents()).toContain("knowledgeGraph");
    });

    it("computes execution order respecting dependencies", () => {
      const runner = createDefaultPipeline();
      const order = runner.getExecutionOrder();

      // knowledgeGraph must come before funnel
      expect(order.indexOf("knowledgeGraph")).toBeLessThan(order.indexOf("funnel"));
      // disc must come before closing
      expect(order.indexOf("disc")).toBeLessThan(order.indexOf("closing"));
      // funnel must come before coi and health
      expect(order.indexOf("funnel")).toBeLessThan(order.indexOf("coi"));
      expect(order.indexOf("funnel")).toBeLessThan(order.indexOf("health"));
    });

    it("detects circular dependencies", () => {
      const runner = new AgentRunner();
      runner.register({ name: "a", dependencies: ["b"], writes: [], run: () => {} });
      runner.register({ name: "b", dependencies: ["a"], writes: [], run: () => {} });
      expect(() => runner.getExecutionOrder()).toThrow("Circular dependency");
    });

    it("runs all agents in order", () => {
      const board = new Blackboard();
      board.set("formData", makeFormData());
      const runner = createDefaultPipeline();
      const state = runner.runAll(board);

      expect(state.completedAgents.length).toBe(8);
      expect(state.errors).toEqual([]);
      expect(state.knowledgeGraph).not.toBeNull();
      expect(state.funnelResult).not.toBeNull();
      expect(state.hormoziValue).not.toBeNull();
      expect(state.discProfile).not.toBeNull();
      expect(state.closingStrategy).not.toBeNull();
      expect(state.costOfInaction).not.toBeNull();
      expect(state.retentionFlywheel).not.toBeNull();
      expect(state.healthScore).not.toBeNull();
    });

    it("records errors without stopping pipeline", () => {
      const runner = new AgentRunner();
      runner.register({
        name: "failing",
        dependencies: [],
        writes: [],
        run: () => { throw new Error("boom"); },
      });
      runner.register(retentionAgent); // should still run

      const board = new Blackboard();
      board.set("formData", makeFormData());
      const state = runner.runAll(board);

      expect(state.errors.length).toBe(1);
      expect(state.errors[0].agent).toBe("failing");
      expect(state.completedAgents).toContain("retention");
    });

    it("runOne checks dependencies", () => {
      const runner = createDefaultPipeline();
      const board = new Blackboard();
      board.set("formData", makeFormData());

      // funnel depends on knowledgeGraph — should fail without it
      expect(() => runner.runOne("funnel", board)).toThrow("requires");
    });

    it("runOne succeeds when dependencies are met", () => {
      const runner = createDefaultPipeline();
      const board = new Blackboard();
      board.set("formData", makeFormData());

      runner.runOne("knowledgeGraph", board);
      expect(board.get("knowledgeGraph")).not.toBeNull();

      runner.runOne("funnel", board);
      expect(board.get("funnelResult")).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════
  // FULL PIPELINE
  // ═══════════════════════════════════════════════

  describe("Full Pipeline", () => {
    it("runFullPipeline produces complete state", () => {
      const state = runFullPipeline(makeFormData());
      expect(state.funnelResult).not.toBeNull();
      expect(state.knowledgeGraph).not.toBeNull();
      expect(state.hormoziValue).not.toBeNull();
      expect(state.discProfile).not.toBeNull();
      expect(state.closingStrategy).not.toBeNull();
      expect(state.costOfInaction).not.toBeNull();
      expect(state.churnRisk).not.toBeNull();
      expect(state.healthScore).not.toBeNull();
      expect(state.retentionFlywheel).not.toBeNull();
      expect(state.errors).toEqual([]);
    });

    it("funnel result from pipeline matches direct generation", () => {
      const fd = makeFormData();
      const directResult = generateFunnel(fd);
      const pipelineState = runFullPipeline(fd);

      // Both should have same stage count and structure
      expect(pipelineState.funnelResult!.stages.length).toBe(directResult.stages.length);
      expect(pipelineState.funnelResult!.totalBudget).toEqual(directResult.totalBudget);
    });

    it("pipeline works for all business fields", () => {
      const fields = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"] as const;
      for (const field of fields) {
        const state = runFullPipeline(makeFormData({ businessField: field }));
        expect(state.errors).toEqual([]);
        expect(state.completedAgents.length).toBe(8);
      }
    });
  });
});
