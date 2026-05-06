// Re-export activation types so components can type-check against them
// without importing from @/engine/* directly.
export type {
  ActivationMode,
  ActivationSignals,
  EngineActivationRule,
  TriggerType,
} from "@/engine/engineActivationRules";

export type { EngineOrchestratorResult } from "@/hooks/useEngineOrchestrator";
