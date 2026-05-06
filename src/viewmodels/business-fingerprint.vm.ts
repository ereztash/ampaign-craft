// ─── Business-Fingerprint ViewModel ──────────────────────────────────────────
// Bridges businessFingerprintEngine → UI props.

export type {
  BusinessFingerprint,
  FingerprintDimensions,
  BusinessArchetype,
} from "@/engine/businessFingerprintEngine";
export {
  computeFingerprint,
  DIMENSION_LABELS,
  ARCHETYPE_LABELS,
} from "@/engine/businessFingerprintEngine";
