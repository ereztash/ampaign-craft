import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deriveLoopState,
  getLoopSnapshot,
  commitToAction,
  reportOutcome,
  startNewWeek,
  abandonCommitment,
  getWeeklyHistory,
  getStreak,
  type LoopState,
  type LoopSnapshot,
  type WeeklyCommitment,
  type ReportOutcome,
} from "../weeklyLoopEngine";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/safeStorage", () => {
  const store = new Map<string, unknown>();
  return {
    safeStorage: {
      getJSON: vi.fn(<T>(key: string, fallback: T): T => {
        return store.has(key) ? (store.get(key) as T) : fallback;
      }),
      setJSON: vi.fn((key: string, value: unknown) => { store.set(key, value); }),
      remove: vi.fn((key: string) => { store.delete(key); }),
      _store: store,
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { safeStorage } from "@/lib/safeStorage";

const mockStorage = safeStorage as unknown as {
  getJSON: ReturnType<typeof vi.fn>;
  setJSON: ReturnType<typeof vi.fn>;
  remove:  ReturnType<typeof vi.fn>;
  _store:  Map<string, unknown>;
};

// ── Time helpers ──────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCommitment(overrides: Partial<WeeklyCommitment> = {}): WeeklyCommitment {
  return {
    id: "test-id-123",
    actionId: "action-abc",
    actionTitle: "Launch landing page",
    module: "marketing",
    severity: "critical",
    committedAt: new Date().toISOString(),
    reportedAt: null,
    outcome: null,
    note: null,
    ...overrides,
  };
}

function setupStorage(commitment: WeeklyCommitment | null, history: any[] = []) {
  mockStorage.getJSON.mockImplementation(<T>(key: string, fallback: T): T => {
    if (key === "funnelforge-weekly-commitment") return (commitment ?? fallback) as T;
    if (key === "funnelforge-weekly-history") return (history as unknown as T);
    return fallback;
  });
}

// ═══════════════════════════════════════════════
// deriveLoopState — Core state machine
// ═══════════════════════════════════════════════

describe("deriveLoopState — no commitment", () => {
  it("returns no_signal when no signal and no commitment", () => {
    const snap = deriveLoopState({ hasSignal: false, commitment: null });
    expect(snap.state).toBe("no_signal");
    expect(snap.commitment).toBeNull();
    expect(snap.hasSignal).toBe(false);
  });

  it("returns decision_pending when signal but no commitment", () => {
    const snap = deriveLoopState({ hasSignal: true, commitment: null });
    expect(snap.state).toBe("decision_pending");
    expect(snap.commitment).toBeNull();
    expect(snap.hasSignal).toBe(true);
  });

  it("daysSinceCommit is null when no commitment", () => {
    const snap = deriveLoopState({ hasSignal: true, commitment: null });
    expect(snap.daysSinceCommit).toBeNull();
  });

  it("daysSinceReport is null when no commitment", () => {
    const snap = deriveLoopState({ hasSignal: true, commitment: null });
    expect(snap.daysSinceReport).toBeNull();
  });
});

describe("deriveLoopState — same-day commitment (action_ready)", () => {
  it("returns action_ready when committed today (day 0)", () => {
    const commitment = makeCommitment({ committedAt: new Date().toISOString() });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("action_ready");
  });

  it("daysSinceCommit is 0 for today's commitment", () => {
    const commitment = makeCommitment({ committedAt: new Date().toISOString() });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.daysSinceCommit).toBe(0);
  });
});

describe("deriveLoopState — 1-6 days since commit (in_progress)", () => {
  it("returns in_progress on day 1", () => {
    const commitment = makeCommitment({ committedAt: daysAgo(1) });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("in_progress");
  });

  it("returns in_progress on day 6", () => {
    const commitment = makeCommitment({ committedAt: daysAgo(6) });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("in_progress");
  });

  it("daysSinceCommit is correctly computed for in_progress", () => {
    const commitment = makeCommitment({ committedAt: daysAgo(3) });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.daysSinceCommit).toBe(3);
  });
});

