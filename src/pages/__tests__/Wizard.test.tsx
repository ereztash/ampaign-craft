import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Wizard from "../Wizard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, tier: "free", isLocalAuth: false }),
}));

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      lastFormData: null,
      savedPlanCount: 0,
      investment: { totalSessionsMinutes: 0, plansCreated: 0 },
      unifiedProfile: null,
    },
    persistFormData: vi.fn(),
    persistUnifiedProfile: vi.fn(),
  }),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    updateFromBlackboard: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/lib/analytics", () => ({
  Analytics: {
    firstPlanGenerated: vi.fn(),
    ahaMoment: vi.fn(),
  },
}));

vi.mock("@/services/eventQueue", () => ({
  onPlanGenerated: vi.fn(() => Promise.resolve()),
  trackFirstPlanGenerated: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/engine/funnelEngine", () => ({
  generateFunnel: vi.fn(() => ({ id: "f1", stages: [], kpis: [], overallTips: [] })),
  personalizeResult: vi.fn((r: unknown) => r),
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({ discProfile: null })),
}));

vi.mock("@/engine/predictiveContentScoreEngine", () => ({
  predictContentScore: vi.fn(() => 75),
}));

vi.mock("@/engine/emotionalPerformanceEngine", () => ({
  calculateEPS: vi.fn(() => 80),
}));

vi.mock("@/engine/seoContentEngine", () => ({
  generateSEOContent: vi.fn(() => ({
    metaDescription: { en: "Meta description", he: "תיאור" },
  })),
}));

vi.mock("@/engine/promptOptimizerEngine", () => ({
  getOptimizationReport: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/services/aiCopyService", () => ({
  generateCopy: vi.fn(() => Promise.resolve({ text: "Generated copy" })),
}));

vi.mock("@/lib/agentOrchestrator", () => ({
  runAgent: vi.fn(() => Promise.resolve({ output: "Agent output" })),
  buildCopyPrompt: vi.fn(() => "Prompt"),
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

vi.mock("@/components/SmartOnboarding", () => ({
  default: ({ onComplete }: { onComplete: (profile: unknown) => void }) => (
    <div data-testid="smart-onboarding">
      <button onClick={() => onComplete({ businessField: "tech" })}>Complete Onboarding</button>
    </div>
  ),
}));

vi.mock("@/components/ProcessingScreen", () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="processing-screen">
      <button onClick={onComplete}>Processing Done</button>
    </div>
  ),
}));

vi.mock("@/types/profile", () => ({
  toFormData: vi.fn((up: unknown) => up),
}));

describe("Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Wizard />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <Wizard />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders smart onboarding as initial state", () => {
    render(
      <MemoryRouter>
        <Wizard />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("smart-onboarding")).toBeInTheDocument();
  });

  it("does not show processing screen initially", () => {
    render(
      <MemoryRouter>
        <Wizard />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("processing-screen")).not.toBeInTheDocument();
  });
});
