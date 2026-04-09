// ═══════════════════════════════════════════════
// Circuit Breaker — Prevents runaway agent loops
// Implements: max iterations, confidence thresholds,
// consecutive failure detection, exponential backoff.
// ═══════════════════════════════════════════════

import type { CircuitBreakerConfig } from "./agentTypes";
import { DEFAULT_CIRCUIT_BREAKER } from "./agentTypes";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerSnapshot {
  state: CircuitState;
  iteration: number;
  consecutiveFailures: number;
  lastConfidence: number;
  trippedAt: number | null;
  trippedReason: string | null;
}

/**
 * Circuit Breaker for iterative agent loops (e.g., debug swarm).
 *
 * States:
 * - closed: normal operation, loop continues
 * - open: circuit tripped, loop must stop
 * - half-open: after cooldown, allows one attempt to recover
 *
 * Trip conditions:
 * 1. Max iterations exceeded
 * 2. Consecutive failures exceed threshold
 * 3. Confidence below minimum for N consecutive rounds
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = "closed";
  private iteration = 0;
  private consecutiveFailures = 0;
  private consecutiveLowConfidence = 0;
  private lastConfidence = 0;
  private trippedAt: number | null = null;
  private trippedReason: string | null = null;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER, ...config };
  }

  /**
   * Check if the loop is allowed to continue.
   */
  canContinue(): boolean {
    if (this.state === "open") {
      // Check if cooldown has elapsed for half-open attempt
      if (this.trippedAt && Date.now() - this.trippedAt >= this.config.cooldownMs) {
        this.state = "half-open";
        return true;
      }
      return false;
    }
    return true;
  }

  /**
   * Record a successful iteration with a confidence score.
   */
  recordSuccess(confidence: number): void {
    this.iteration++;
    this.lastConfidence = confidence;
    this.consecutiveFailures = 0;

    if (confidence < this.config.minConfidence) {
      this.consecutiveLowConfidence++;
    } else {
      this.consecutiveLowConfidence = 0;
    }

    // If in half-open state and succeeded, close the circuit
    if (this.state === "half-open") {
      this.state = "closed";
      this.trippedAt = null;
      this.trippedReason = null;
    }

    this.checkTrip();
  }

  /**
   * Record a failed iteration.
   */
  recordFailure(error?: string): void {
    this.iteration++;
    this.consecutiveFailures++;
    this.consecutiveLowConfidence++;
    this.lastConfidence = 0;

    // If in half-open state and failed again, re-open immediately
    if (this.state === "half-open") {
      this.trip(`Half-open recovery failed: ${error || "unknown error"}`);
      return;
    }

    this.checkTrip();
  }

  /**
   * Check all trip conditions and open circuit if needed.
   */
  private checkTrip(): void {
    if (this.iteration >= this.config.maxIterations) {
      this.trip(`Max iterations reached (${this.config.maxIterations})`);
      return;
    }

    if (this.consecutiveFailures >= this.config.consecutiveFailures) {
      this.trip(`${this.consecutiveFailures} consecutive failures`);
      return;
    }

    if (this.consecutiveLowConfidence >= this.config.consecutiveFailures) {
      this.trip(
        `${this.consecutiveLowConfidence} consecutive low-confidence results (below ${this.config.minConfidence})`
      );
    }
  }

  private trip(reason: string): void {
    this.state = "open";
    this.trippedAt = Date.now();
    this.trippedReason = reason;
  }

  /**
   * Get current breaker state snapshot.
   */
  getSnapshot(): CircuitBreakerSnapshot {
    return {
      state: this.state,
      iteration: this.iteration,
      consecutiveFailures: this.consecutiveFailures,
      lastConfidence: this.lastConfidence,
      trippedAt: this.trippedAt,
      trippedReason: this.trippedReason,
    };
  }

  /**
   * Reset the breaker to initial closed state.
   */
  reset(): void {
    this.state = "closed";
    this.iteration = 0;
    this.consecutiveFailures = 0;
    this.consecutiveLowConfidence = 0;
    this.lastConfidence = 0;
    this.trippedAt = null;
    this.trippedReason = null;
  }
}