describe("deriveLoopState — 7-13 days since commit (awaiting_report)", () => {
  it("returns awaiting_report on day 7", () => {
    const commitment = makeCommitment({ committedAt: daysAgo(7) });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("awaiting_report");
  });

  it("returns awaiting_report on day 13", () => {
    const commitment = makeCommitment({ committedAt: daysAgo(13) });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("awaiting_report");
  });
});

describe("deriveLoopState — 14+ days since commit (missed_cycle)", () => {
  it("returns missed_cycle on day 14", () => {
    const commitment = makeCommitment({ committedAt: daysAgo(14) });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("missed_cycle");
  });

  it("returns missed_cycle on day 30", () => {
    const commitment = makeCommitment({ committedAt: daysAgo(30) });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("missed_cycle");
  });
});

describe("deriveLoopState — reported (between_weeks / cooldown expired)", () => {
  it("returns between_weeks when reported within last 7 days", () => {
    const commitment = makeCommitment({
      committedAt: daysAgo(5),
      reportedAt: daysAgo(1),
      outcome: "done",
    });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("between_weeks");
  });

  it("returns decision_pending when reported 7+ days ago (cooldown expired)", () => {
    const commitment = makeCommitment({
      committedAt: daysAgo(10),
      reportedAt: daysAgo(8),
      outcome: "done",
    });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.state).toBe("decision_pending");
    expect(snap.commitment).toBeNull(); // treated as cleared
  });

  it("returns no_signal when cooldown expired and no signal", () => {
    const commitment = makeCommitment({
      committedAt: daysAgo(10),
      reportedAt: daysAgo(8),
      outcome: "done",
    });
    const snap = deriveLoopState({ hasSignal: false, commitment });
    expect(snap.state).toBe("no_signal");
  });

  it("daysSinceReport is computed for between_weeks", () => {
    const commitment = makeCommitment({
      committedAt: daysAgo(5),
      reportedAt: daysAgo(2),
      outcome: "partial",
    });
    const snap = deriveLoopState({ hasSignal: true, commitment });
    expect(snap.daysSinceReport).toBe(2);
  });
});

// ═══════════════════════════════════════════════
// getLoopSnapshot — reads from storage
// ═══════════════════════════════════════════════

describe("getLoopSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
  });

  it("returns no_signal when storage is empty and no signal", () => {
    setupStorage(null);
    const snap = getLoopSnapshot(false);
    expect(snap.state).toBe("no_signal");
  });

  it("returns decision_pending when no commitment and has signal", () => {
    setupStorage(null);
    const snap = getLoopSnapshot(true);
    expect(snap.state).toBe("decision_pending");
  });

  it("returns action_ready for same-day commitment", () => {
    setupStorage(makeCommitment());
    const snap = getLoopSnapshot(true);
    expect(snap.state).toBe("action_ready");
  });
});

// ═══════════════════════════════════════════════
// commitToAction
// ═══════════════════════════════════════════════

describe("commitToAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
    mockStorage.setJSON.mockImplementation((key: string, value: unknown) => { mockStorage._store.set(key, value); });
    mockStorage.getJSON.mockImplementation(<T>(key: string, fallback: T): T => {
      return mockStorage._store.has(key) ? (mockStorage._store.get(key) as T) : fallback;
    });
  });

  it("returns a WeeklyCommitment with all required fields", () => {
    const c = commitToAction({ actionId: "a-1", actionTitle: "Do X", module: "marketing", severity: "critical" });
    expect(c.id).toBeTruthy();
    expect(c.actionId).toBe("a-1");
    expect(c.actionTitle).toBe("Do X");
    expect(c.module).toBe("marketing");
    expect(c.severity).toBe("critical");
    expect(c.committedAt).toBeTruthy();
    expect(c.reportedAt).toBeNull();
    expect(c.outcome).toBeNull();
    expect(c.note).toBeNull();
  });

  it("persists the commitment to storage", () => {
    commitToAction({ actionId: "a-1", actionTitle: "Do X", module: "marketing", severity: "warning" });
    expect(mockStorage.setJSON).toHaveBeenCalled();
  });

  it("two commits generate different ids", () => {
    const c1 = commitToAction({ actionId: "a-1", actionTitle: "Do X", module: "m", severity: "info" });
    const c2 = commitToAction({ actionId: "a-2", actionTitle: "Do Y", module: "m", severity: "info" });
    expect(c1.id).not.toBe(c2.id);
  });

  it("committedAt is a valid ISO timestamp", () => {
    const c = commitToAction({ actionId: "a", actionTitle: "T", module: "m", severity: "info" });
    expect(new Date(c.committedAt).getTime()).toBeGreaterThan(0);
  });

  it("supports all severity values", () => {
    const severities = ["critical", "warning", "info"] as const;
    for (const sev of severities) {
      const c = commitToAction({ actionId: "a", actionTitle: "T", module: "m", severity: sev });
      expect(c.severity).toBe(sev);
    }
  });
});

