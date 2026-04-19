import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MobileTabBar from "../MobileTabBar";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (k: string) => k,
    isRTL: false,
    setLanguage: vi.fn(),
  }),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("MobileTabBar", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("has nav role with mobile label", () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>,
    );
    // aria-label uses t("navMobileLabel") which returns "navMobileLabel"
    expect(screen.getByRole("navigation", { name: "navMobileLabel" })).toBeTruthy();
  });

  it("renders 5 navigation items", () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(5);
  });

  it("shows Command Center nav item", () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>,
    );
    // t("navCommandCenter") returns "navCommandCenter"
    expect(screen.getByText("navCommandCenter")).toBeTruthy();
  });

  it("shows Data Sources nav item", () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>,
    );
    expect(screen.getByText("navDataSources")).toBeTruthy();
  });

  it("shows Strategy Canvas nav item", () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>,
    );
    expect(screen.getByText("navStrategyCanvas")).toBeTruthy();
  });

  it("shows AI Coach nav item", () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>,
    );
    expect(screen.getByText("navAiCoach")).toBeTruthy();
  });

  it("shows Saved Plans nav item", () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>,
    );
    expect(screen.getByText("navSavedPlans")).toBeTruthy();
  });
});
