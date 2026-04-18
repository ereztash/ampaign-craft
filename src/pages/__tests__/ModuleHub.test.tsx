import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ModuleHub from "../ModuleHub";

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
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({
    streak: { currentStreak: 0, lastVisit: null },
    masteryFeatures: [],
    unlock: vi.fn(),
  }),
}));

vi.mock("@/lib/socialProofData", () => ({
  getTotalUsers: () => 5000,
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildDefaultKnowledgeGraph: vi.fn(() => ({
    derived: { identityStatement: { en: "Test Identity", he: "זהות" } },
  })),
}));

vi.mock("@/engine/nextStepEngine", () => ({
  getRecommendedNextStep: vi.fn(() => ({
    route: "/wizard",
    title: { en: "Build your first plan", he: "בנה תוכנית" },
    description: { en: "Get started now", he: "התחל עכשיו" },
  })),
}));

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock("@/components/ModulePipeline", () => ({
  default: () => <div data-testid="module-pipeline" />,
}));

describe("ModuleHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <ModuleHub />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <ModuleHub />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the hero heading for new users", () => {
    render(
      <MemoryRouter>
        <ModuleHub />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/investing in marketing with no results/i)).toBeInTheDocument();
  });

  it("renders the module pipeline component", () => {
    render(
      <MemoryRouter>
        <ModuleHub />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("module-pipeline")).toBeInTheDocument();
  });

  it("shows Choose Where to Start section heading", () => {
    render(
      <MemoryRouter>
        <ModuleHub />
      </MemoryRouter>,
    );
    expect(screen.getByText(/choose where to start/i)).toBeInTheDocument();
  });
});
