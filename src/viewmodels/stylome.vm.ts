// ─── Stylome ViewModel ───────────────────────────────────────────────────────
// Thin re-exports from stylomeEngine.
// Components import from here; never directly from @/engine/*.

export {
  INTERVIEW_QUESTIONS,
  analyzeSamples,
} from "@/engine/stylomeEngine";
export type {
  StylomeProfile,
  StylomeSample,
} from "@/engine/stylomeEngine";
