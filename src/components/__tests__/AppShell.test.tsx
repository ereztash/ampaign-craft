import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppShell from "../AppShell";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: "user" }, tier: "pro", signOut: vi.fn() }),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    effectiveArchetypeId: "strategist",
    adaptationsEnabled: false,
    confidenceTier: "tentative",
    profile: { archetypeId: "strategist", scores: {}, confidence: 0.7, signalHistory: [], sessionCount: 3, lastComputedAt: new Date().toISOString(), overrideByUser: null, confidenceTier: "tentative" },
    uiConfig: {
      label: { he: "האסטרטג", en: "Strategist" },
      ctaTone: "direct",
      informationDensity: "high",
      defaultTab: "analytics",
      workspaceOrder: [],
      modulesOrder: [],
      tabPriorityOverrides: {},
      adaptationDescription: { he: "", en: "" },
      personalityProfile: { regulatoryFocus: "promotion", processingStyle: "systematic", coreMotivation: { he: "", en: "" } },
      prominentModules: [],
    },
    setOverride: vi.fn(),
    setAdaptationsEnabled: vi.fn(),
    markRevealSeen: vi.fn(),
    loading: false,
  }),
}));

vi.mock("@/hooks/useAdaptiveTheme", () => ({
  useAdaptiveTheme: vi.fn(),
}));

vi.mock("@/hooks/useOutreachEscalation", () => ({
  useOutreachEscalation: vi.fn(),
}));

vi.mock("@/components/AppSidebar", () => ({
  default: () => <div data-testid="app-sidebar">Sidebar</div>,
}));

vi.mock("@/components/AppTopBar", () => ({
  default: () => <div data-testid="app-top-bar">TopBar</div>,
}));

vi.mock("@/components/MobileTabBar", () => ({
  default: () => <div data-testid="mobile-tab-bar">MobileTabBar</div>,
}));

vi.mock("@/components/LoadingFallback", () => ({
  default: () => <div data-testid="loading-fallback">Loading...</div>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock("@/components/BlindSpotNudge", () => ({
  BlindSpotNudge: () => <div data-testid="blind-spot-nudge">BlindSpotNudge</div>,
}));

vi.mock("framer-motion", () => ({
  MotionConfig: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("AppShell", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );
    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
  });

  it("renders the top bar", () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );
    expect(screen.getByTestId("app-top-bar")).toBeInTheDocument();
  });

  it("renders the mobile tab bar", () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mobile-tab-bar")).toBeInTheDocument();
  });

  it("renders the footer", () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders skip-to-main link for accessibility", () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );
    expect(screen.getByText("Skip to main content")).toBeInTheDocument();
  });

  it("renders main content area with id", () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );
    expect(document.getElementById("main-content")).toBeInTheDocument();
  });
});
