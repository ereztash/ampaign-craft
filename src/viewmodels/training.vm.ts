// Training data engine boundary: re-exports types and functions that components need.
// Components must import from here, never from @/engine/* directly.

export type { FeedbackRating } from "@/engine/trainingDataEngine";
export { updateFeedback } from "@/engine/trainingDataEngine";
