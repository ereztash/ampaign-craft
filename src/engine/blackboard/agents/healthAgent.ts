import type { AgentDefinition } from "../agentRunner";
import { calculateHealthScore } from "../../healthScoreEngine";

export const healthAgent: AgentDefinition = {
  name: "health",
  dependencies: ["funnel"],
  writes: ["healthScore"],
  run: (board) => {
    const funnelResult = board.get("funnelResult");
    if (!funnelResult) return;

    const score = calculateHealthScore(funnelResult);
    board.set("healthScore", score);
  },
};
