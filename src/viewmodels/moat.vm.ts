// Moat boundary: re-exports from moat/* engine modules.

export {
  enrichDifferentiationWithCitations,
  distinctPrinciples,
} from "@/engine/moat/principleTraceEnricher";

export {
  getLibrary,
  getSourceRegistry,
  findPrinciple,
  findSource,
  libraryVersion,
} from "@/engine/moat/principleLibrary";

export type {
  PrincipleTrace,
  TracedPrinciple,
  TracedSource,
} from "@/engine/moat/types";
