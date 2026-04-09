import type { AgentDefinition } from "../agentRunner";
import { inferDISCProfile } from "../../discProfileEngine";

export const discAgent: AgentDefinition = {
  name: "disc",
  dependencies: ["knowledgeGraph"],
  writes: ["discProfile"],
  run: (board) => {
    const formData = board.get("formData");
    if (!formData) return;

    const graph = board.get("knowledgeGraph");
    const profile = inferDISCProfile(formData, graph);
    board.set("discProfile", profile);
  },
};
