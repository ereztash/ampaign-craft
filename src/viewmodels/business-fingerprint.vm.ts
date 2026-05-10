// Business-fingerprint boundary: re-exports types and functions from
// businessFingerprintEngine.

export type {
  BusinessArchetype,
  FingerprintDimensions,
  FingerprintUX,
  BusinessFingerprint,
} from "@/engine/businessFingerprintEngine";

export {
  computeFingerprint,
  DIMENSION_LABELS,
  ARCHETYPE_LABELS,
} from "@/engine/businessFingerprintEngine";
