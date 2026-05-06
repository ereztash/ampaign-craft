// Guidance & gap engines boundary: re-exports functions that components need.
// Components must import from here, never from @/engine/* directly.

export { generateGuidance, getOverallHealth } from "@/engine/guidanceEngine";
export { computeGaps } from "@/engine/gapEngine";
