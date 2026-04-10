// ═══════════════════════════════════════════════
// Sentinel Rail — opt-in blackboard observer
//
// A strictly additive observer that records events and produces
// (V, C, state) snapshots on demand via the EDP detector. Nothing
// in the existing blackboard pipeline runs this class — a caller
// must explicitly construct an instance and feed events into it.
//
// Constraints (by spec):
//   - Only imports from the two new siblings: ./edp and
//     ./kernelDeclaration. Zero imports from existing blackboard
//     modules (no blackboardStore, contract, agentRunner, …).
//   - Does not mutate any existing Blackboard class.
// ═══════════════════════════════════════════════

import { computeV, computeC, detectCollapse, type CollapseState } from "./edp";
import { SYSTEM_NAMESPACE_PREFIX } from "./kernelDeclaration";

export interface SentinelEvent {
  ts: number;
  conceptKey: string;
}

export interface SentinelSnapshot {
  v: number;
  c: number;
  state: CollapseState;
  sampledAt: number;
  eventCount: number;
}

const DEFAULT_MAX_EVENTS = 500;

export class SentinelRail {
  private events: SentinelEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents: number = DEFAULT_MAX_EVENTS) {
    this.maxEvents = Math.max(1, Math.floor(maxEvents));
  }

  /**
   * Append an event. The ring is trimmed to `maxEvents` by
   * dropping the oldest entries so memory stays bounded.
   */
  record(event: SentinelEvent): void {
    this.events.push({ ts: event.ts, conceptKey: event.conceptKey });
    if (this.events.length > this.maxEvents) {
      // Drop the oldest entries while preserving insertion order.
      const overflow = this.events.length - this.maxEvents;
      this.events.splice(0, overflow);
    }
  }

  /**
   * Produce a point-in-time snapshot derived from every event
   * currently in the ring. Thresholds may be overridden per-call.
   */
  snapshot(epsilon?: number, kappa?: number): SentinelSnapshot {
    const v = computeV(this.events);
    const c = computeC(this.events);
    const state = detectCollapse(v, c, epsilon, kappa);
    return {
      v,
      c,
      state,
      sampledAt: Date.now(),
      eventCount: this.events.length,
    };
  }

  /**
   * Drop every event. The ring is ready to reuse.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Return a copy of the events whose concept-key lives in the
   * SYSTEM namespace. Callers receive an independent array they
   * may sort or mutate without affecting the rail.
   */
  getSystemEvents(): SentinelEvent[] {
    return this.events
      .filter((event) => event.conceptKey.startsWith(SYSTEM_NAMESPACE_PREFIX))
      .map((event) => ({ ts: event.ts, conceptKey: event.conceptKey }));
  }

  /**
   * Expose the current ring size without leaking the backing array.
   */
  get size(): number {
    return this.events.length;
  }
}
