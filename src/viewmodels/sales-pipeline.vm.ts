// Sales-pipeline boundary: re-exports from salesPipelineEngine.

export type {
  DealStageId,
  DealStage,
  SalesForecast,
  ObjectionScript,
  SalesAutomation,
  SalesPipelineResult,
  NeuroVector,
  NeuroClosingFramework,
  BuyerPersonality,
  PersonalityProfile,
} from "@/engine/salesPipelineEngine";

export {
  BUYER_PERSONALITIES,
  detectBuyerPersonality,
  generateSalesPipeline,
  getNeuroClosingFrameworks,
  getSalesTypeLabel,
} from "@/engine/salesPipelineEngine";
