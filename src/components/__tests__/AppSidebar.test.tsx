import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppSidebar from "../AppSidebar";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
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
    confidenceTier: "none",
    uiConfig: {
      label: { he: "האסטרטג", en: "Strategist" },
      ctaTone: "direct",
      informationDensity: "high",
      defaultTab: "analytics",
      workspaceOrder: ["command", "data", "strategy"],
      modulesOrder: ["differentiate", "wizard", "sales", "pricing", "retention"],
      tabPriorityOverrides: {},
      adaptationDescription: { he: "", en: "" },
      personalityProfile: { regulatoryFocus: "promotion", processingStyle: "systematic", coreMotivation: { he: "", en: "" } },
      prominentModules: [],
    },
    setAdaptationsEnabled: vi.fn(),
    profile: { overrideByUser: null },
    loading: false,
  }),
}));

vi.mock("@/lib/archetypeUIConfig", () => ({
  reorderNavItems: vi.fn((items: string[]) => items),
}));

vi.mock("@/lib/validateEnv", () => ({
  HIDE_INCOMPLETE: false,
}));

vi.mock("@/components/AdminArchetypeDebugPanel", () => ({
  default: () => <div data-testid="admin-debug-panel" />,
}));

describe("AppSidebar", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );
    expect(document.querySelector("[role='navigation']")).toBeInTheDocument();
  });

  it("shows workspace navigation items", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );
    expect(screen.getByText("navCommandCenter")).toBeInTheDocument();
    expect(screen.getByText("navDataSources")).toBeInTheDocument();
  });

  it("shows module navigation items", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );
    expect(screen.getByText("navDifferentiate")).toBeInTheDocument();
  });

  it("shows profile link in footer", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );
    expect(screen.getByText("navProfile")).toBeInTheDocument();
  });

  it("does not show admin panel for regular user", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );
    expect(screen.queryByText("Archetype Panel")).not.toBeInTheDocument();
  });

  it("does not show personalisation toggle below confident tier", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );
    expect(screen.queryByText("Adaptations on")).not.toBeInTheDocument();
    expect(screen.queryByText("Personalise workspace")).not.toBeInTheDocument();
  });
});
