import type { AgentDefinition } from "../agentRunner";
import { buildUserKnowledgeGraph } from "../../userKnowledgeGraph";

export const knowledgeGraphAgent: AgentDefinition = {
  name: "knowledgeGraph",
  dependencies: [],
  writes: ["knowledgeGraph"],
  run: (board) => {
    const formData = board.get("formData");
    if (!formData) return;

    const graph = buildUserKnowledgeGraph(formData);
    board.set("knowledgeGraph", graph);
  },
};
