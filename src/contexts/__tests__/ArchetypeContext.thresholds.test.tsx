// ═══════════════════════════════════════════════
// Threshold-locking tests — Loop 2: Archetype Behavioral Correction
//
// Behavioral thresholds locked here (changing them breaks these tests):
//   VARIANT_PICK_THRESHOLD = 10   — min picks before correction fires
//   DIVERGENCE_THRESHOLD = 0.25   — min divergence from expected rate
//
// See: README.md "After 10+ picks, divergence ≥ 25% → lower confidence tier"
// ═══════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ReactNode, useRef } from "react";
import { ArchetypeProvider, useArchetype, type ArchetypeContextValue } from "../ArchetypeContext";

// ── Mocks (mirrors ArchetypeContext.test.tsx pattern) ─────────────────────────

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: { id: "test-user-1" } })),
}));

const mockPickStore = new Map<string, unknown>();

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((key: string, fallback: unknown) =>
      mockPickStore.has(key) ? mockPickStore.get(key) : fallback,
    ),
    setJSON: vi.fn((key: string, value: unknown) => {
      mockPickStore.set(key, value);
    }),
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    remove: vi.fn((key: string) => { mockPickStore.delete(key); }),
  },
}));

vi.mock("@/engine/archetypeClassifier", () => ({
  classifyArchetype: vi.fn(() => ({
    archetypeId: "strategist",
    confidence: 0.90,
    confidenceTier: "strong",
    scores: { strategist: 90, optimizer: 5, pioneer: 3, connector: 1, closer: 1 },
    signals: [],
  })),
  blendScores: vi.fn((_n: unknown, _p: unknown) => ({
    strategist: 90, optimizer: 5, pioneer: 3, connector: 1, closer: 1,
  })),
}));

vi.mock("@/lib/archetypeUIConfig", () => ({
  getArchetypeUIConfig: vi.fn(() => ({
    ctaTone: "authority",
    informationDensity: "comfortable",
    personalityProfile: { pipeline: [] },
    themePack: {},
  })),
}));

import { useAuth } from "@/contexts/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

const STORED_PROFILE_KEY = "funnelforge-archetype-test-user-1";

const CONFIDENT_PROFILE = {
  archetypeId: "strategist",
  confidence: 0.75,
  confidenceTier: "confident",
  scores: { strategist: 75, optimizer: 10, pioneer: 8, connector: 5, closer: 2 },
  signalHistory: [],
  lastComputedAt: new Date().toISOString(),
  sessionCount: 3,
  adaptationsEnabled: true,
  revealSeen: true,
  version: 2,
};

beforeEach(() => {
  mockPickStore.clear();
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: "test-user-1" } } as ReturnType<typeof useAuth>);
  // Pre-seed a "confident" tier profile so correction can lower it
  mockPickStore.set(STORED_PROFILE_KEY, CONFIDENT_PROFILE);
});

// ── Test harness ──────────────────────────────────────────────────────────────

let capturedCtx: ArchetypeContextValue | null = null;

function TestConsumer({ onMount }: { onMount?: (ctx: ArchetypeContextValue) => void }) {
  const ctx = useArchetype();
  const mounted = useRef(false);
  if (!mounted.current) {
    mounted.current = true;
    capturedCtx = ctx;
    onMount?.(ctx);
  }
  capturedCtx = ctx;
  return <span data-testid="tier">{ctx.confidenceTier}</span>;
}

function renderCtx() {
  return render(
    <ArchetypeProvider>
      <TestConsumer />
    </ArchetypeProvider>,
  );
}

async function waitTick() {
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

// ── VARIANT_PICK_THRESHOLD = 10 boundary ─────────────────────────────────────

describe("ArchetypeContext — VARIANT_PICK_THRESHOLD = 10 boundary", () => {
  it("9 'skip' picks do NOT trigger confidence tier downgrade (< VARIANT_PICK_THRESHOLD = 10)", async () => {
    renderCtx();
    await waitTick();

    const initialTier = capturedCtx?.confidenceTier;

    // Send exactly 9 picks (below VARIANT_PICK_THRESHOLD = 10)
    await act(async () => {
      for (let i = 0; i < 9; i++) {
        capturedCtx?.recordVariantPick("skip");
      }
    });
    await waitTick();

    // Tier should not have changed — window.length < 10
    expect(capturedCtx?.confidenceTier).toBe(initialTier);
  });

  it("10+ 'skip' picks with high divergence trigger confidence tier downgrade", async () => {
    renderCtx();
    await waitTick();

    const tiersBefore = capturedCtx?.confidenceTier;

    // Send exactly VARIANT_PICK_THRESHOLD = 10 picks, all "skip"
    // For "strategist": EXPECTED_PRIMARY_RATE = 0.60
    // primaryRate = 0/10 = 0, divergence = 0.60 - 0 = 0.60 >= DIVERGENCE_THRESHOLD = 0.25 → fires
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        capturedCtx?.recordVariantPick("skip");
      }
    });
    await waitTick();

    // Tier should have been lowered (correction fired)
    const tiersAfter = capturedCtx?.confidenceTier;
    const tierOrder = ["none", "tentative", "confident", "strong"];
    const beforeIdx = tierOrder.indexOf(tiersBefore ?? "none");
    const afterIdx = tierOrder.indexOf(tiersAfter ?? "none");
    expect(afterIdx).toBeLessThan(beforeIdx);
  });
});

// ── DIVERGENCE_THRESHOLD = 0.25 boundary ─────────────────────────────────────

describe("ArchetypeContext — DIVERGENCE_THRESHOLD = 0.25 boundary", () => {
  it("does NOT downgrade tier when divergence is below DIVERGENCE_THRESHOLD = 0.25", async () => {
    renderCtx();
    await waitTick();

    const initialTier = capturedCtx?.confidenceTier;

    // For "strategist": EXPECTED_PRIMARY_RATE = 0.60
    // Send 10 picks: 4 primary + 6 skip → primaryRate = 4/10 = 0.40
    // divergence = 0.60 - 0.40 = 0.20 < DIVERGENCE_THRESHOLD = 0.25 → no trigger
    await act(async () => {
      for (let i = 0; i < 4; i++) capturedCtx?.recordVariantPick("primary");
      for (let i = 0; i < 6; i++) capturedCtx?.recordVariantPick("skip");
    });
    await waitTick();

    expect(capturedCtx?.confidenceTier).toBe(initialTier);
  });

  it("DOES downgrade tier when divergence meets DIVERGENCE_THRESHOLD = 0.25", async () => {
    renderCtx();
    await waitTick();

    const initialTier = capturedCtx?.confidenceTier;

    // For "strategist": EXPECTED_PRIMARY_RATE = 0.60
    // Send 10 picks: 3 primary + 7 skip → primaryRate = 3/10 = 0.30
    // divergence = 0.60 - 0.30 = 0.30 >= DIVERGENCE_THRESHOLD = 0.25 → triggers
    await act(async () => {
      for (let i = 0; i < 3; i++) capturedCtx?.recordVariantPick("primary");
      for (let i = 0; i < 7; i++) capturedCtx?.recordVariantPick("skip");
    });
    await waitTick();

    const tierOrder = ["none", "tentative", "confident", "strong"];
    const afterIdx = tierOrder.indexOf(capturedCtx?.confidenceTier ?? "none");
    const initIdx = tierOrder.indexOf(initialTier ?? "none");
    expect(afterIdx).toBeLessThan(initIdx);
  });
});
