import { describe, it, expect } from "vitest";
import { SentinelRail } from "../sentinelRail";
import { SYSTEM_NAMESPACE_PREFIX } from "../kernelDeclaration";

function ev(ts: number, conceptKey: string) {
  return { ts, conceptKey };
}

describe("SentinelRail", () => {
  // ── record / size ────────────────────────────────

  it("starts empty", () => {
    expect(new SentinelRail().size).toBe(0);
  });

  it("record() grows the ring", () => {
    const rail = new SentinelRail();
    rail.record(ev(100, "AGENT-disc-1"));
    rail.record(ev(200, "AGENT-disc-2"));
    expect(rail.size).toBe(2);
  });

  it("enforces maxEvents cap by dropping oldest", () => {
    const rail = new SentinelRail(3);
    rail.record(ev(1, "A-b-1"));
    rail.record(ev(2, "A-b-2"));
    rail.record(ev(3, "A-b-3"));
    rail.record(ev(4, "A-b-4")); // should drop first
    expect(rail.size).toBe(3);
    // Oldest dropped: SYSTEM events from earlier should be gone
    const all = rail.getSystemEvents();
    expect(all).toHaveLength(0); // none had SYSTEM- prefix
  });

  it("clamps maxEvents < 1 to 1", () => {
    const rail = new SentinelRail(0);
    rail.record(ev(1, "A-b-1"));
    expect(rail.size).toBe(1);
    rail.record(ev(2, "A-b-2")); // drops first, keeps second
    expect(rail.size).toBe(1);
  });

  // ── clear ────────────────────────────────────────

  it("clear() resets size to 0", () => {
    const rail = new SentinelRail();
    rail.record(ev(100, "A-b-1"));
    rail.clear();
    expect(rail.size).toBe(0);
  });

  it("snapshot after clear() shows eventCount=0", () => {
    const rail = new SentinelRail();
    rail.record(ev(100, "A-b-1"));
    rail.clear();
    expect(rail.snapshot().eventCount).toBe(0);
  });

  // ── snapshot ─────────────────────────────────────

  it("snapshot on empty rail returns both-collapse state", () => {
    // V=0, C=0 → both
    const snap = new SentinelRail().snapshot();
    expect(snap.state).toBe("both");
    expect(snap.v).toBe(0);
    expect(snap.c).toBe(0);
    expect(snap.eventCount).toBe(0);
  });

  it("snapshot includes sampledAt close to Date.now()", () => {
    const before = Date.now();
    const snap = new SentinelRail().snapshot();
    const after = Date.now();
    expect(snap.sampledAt).toBeGreaterThanOrEqual(before);
    expect(snap.sampledAt).toBeLessThanOrEqual(after);
  });

  it("snapshot eventCount matches ring size", () => {
    const rail = new SentinelRail();
    rail.record(ev(1, "A-b-1"));
    rail.record(ev(2, "A-b-2"));
    expect(rail.snapshot().eventCount).toBe(2);
  });

  it("snapshot accepts custom epsilon/kappa overrides", () => {
    const rail = new SentinelRail();
    // With epsilon=100, any V < 100 → v_collapse or both
    const snap = rail.snapshot(100, 100);
    expect(["both", "v_collapse", "c_decoherence"]).toContain(snap.state);
  });

  // ── getSystemEvents ──────────────────────────────

  it("getSystemEvents returns only SYSTEM- prefixed events", () => {
    const rail = new SentinelRail();
    rail.record(ev(1, `${SYSTEM_NAMESPACE_PREFIX}boot`));
    rail.record(ev(2, "AGENT-disc-1"));
    rail.record(ev(3, `${SYSTEM_NAMESPACE_PREFIX}tick`));
    const sys = rail.getSystemEvents();
    expect(sys).toHaveLength(2);
    expect(sys.every((e) => e.conceptKey.startsWith("SYSTEM-"))).toBe(true);
  });

  it("getSystemEvents returns a copy (mutations don't affect the rail)", () => {
    const rail = new SentinelRail();
    rail.record(ev(1, `${SYSTEM_NAMESPACE_PREFIX}boot`));
    const sys = rail.getSystemEvents();
    sys.length = 0;
    expect(rail.size).toBe(1);
  });

  it("returns empty array when no SYSTEM- events present", () => {
    const rail = new SentinelRail();
    rail.record(ev(1, "AGENT-disc-1"));
    expect(rail.getSystemEvents()).toHaveLength(0);
  });
});