// ═══════════════════════════════════════════════
// reportOutcome
// ═══════════════════════════════════════════════

describe("reportOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
    mockStorage.setJSON.mockImplementation((key: string, value: unknown) => { mockStorage._store.set(key, value); });
    mockStorage.getJSON.mockImplementation(<T>(key: string, fallback: T): T => {
      return mockStorage._store.has(key) ? (mockStorage._store.get(key) as T) : fallback;
    });
  });

  it("returns null when no active commitment", () => {
    setupStorage(null);
    const result = reportOutcome("done");
    expect(result).toBeNull();
  });

  it("returns updated commitment with reportedAt and outcome", () => {
    setupStorage(makeCommitment());
    const result = reportOutcome("done");
    expect(result).not.toBeNull();
    expect(result!.outcome).toBe("done");
    expect(result!.reportedAt).toBeTruthy();
  });

  it("supports partial outcome", () => {
    setupStorage(makeCommitment());
    const result = reportOutcome("partial");
    expect(result!.outcome).toBe("partial");
  });

  it("supports skipped outcome", () => {
    setupStorage(makeCommitment());
    const result = reportOutcome("skipped");
    expect(result!.outcome).toBe("skipped");
  });

  it("stores optional note when provided", () => {
    setupStorage(makeCommitment());
    const result = reportOutcome("done", "Launched with some bugs");
    expect(result!.note).toBe("Launched with some bugs");
  });

  it("trims whitespace-only note to null", () => {
    setupStorage(makeCommitment());
    const result = reportOutcome("done", "   ");
    expect(result!.note).toBeNull();
  });

  it("null note stays null", () => {
    setupStorage(makeCommitment());
    const result = reportOutcome("done", null);
    expect(result!.note).toBeNull();
  });

  it("archives commitment to history", () => {
    setupStorage(makeCommitment(), []);
    reportOutcome("done");
    // setJSON should have been called for history key
    const calls = mockStorage.setJSON.mock.calls;
    const historyCalls = calls.filter(([key]: [string]) => key.includes("history"));
    expect(historyCalls.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// startNewWeek
// ═══════════════════════════════════════════════

describe("startNewWeek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
    mockStorage.setJSON.mockImplementation((key: string, value: unknown) => { mockStorage._store.set(key, value); });
    mockStorage.remove.mockImplementation((key: string) => { mockStorage._store.delete(key); });
    mockStorage.getJSON.mockImplementation(<T>(key: string, fallback: T): T => {
      return mockStorage._store.has(key) ? (mockStorage._store.get(key) as T) : fallback;
    });
  });

  it("clears the commitment from storage", () => {
    setupStorage(makeCommitment());
    startNewWeek();
    expect(mockStorage.remove).toHaveBeenCalled();
  });

  it("preserves history when starting new week", () => {
    const history = [{ commitment: makeCommitment({ outcome: "done" }), weekStart: daysAgo(7) }];
    setupStorage(makeCommitment(), history);
    startNewWeek();
    // remove is called for commitment key, NOT for history key
    const removedKeys: string[] = mockStorage.remove.mock.calls.map(([key]: [string]) => key);
    expect(removedKeys.every((k) => !k.includes("history"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// abandonCommitment
// ═══════════════════════════════════════════════

describe("abandonCommitment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
    mockStorage.setJSON.mockImplementation((key: string, value: unknown) => { mockStorage._store.set(key, value); });
    mockStorage.remove.mockImplementation((key: string) => { mockStorage._store.delete(key); });
    mockStorage.getJSON.mockImplementation(<T>(key: string, fallback: T): T => {
      return mockStorage._store.has(key) ? (mockStorage._store.get(key) as T) : fallback;
    });
  });

  it("does nothing when no active commitment", () => {
    setupStorage(null);
    expect(() => abandonCommitment()).not.toThrow();
  });

  it("archives the commitment with outcome=skipped", () => {
    setupStorage(makeCommitment(), []);
    abandonCommitment();
    const historyCalls = mockStorage.setJSON.mock.calls.filter(([key]: [string]) => key.includes("history"));
    expect(historyCalls.length).toBeGreaterThan(0);
    const [, historyData] = historyCalls[0];
    const last = (historyData as any[])[(historyData as any[]).length - 1];
    expect(last.commitment.outcome).toBe("skipped");
  });

  it("clears commitment after abandoning", () => {
    setupStorage(makeCommitment(), []);
    abandonCommitment();
    expect(mockStorage.remove).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════
// getWeeklyHistory
// ═══════════════════════════════════════════════

describe("getWeeklyHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no history", () => {
    mockStorage.getJSON.mockReturnValue([]);
    expect(getWeeklyHistory()).toEqual([]);
  });

  it("returns stored history items", () => {
    const historyItems = [
      { commitment: makeCommitment({ outcome: "done" }), weekStart: daysAgo(7) },
    ];
    mockStorage.getJSON.mockReturnValue(historyItems);
    const history = getWeeklyHistory();
    expect(history.length).toBe(1);
    expect(history[0].commitment.outcome).toBe("done");
  });
});

// ═══════════════════════════════════════════════
// getStreak
// ═══════════════════════════════════════════════

describe("getStreak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 for empty history", () => {
    mockStorage.getJSON.mockReturnValue([]);
    expect(getStreak()).toBe(0);
  });

  it("returns 0 when last entry is skipped", () => {
    const history = [
      { commitment: makeCommitment({ outcome: "done" }), weekStart: daysAgo(14) },
      { commitment: makeCommitment({ outcome: "skipped" }), weekStart: daysAgo(7) },
    ];
    mockStorage.getJSON.mockReturnValue(history);
    expect(getStreak()).toBe(0);
  });

  it("returns 1 for a single done entry", () => {
    const history = [
      { commitment: makeCommitment({ outcome: "done" }), weekStart: daysAgo(7) },
    ];
    mockStorage.getJSON.mockReturnValue(history);
    expect(getStreak()).toBe(1);
  });

  it("counts consecutive done/partial outcomes from the end", () => {
    const history = [
      { commitment: makeCommitment({ outcome: "skipped" }), weekStart: daysAgo(21) },
      { commitment: makeCommitment({ outcome: "done" }), weekStart: daysAgo(14) },
      { commitment: makeCommitment({ outcome: "partial" }), weekStart: daysAgo(7) },
    ];
    mockStorage.getJSON.mockReturnValue(history);
    expect(getStreak()).toBe(2);
  });

  it("breaks streak on skipped/null outcome", () => {
    const history = [
      { commitment: makeCommitment({ outcome: "done" }), weekStart: daysAgo(28) },
      { commitment: makeCommitment({ outcome: "done" }), weekStart: daysAgo(21) },
      { commitment: makeCommitment({ outcome: null }), weekStart: daysAgo(14) },
      { commitment: makeCommitment({ outcome: "done" }), weekStart: daysAgo(7) },
    ];
    mockStorage.getJSON.mockReturnValue(history);
    // Streak only counts the last consecutive run
    expect(getStreak()).toBe(1);
  });

  it("counts partial as streak-continuing", () => {
    const history = [
      { commitment: makeCommitment({ outcome: "partial" }), weekStart: daysAgo(14) },
      { commitment: makeCommitment({ outcome: "partial" }), weekStart: daysAgo(7) },
    ];
    mockStorage.getJSON.mockReturnValue(history);
    expect(getStreak()).toBe(2);
  });
});
