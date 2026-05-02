// ═══════════════════════════════════════════════
// Synthetic IBAR Scoring
//
// Aggregates 20 per-persona red-team outputs into 5 binary-thresholded
// scores: clarity, ownership, applicability, improvability, preference.
//
// Each persona contributes 1 point per dimension (0/1). Total /20.
// IBAR is intentionally NOT averaged — it is a count of personas that
// passed. Averages hide tail failures.
// ═══════════════════════════════════════════════

import type {
  CriticOutput, UsabilityOutput, OwnershipOutput, ComparisonOutput,
  FalsifiabilityCriticOutput,
} from "./redTeamPrompts";

export interface PersonaRedTeamBundle {
  personaId: string;
  critic: CriticOutput;
  usability: UsabilityOutput;
  ownership: OwnershipOutput;
  comparison: ComparisonOutput;
  /** Optional: clarity scored on a v2 oneLiner derived from ownership.what_to_change. */
  improvedClarityHigher?: boolean;
  /** Falsifiability check on the chosen angle (Call 3). */
  falsifiability?: FalsifiabilityCriticOutput;
}

export interface SyntheticIBAR {
  clarity: number;        // /N
  ownership: number;      // /N
  applicability: number;  // /N
  improvability: number;  // /N
  preference: number;     // /N
  /** Count of personas whose chosen angle passed falsifiability (rewrite_required=false). */
  falsifiability: number; // /N
  /** Total personas evaluated. */
  n: number;
  /** True if ALL gates pass per plan §5 + §9. */
  passesGates: boolean;
  /** First gate that failed, if any. Useful for printing reason. */
  firstFailedGate?: keyof Omit<SyntheticIBAR, "passesGates" | "firstFailedGate" | "n">;
  /** Per-persona breakdown — useful for spotting "all failures from one persona" kill criterion. */
  perPersonaFailures: Record<string, number>;
}

// Thresholds from plan §5 + reproducibility protocol
const THRESHOLDS = {
  clarity: 16,
  ownership: 12,
  applicability: 10,
  improvability: 0, // not gated yet (needs v2 pass) — informational only
  preference: 8,
  falsifiability: 12, // at least 12/20 angles must pass falsifiability check
} as const;

function scoreClarity(b: PersonaRedTeamBundle): boolean {
  // Persona understood the oneLiner = critic says coherent AND not too generic
  return b.critic.coherent && b.critic.genericity_score < 70;
}

function scoreOwnership(b: PersonaRedTeamBundle): boolean {
  return b.ownership.feels_mine === true;
}

function scoreApplicability(b: PersonaRedTeamBundle): boolean {
  return b.usability.would_use && b.usability.where.length >= 1;
}

function scoreImprovability(b: PersonaRedTeamBundle): boolean {
  return b.improvedClarityHigher === true;
}

function scorePreference(b: PersonaRedTeamBundle): boolean {
  return b.comparison.winner === "ff";
}

function scoreFalsifiability(b: PersonaRedTeamBundle): boolean {
  return b.falsifiability?.rewrite_required === false;
}

export function computeIBAR(bundles: PersonaRedTeamBundle[]): SyntheticIBAR {
  const n = bundles.length;
  const dims: Array<{ key: keyof typeof THRESHOLDS; fn: (b: PersonaRedTeamBundle) => boolean }> = [
    { key: "clarity",         fn: scoreClarity },
    { key: "ownership",       fn: scoreOwnership },
    { key: "applicability",   fn: scoreApplicability },
    { key: "improvability",   fn: scoreImprovability },
    { key: "preference",      fn: scorePreference },
    { key: "falsifiability",  fn: scoreFalsifiability },
  ];

  const counts = dims.reduce<Record<string, number>>((acc, { key, fn }) => {
    acc[key] = bundles.filter(fn).length;
    return acc;
  }, {});

  const perPersonaFailures: Record<string, number> = {};
  for (const b of bundles) {
    let f = 0;
    for (const { fn } of dims) if (!fn(b)) f++;
    perPersonaFailures[b.personaId] = f;
  }

  // Gate evaluation (in plan order)
  let firstFailedGate: SyntheticIBAR["firstFailedGate"];
  const gates: Array<keyof typeof THRESHOLDS> = ["clarity", "ownership", "applicability", "preference", "falsifiability"];
  for (const g of gates) {
    if (counts[g] < THRESHOLDS[g]) {
      firstFailedGate = g;
      break;
    }
  }

  return {
    clarity: counts.clarity,
    ownership: counts.ownership,
    applicability: counts.applicability,
    improvability: counts.improvability,
    preference: counts.preference,
    falsifiability: counts.falsifiability,
    n,
    passesGates: firstFailedGate === undefined,
    firstFailedGate,
    perPersonaFailures,
  };
}

export function formatIBAR(ibar: SyntheticIBAR): string {
  const line = `IBAR: clarity ${ibar.clarity}/${ibar.n}, ownership ${ibar.ownership}/${ibar.n}, applicability ${ibar.applicability}/${ibar.n}, improvability ${ibar.improvability}/${ibar.n}, preference ${ibar.preference}/${ibar.n}, falsifiability ${ibar.falsifiability}/${ibar.n}`;
  const verdict = ibar.passesGates
    ? "PASS — all gates cleared"
    : `FAIL — first gate failed: ${ibar.firstFailedGate}`;
  return `${line}\n${verdict}`;
}

/** Genericity failure rate from critic outputs (separate kill criterion §9). */
export function genericityFailureCount(bundles: PersonaRedTeamBundle[]): number {
  return bundles.filter((b) => b.critic.genericity_score >= 70).length;
}
