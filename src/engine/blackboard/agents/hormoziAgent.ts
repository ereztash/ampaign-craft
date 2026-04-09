import type { AgentDefinition } from "../agentRunner";
import { calculateValueScore } from "../../hormoziValueEngine";

export const hormoziAgent: AgentDefinition = {
  name: "hormozi",
  dependencies: ["knowledgeGraph"],
  writes: ["hormoziValue"],
  run: (board) => {
    const formData = board.get("formData");
    if (!formData) return;

    const graph = board.get("knowledgeGraph");
    const result = calculateValueScore(formData, graph);
    board.set("hormoziValue", result);
  },
};
