// ═══════════════════════════════════════════════
// Ontological Verifier — Blackboard Write Contract
//
// Determines whether an incoming write "survives" by measuring
// its information gain against the current board state.
//
// Formal basis: J = ∂I/∂Ω
//   J > 0  → write survives (positive information gradient)
//   J ≤ 0  → write is rejected (null gain or information destruction)
//
// All functions are pure — no side effects, no I/O.
// ═══════════════════════════════════════════════

import type { BoardSection } from "./blackboardStore";
import type { ModelTier } from "@/services/llmRouter";

// ═══════════════════════════════════════════════
// Public Types
// ═══════════════════════════════════════════════

export interface VerifyResult {
  ok: boolean;
  /** Human-readable rejection code. Undefined when ok === true. */
  reason?: string;
}

/**
 * Context passed to verifyWrite by the agent execution layer.
 * `agentName` and `modelTier` are used only for logging — they do not
 * influence the verification logic itself (kept pure).
 */
export interface WriteContext {
  /** Target board section. */
  section: BoardSection;
  /** The value the agent is trying to write. */
  incoming: unknown;
  /** The current value held in that section (may be null on first write). */
  current: unknown;
  /** Name of the agent attempting the write (for telemetry context only). */
  agentName: string;
  /** LLM tier used by the writing agent, if applicable. */
  modelTier?: ModelTier;
}

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

/**
 * Sections managed exclusively via dedicated Blackboard lifecycle methods.
 * Direct board.set() calls to these are always rejected to prevent agents
 * from corrupting orchestration state.
 */
const RESTRICTED_SECTIONS = new Set<BoardSection>(["completedAgents", "errors"]);

// ═══════════════════════════════════════════════
// Core Verifier
// ═══════════════════════════════════════════════

/**
 * Determine whether an incoming write contributes net information gain (J > 0).
 *
 * Rejection codes:
 *   restricted_section  — section is managed by board lifecycle methods
 *   null_payload        — overwriting existing data with null destroys information
 *   empty_object        — payload with zero keys has no information content
 *   identity_write      — primitive value is identical to current (∂I = 0)
 *
 * @returns VerifyResult — { ok: true } on success, { ok: false, reason } on rejection
 */
export function verifyWrite(ctx: WriteContext): VerifyResult {
  const { section, incoming, current } = ctx;

  // ── Rule 1: Restricted orchestration sections ──
  if (RESTRICTED_SECTIONS.has(section)) {
    return {
      ok: false,
      reason: `restricted_section: "${section}" must be updated via markAgentComplete() or recordError()`,
    };
  }

  // ── Rule 2: Null overwrites destroy existing information ──
  // Null → null is a no-op (allowed); non-null → null is information destruction.
  if (incoming === null && current !== null) {
    return {
      ok: false,
      reason: `null_payload: overwriting existing "${section}" value with null destroys information (J < 0)`,
    };
  }

  // ── Rule 3: Empty objects have zero information content ──
  if (
    incoming !== null &&
    typeof incoming === "object" &&
    !Array.isArray(incoming) &&
    Object.keys(incoming as object).length === 0
  ) {
    return {
      ok: false,
      reason: `empty_object: payload for "${section}" has no fields (zero information content, J = 0)`,
    };
  }

  // ── Rule 4: Primitive identity writes carry no ∂I ──
  // Only checked for scalars — object identity is expensive and unreliable.
  if (
    incoming !== null &&
    current !== null &&
    typeof incoming !== "object" &&
    typeof current !== "object" &&
    incoming === current
  ) {
    return {
      ok: false,
      reason: `identity_write: incoming value for "${section}" equals current (∂I/∂Ω = 0, no information gain)`,
    };
  }

  return { ok: true };
}
