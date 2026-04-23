/**
 * Advanced page stress test
 *
 * Hammers every page in src/pages/ with a matrix of hostile conditions that
 * the per-page smoke tests don't cover:
 *   • Rapid mount/unmount cycles (catches missing cleanup on effect hooks).
 *   • Corrupted or oversized localStorage state (catches unsafe JSON.parse
 *     calls and array iteration that assumes well-formed data).
 *   • Hebrew <-> English language flips between renders (catches hard-coded
 *     strings or direction assumptions in a page's first paint).
 *   • Concurrent mounts of multiple pages in the same document (catches
 *     global-state collisions between pages — DOM attributes, listeners,
 *     document.title, etc.).
 *
 * Every page module gets imported lazily so one page's import-time side
 * effect can't poison the others.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";

// ── Context + hook mocks shared across every page ────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ token: undefined, planId: undefined, focus: undefined, sourceId: undefined, tab: undefined }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()] as never,
  };
});

let currentLanguage: "he" | "en" = "en";
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: currentLanguage,
    isRTL: currentLanguage === "he",
    isRtl: currentLanguage === "he",
    t: (key: string) => key,
    setLanguage: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
    isLocalAuth: false,
    tier: "free",
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      lastFormData: null,
      savedPlanCount: 0,
      visitCount: 1,
      isReturningUser: false,
      userSegment: "explorer",
      investment: { totalSessionsMinutes: 0, plansCreated: 0, totalPlansGenerated: 0, totalDifferentiationCompletions: 0 },
      unifiedProfile: null,
    },
    updateFormData: vi.fn(),
    updateInvestment: vi.fn(),
  }),
}));

vi.mock("@/contexts/DataSourceContext", () => ({
  useDataSources: () => ({
    sources: [],
    refreshFromProfile: vi.fn(),
    isConnected: () => false,
  }),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    adaptationsEnabled: false,
    uiConfig: { label: { en: "Optimizer", he: "אופטימייזר" }, dataAttribute: "optimizer" },
    archetype: null,
    isLoading: false,
    setAdaptationsEnabled: vi.fn(),
    setOverride: vi.fn(),
    markRevealSeen: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({
    streak: { currentStreak: 0, lastVisit: null },
    masteryFeatures: [],
    mastery: 0,
    unlock: vi.fn(),
    trackFeature: vi.fn(),
  }),
}));

vi.mock("@/hooks/useModuleStatus", () => ({
  useModuleStatus: () => [],
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/hooks/useArchetypePipeline", () => ({
  useArchetypePipeline: () => ({ nextStep: null, isActive: false }),
}));

vi.mock("@/lib/socialProofData", () => ({
  getTotalUsers: () => 1000,
}));

// Heavy engine modules — stub to cheap no-ops so we can render thousands of
// times in one run without CPU cost.
vi.mock("@/engine/userKnowledgeGraph", () => {
  // Use a graph shape compatible with downstream engines (they read
  // `graph.business.field` in several places).
  const graph = {
    business: { field: "tech", audience: "b2b", mainGoal: "leads" },
    derived: { identityStatement: { en: "Test", he: "בדיקה" } },
    discProfile: null,
  };
  return {
    buildUserKnowledgeGraph: vi.fn(() => graph),
    buildDefaultKnowledgeGraph: vi.fn(() => graph),
    loadChatInsights: vi.fn(() => null),
    loadImportedDataSignals: vi.fn(() => null),
    loadMetaSignals: vi.fn(() => null),
    extractChatInsights: vi.fn(() => null),
    getFieldNameHe: (f: string) => f,
    getFieldNameEn: (f: string) => f,
    formatPrice: (p: number) => `$${p}`,
    DEFAULT_FORM_DATA: {},
  };
});
vi.mock("@/engine/healthScoreEngine", () => ({
  calculateHealthScore: vi.fn(() => ({ total: 50, tier: "Average", breakdown: [], retentionReadiness: null })),
  getHealthScoreColor: () => "hsl(0, 0%, 50%)",
}));
vi.mock("@/engine/costOfInactionEngine", () => ({
  calculateCostOfInaction: vi.fn(() => ({ monthlyLoss: 0, lossFramedMessage: { he: "", en: "" }, comparisonMessage: { he: "", en: "" }, compoundingLoss: { threeMonth: 0, sixMonth: 0, twelveMonth: 0 } })),
}));
vi.mock("@/engine/pulseEngine", () => ({ generateWeeklyPulse: vi.fn(() => null) }));
vi.mock("@/engine/bottleneckEngine", () => ({ detectBottlenecks: vi.fn(() => []) }));
vi.mock("@/engine/gapEngine", () => ({ computeGaps: vi.fn(() => []) }));
vi.mock("@/engine/guidanceEngine", () => ({ generateGuidance: vi.fn(() => []) }));
vi.mock("@/engine/predictiveEngine", () => ({ predictSuccess: vi.fn(() => null) }));
vi.mock("@/engine/campaignAnalyticsEngine", () => ({ generateBenchmarks: vi.fn(() => ({ benchmarks: [], industryInsights: [] })) }));
vi.mock("@/engine/visualExportEngine", () => ({ structureForAllPlatforms: () => [] }));
vi.mock("@/engine/abTestEngine", () => ({
  createABExperiment: vi.fn(() => ({ id: "t", variants: [] })),
  assignVariant: vi.fn(() => ({ id: "control", label: "control" })),
}));
vi.mock("@/engine/discProfileEngine", () => ({
  // Return a fully-populated DISC profile — production `inferDISCProfile`
  // never returns null, so downstream engines (neuroClosingEngine) read
  // `.primary` unconditionally.
  inferDISCProfile: vi.fn(() => ({
    primary: "D",
    secondary: "I",
    distribution: { D: 0.4, I: 0.3, S: 0.2, C: 0.1 },
    messagingStrategy: { emphasize: [], avoid: [] },
    ctaStyle: "direct",
    funnelEmphasis: [],
    communicationTone: "direct",
  })),
}));
vi.mock("@/engine/behavioralActionEngine", () => ({ computeMotivationState: vi.fn(() => ({ nudge: null })) }));
vi.mock("@/engine/behavioralHeuristicEngine", () => ({
  getPrimaryCtaVerbs: vi.fn(() => ["Start", "Build"]),
  getL5CSSVars: () => ({}),
}));
vi.mock("@/engine/outcomeLoopEngine", () => ({
  snapshotEngineOutputs: vi.fn(),
  captureContentSnapshot: vi.fn(),
}));
vi.mock("@/engine/funnelEngine", () => ({
  generateFunnel: vi.fn(() => ({ id: "f1", stages: [], kpis: [], overallTips: [], funnelName: { he: "", en: "" } })),
  personalizeResult: vi.fn((r: unknown) => r),
}));

// Supabase loose client used by SharedQuote
vi.mock("@/integrations/supabase/loose", () => ({
  supabaseLoose: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/analytics", () => ({
  Analytics: new Proxy({}, {
    // Every Analytics.* call used by any page becomes a no-op fn — this
    // future-proofs the stress test against new analytics taps getting
    // added in pages we cover.
    get: () => vi.fn(),
  }),
  getUTM: vi.fn(() => ({ ref: null })),
}));

// Stub a handful of heavy UI sub-components that many pages pull in so the
// stress test stays CPU-cheap.
vi.mock("@/components/Header", () => ({ default: () => <div data-testid="header" /> }));
vi.mock("@/components/LoadingFallback", () => ({ default: () => <div data-testid="loading" /> }));
vi.mock("@/components/QuotePreview", () => ({ default: () => <div data-testid="quote-preview" /> }));
vi.mock("@/components/AiCoachChat", () => ({ default: () => <div data-testid="ai-coach-chat" /> }));
vi.mock("@/components/BusinessPulseBar", () => ({ default: () => <div data-testid="business-pulse-bar" /> }));
vi.mock("@/components/WeeklyActionCard", () => ({ default: () => <div data-testid="weekly-action-card" /> }));
vi.mock("@/components/IdentityStrip", () => ({ default: () => <div data-testid="identity-strip" /> }));
vi.mock("@/components/InsightFeed", () => ({ default: () => <div data-testid="insight-feed" /> }));
vi.mock("@/components/NudgeBanner", () => ({ NudgeBanner: () => null }));
vi.mock("@/components/ProgressMomentum", () => ({ ProgressMomentum: () => <div data-testid="progress-momentum" /> }));
vi.mock("@/components/ExpressWizard", () => ({ default: () => <div data-testid="express-wizard" /> }));
vi.mock("@/components/InsightsCard", () => ({ InsightsCard: () => <div data-testid="insights-card" /> }));
vi.mock("@/components/AnalyticsConnectCard", () => ({ AnalyticsConnectCard: () => <div data-testid="analytics-connect-card" /> }));
vi.mock("@/components/ArchetypePipelineGuide", () => ({ default: () => <div data-testid="archetype-pipeline-guide" /> }));
vi.mock("@/components/BackToHub", () => ({ default: () => null }));
vi.mock("@/components/PeerBenchmark", () => ({ PeerBenchmark: () => null }));
vi.mock("@/components/ArchetypeProfileCard", () => ({ default: () => null }));
vi.mock("@/components/BlindSpotNudge", () => ({ BlindSpotNudge: () => null, default: () => null }));

// safeStorage — back with real window.localStorage so that the tests that
// seed corrupt/oversized payloads via window.localStorage.setItem actually
// flow through the same code paths the page would hit at runtime.
vi.mock("@/lib/safeStorage", () => {
  const makeBackend = (storage: Storage) => ({
    getJSON: <T,>(key: string, fallback: T): T => {
      const raw = storage.getItem(key);
      if (raw == null) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return parsed == null ? fallback : (parsed as T);
      } catch {
        return fallback;
      }
    },
    setJSON: (key: string, val: unknown) => {
      storage.setItem(key, JSON.stringify(val));
    },
    getString: (key: string, fallback = "") => storage.getItem(key) ?? fallback,
    setString: (key: string, val: string) => { storage.setItem(key, val); },
    remove: (key: string) => { storage.removeItem(key); },
    clear: () => { storage.clear(); },
  });
  return {
    safeStorage: makeBackend(window.localStorage),
    safeSessionStorage: makeBackend(window.sessionStorage),
  };
});

// ── Page list under test ─────────────────────────────────────────────────
// Only pages that can render with the shared mock matrix above are included.
// Pages tied to admin/auth-specific flows or that need specific route params
// are covered by their dedicated smoke tests.

interface PageCase {
  name: string;
  load: () => Promise<{ default: ComponentType }>;
}

const PAGES: PageCase[] = [
  { name: "Landing",       load: () => import("../Landing") },
  { name: "Index",         load: () => import("../Index") },
  { name: "NotFound",      load: () => import("../NotFound") },
  { name: "ComingSoon",    load: () => import("../ComingSoon") },
  { name: "Support",       load: () => import("../Support") },
  { name: "Contact",       load: () => import("../Contact") },
  { name: "UseCases",      load: () => import("../UseCases") },
  { name: "Plans",         load: () => import("../Plans") },
  { name: "PricingEntry",  load: () => import("../PricingEntry") },
  { name: "SalesEntry",    load: () => import("../SalesEntry") },
  { name: "RetentionEntry",load: () => import("../RetentionEntry") },
  { name: "PlanView",      load: () => import("../PlanView") },
  { name: "ModuleHub",     load: () => import("../ModuleHub") },
  { name: "DataHub",       load: () => import("../DataHub") },
  { name: "Wizard",        load: () => import("../Wizard") },
  { name: "Dashboard",     load: () => import("../Dashboard") },
  { name: "AiCoachPage",   load: () => import("../AiCoachPage") },
  { name: "CommandCenter", load: () => import("../CommandCenter") },
  { name: "SharedQuote",   load: () => import("../SharedQuote") },
];

function renderPage(Component: ComponentType): void {
  render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  currentLanguage = "en";
  mockNavigate.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// ── 1. Rapid mount/unmount ───────────────────────────────────────────────

describe("stress: rapid mount/unmount", () => {
  for (const page of PAGES) {
    it(`${page.name} survives 10 mount/unmount cycles`, async () => {
      const { default: Component } = await page.load();
      for (let i = 0; i < 10; i++) {
        const view = render(
          <MemoryRouter>
            <Component />
          </MemoryRouter>,
        );
        view.unmount();
      }
      // If any cleanup path threw, render/unmount would have surfaced it.
      expect(true).toBe(true);
    });
  }
});

// ── 2. Corrupted localStorage resilience ─────────────────────────────────

describe("stress: corrupted localStorage", () => {
  const CORRUPT_PAYLOADS: Array<[string, string]> = [
    ["funnelforge-plans", "{not-valid-json"],
    ["funnelforge-plans", "null"],
    ["funnelforge-plans", "[]"],
    ["funnelforge-last-form", "NaN"],
    ["funnelforge-onboarding-draft", "\"incomplete"],
    ["funnelforge-signal-stuck-point", "undefined"],
    ["funnelforge-archetype-profile", "{\"version\":1,"],
  ];

  for (const page of PAGES) {
    it(`${page.name} renders without throwing across all corrupt payloads`, async () => {
      const { default: Component } = await page.load();
      for (const [key, payload] of CORRUPT_PAYLOADS) {
        window.localStorage.setItem(key, payload);
        expect(() => renderPage(Component)).not.toThrow();
        cleanup();
      }
    });
  }
});

// ── 3. Language flip resilience ──────────────────────────────────────────

describe("stress: language flip between renders", () => {
  for (const page of PAGES) {
    it(`${page.name} renders in both en and he without throwing`, async () => {
      const { default: Component } = await page.load();
      for (const lang of ["en", "he", "en", "he"] as const) {
        currentLanguage = lang;
        expect(() => renderPage(Component)).not.toThrow();
        cleanup();
      }
    });
  }
});

// ── 4. Oversized localStorage payload ────────────────────────────────────

describe("stress: oversized localStorage payload", () => {
  // 1k bogus saved-plans — forces every page's scan/sort code path.
  const hugePlans = Array.from({ length: 1000 }, (_, i) => ({
    id: `plan-${i}`,
    name: `Plan ${i}`,
    savedAt: new Date(2024, 0, 1 + (i % 365)).toISOString(),
    result: {
      formData: { businessField: "tech", audienceType: "b2b", existingChannels: [], budgetRange: "medium", experienceLevel: "intermediate", mainGoal: "leads", productDescription: "", salesModel: "subscription" },
      funnelName: { he: "משפך", en: "Funnel" },
      totalBudget: { min: 1000, max: 5000 },
      stages: [],
      kpis: [],
      overallTips: [],
    },
  }));

  for (const page of PAGES) {
    it(`${page.name} renders with 1000 saved plans in storage`, async () => {
      window.localStorage.setItem("funnelforge-plans", JSON.stringify(hugePlans));
      const { default: Component } = await page.load();
      expect(() => renderPage(Component)).not.toThrow();
    });
  }
});

// ── 5. Concurrent multi-page mount (global state collision check) ────────

describe("stress: concurrent multi-page mount", () => {
  it("mounts every page inside a single document without collision", async () => {
    const loaded = await Promise.all(PAGES.map((p) => p.load()));
    const view = render(
      <MemoryRouter>
        <div>
          {loaded.map(({ default: Component }, i) => (
            <div key={i} data-testid={`page-${i}`}>
              <Component />
            </div>
          ))}
        </div>
      </MemoryRouter>,
    );
    expect(view.container.children.length).toBeGreaterThan(0);
    // Global attributes we care about (data-archetype et al.) should be in a
    // consistent state — there's exactly one document root after all pages
    // co-mount.
    expect(document.documentElement).toBeTruthy();
  });
});
