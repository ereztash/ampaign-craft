import type { AgentDefinition } from "../agentRunner";
import { generateClosingStrategy } from "../../neuroClosingEngine";

export const closingAgent: AgentDefinition = {
  name: "closing",
  dependencies: ["disc"],
  writes: ["closingStrategy"],
  run: (board) => {
    const formData = board.get("formData");
    const discProfile = board.get("discProfile");
    if (!formData || !discProfile) return;

    const strategy = generateClosingStrategy(discProfile, formData);
    board.set("closingStrategy", strategy);
  },
};
