// Genesis boundary: re-exports IR types and moat scorer for UI consumption.
// Components must not import from @/engine/genesis/* directly.

export type {
  TeamSize,
  SalesMotion,
  Bottleneck,
  Fear,
  Competitor,
  BusinessSpec,
  MoatScore,
} from "@/engine/genesis/types";

export { computeMoatScore } from "@/engine/genesis/moatScorer";
