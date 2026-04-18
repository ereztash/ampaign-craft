import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import IdentityStrip from "../IdentityStrip";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
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
    uiConfig: { label: { he: "אסטרטג", en: "Strategist" }, theme: "blue" },
    confidenceTier: "strong",
    loading: false,
    profile: { confidence: 0.9 },
    effectiveArchetypeId: "strategist",
  }),
}));

vi.mock("@/engine/weeklyLoopEngine", () => ({
  getStreak: vi.fn(() => 3),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("IdentityStrip", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <IdentityStrip />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the archetype label", () => {
    render(
      <MemoryRouter>
        <IdentityStrip />
      </MemoryRouter>,
    );
    expect(screen.getByText("Strategist")).toBeTruthy();
  });

  it("shows confidence tier label", () => {
    render(
      <MemoryRouter>
        <IdentityStrip />
      </MemoryRouter>,
    );
    expect(screen.getByText(/strong match/i)).toBeTruthy();
  });

  it("shows streak info", () => {
    render(
      <MemoryRouter>
        <IdentityStrip />
      </MemoryRouter>,
    );
    expect(screen.getByText(/3-week streak/i)).toBeTruthy();
  });

  it("shows correction button", () => {
    render(
      <MemoryRouter>
        <IdentityStrip />
      </MemoryRouter>,
    );
    expect(screen.getByText(/not me/i)).toBeTruthy();
  });

  it("navigates to /archetype when correction button is clicked", () => {
    render(
      <MemoryRouter>
        <IdentityStrip />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText(/not me/i));
    expect(mockNavigate).toHaveBeenCalledWith("/archetype");
  });
});
