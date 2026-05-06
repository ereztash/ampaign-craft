// ─── Moat ViewModel ──────────────────────────────────────────────────────────
// Thin re-exports from moat engine modules.
// Components import from here; never directly from @/engine/*.

export { enrichDifferentiationWithCitations } from "@/engine/moat/principleTraceEnricher";

export type { PrincipleTrace } from "@/engine/moat/types";

export { libraryVersion } from "@/engine/moat/principleLibrary";
