import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AiCoachPage from "../AiCoachPage";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
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

vi.mock("@/engine/funnelEngine", () => ({
  generateFunnel: vi.fn(() => ({ id: "f1", stages: [], kpis: [], overallTips: [] })),
  personalizeResult: vi.fn((r: unknown) => r),
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({})),
}));

vi.mock("@/engine/healthScoreEngine", () => ({
  calculateHealthScore: vi.fn(() => ({ total: 60 })),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/components/AiCoachChat", () => ({
  default: () => <div data-testid="ai-coach-chat">AiCoachChat</div>,
}));

describe("AiCoachPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <AiCoachPage />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows empty state when no plan or profile data exists", () => {
    render(
      <MemoryRouter>
        <AiCoachPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
    // No plan, no lastFormData → shows the "need a plan" prompt
    expect(screen.getByRole("button", { name: /open wizard/i })).toBeInTheDocument();
  });

  it("shows the bot icon in the empty state", () => {
    render(
      <MemoryRouter>
        <AiCoachPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/need a plan or business profile/i)).toBeInTheDocument();
  });
});
