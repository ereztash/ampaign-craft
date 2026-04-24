import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArchetypeRevealScreen from "../ArchetypeRevealScreen";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    effectiveArchetypeId: "strategist",
    confidenceTier: "strong",
    adaptationsEnabled: false,
    uiConfig: {
      label: { he: "האסטרטג", en: "The Strategist" },
    },
    markRevealSeen: vi.fn(),
    setAdaptationsEnabled: vi.fn(),
  }),
}));

vi.mock("@/lib/archetypeBlindSpots", () => ({
  getBlindSpotProfile: () => ({
    strength: { he: "חוזק", en: "Your strategic strength" },
    blindSpot: { he: "עיוורון", en: "Your blind spot pattern" },
  }),
}));

vi.mock("@/lib/archetypeAnalytics", () => ({
  emitArchetypeEvent: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

describe("ArchetypeRevealScreen", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <ArchetypeRevealScreen />
      </MemoryRouter>
    );
    expect(screen.getByText("Your Business Archetype")).toBeInTheDocument();
  });

  it("shows archetype label", () => {
    render(
      <MemoryRouter>
        <ArchetypeRevealScreen />
      </MemoryRouter>
    );
    expect(screen.getByText("The Strategist")).toBeInTheDocument();
  });

  it("shows strength section", () => {
    render(
      <MemoryRouter>
        <ArchetypeRevealScreen />
      </MemoryRouter>
    );
    expect(screen.getByText("Your strength in this context")).toBeInTheDocument();
    expect(screen.getByText("Your strategic strength")).toBeInTheDocument();
  });

  it("shows blind spot section", () => {
    render(
      <MemoryRouter>
        <ArchetypeRevealScreen />
      </MemoryRouter>
    );
    expect(screen.getByText("A pattern worth knowing")).toBeInTheDocument();
    expect(screen.getByText("Your blind spot pattern")).toBeInTheDocument();
  });

  it("shows accept adaptations button when not yet enabled", () => {
    render(
      <MemoryRouter>
        <ArchetypeRevealScreen />
      </MemoryRouter>
    );
    expect(screen.getByText("Adapt my workspace")).toBeInTheDocument();
  });

  it("shows keep default button", () => {
    render(
      <MemoryRouter>
        <ArchetypeRevealScreen />
      </MemoryRouter>
    );
    expect(screen.getByText("Keep the default experience")).toBeInTheDocument();
  });

  it("navigates back on decline", () => {
    render(
      <MemoryRouter>
        <ArchetypeRevealScreen />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Keep the default experience"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
