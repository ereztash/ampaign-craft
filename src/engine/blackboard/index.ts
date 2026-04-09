// ═══════════════════════════════════════════════
// Blackboard Architecture — Public API
// ═══════════════════════════════════════════════

export { Blackboard } from "./blackboardStore";
export type { BlackboardState, BoardSection } from "./blackboardStore";
export { AgentRunner } from "./agentRunner";
export type { AgentDefinition } from "./agentRunner";

// Agent definitions
export { knowledgeGraphAgent } from "./agents/knowledgeGraphAgent";
export { funnelAgent } from "./agents/funnelAgent";
export { hormoziAgent } from "./agents/hormoziAgent";
export { discAgent } from "./agents/discAgent";
export { closingAgent } from "./agents/closingAgent";
export { coiAgent } from "./agents/coiAgent";
export { retentionAgent } from "./agents/retentionAgent";
export { healthAgent } from "./agents/healthAgent";

import { Blackboard } from "./blackboardStore";
import { AgentRunner } from "./agentRunner";
import { knowledgeGraphAgent } from "./agents/knowledgeGraphAgent";
import { funnelAgent } from "./agents/funnelAgent";
import { hormoziAgent } from "./agents/hormoziAgent";
import { discAgent } from "./agents/discAgent";
import { closingAgent } from "./agents/closingAgent";
import { coiAgent } from "./agents/coiAgent";
import { retentionAgent } from "./agents/retentionAgent";
import { healthAgent } from "./agents/healthAgent";
import type { FormData } from "@/types/funnel";
import type { BlackboardState } from "./blackboardStore";

/**
 * Create a default pipeline with all registered agents.
 */
export function createDefaultPipeline(): AgentRunner {
  const runner = new AgentRunner();
  runner.register(knowledgeGraphAgent);
  runner.register(funnelAgent);
  runner.register(hormoziAgent);
  runner.register(discAgent);
  runner.register(closingAgent);
  runner.register(coiAgent);
  runner.register(retentionAgent);
  runner.register(healthAgent);
  return runner;
}

/**
 * Run the full analysis pipeline from form data.
 * This is the primary entry point for blackboard-based generation.
 * Returns the same results as direct engine calls, but via the blackboard pattern.
 */
export function runFullPipeline(formData: FormData): BlackboardState {
  const board = new Blackboard();
  board.set("formData", formData);

  const runner = createDefaultPipeline();
  return runner.runAll(board);
}
