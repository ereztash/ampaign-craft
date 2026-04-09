import type { AgentDefinition } from "../agentRunner";
import { calculateCostOfInaction } from "../../costOfInactionEngine";

export const coiAgent: AgentDefinition = {
  name: "coi",
  dependencies: ["funnel"],
  writes: ["costOfInaction"],
  run: (board) => {
    const funnelResult = board.get("funnelResult");
    if (!funnelResult) return;

    const coi = calculateCostOfInaction(funnelResult);
    board.set("costOfInaction", coi);
  },
};
