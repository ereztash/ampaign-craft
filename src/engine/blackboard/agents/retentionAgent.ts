import type { AgentDefinition } from "../agentRunner";
import { generateRetentionFlywheel } from "../../retentionFlywheelEngine";
import { assessChurnRisk } from "../../churnPredictionEngine";

export const retentionAgent: AgentDefinition = {
  name: "retention",
  dependencies: [],
  writes: ["retentionFlywheel", "churnRisk"],
  run: (board) => {
    const formData = board.get("formData");
    if (!formData) return;

    board.set("retentionFlywheel", generateRetentionFlywheel(formData));
    board.set("churnRisk", assessChurnRisk(formData));
  },
};
