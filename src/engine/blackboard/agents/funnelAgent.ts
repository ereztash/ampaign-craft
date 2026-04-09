import type { AgentDefinition } from "../agentRunner";
import { generateFunnel, personalizeResult } from "../../funnelEngine";

export const funnelAgent: AgentDefinition = {
  name: "funnel",
  dependencies: ["knowledgeGraph"],
  writes: ["funnelResult"],
  run: (board) => {
    const formData = board.get("formData");
    if (!formData) return;

    let result = generateFunnel(formData);

    // Personalize with knowledge graph if available
    const graph = board.get("knowledgeGraph");
    if (graph) {
      result = personalizeResult(result, graph);
    }

    board.set("funnelResult", result);
  },
};
