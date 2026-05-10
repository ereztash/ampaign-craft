// ─── Brand ViewModel ─────────────────────────────────────────────────────────
// Thin re-exports from brand and copy QA engines.
// Components import from here; never directly from @/engine/*.

export { analyzeBrandVector } from "@/engine/brandVectorEngine";

export { analyzeCopy } from "@/engine/copyQAEngine";
