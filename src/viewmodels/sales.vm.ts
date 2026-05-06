// ─── Sales ViewModel ─────────────────────────────────────────────────────────
// Bridges salesPipelineEngine, quoteAssemblyEngine, neuroClosingEngine → UI props.

export {
  BUYER_PERSONALITIES,
  detectBuyerPersonality,
  generateSalesPipeline,
  getNeuroClosingFrameworks,
  getSalesTypeLabel,
} from "@/engine/salesPipelineEngine";
export { assembleQuote } from "@/engine/quoteAssemblyEngine";
export { generateClosingStrategy } from "@/engine/neuroClosingEngine";
export type { NeuroClosingStrategy } from "@/engine/neuroClosingEngine";
