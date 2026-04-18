import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BackToHub from "../BackToHub";

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

vi.mock("@/hooks/useModuleStatus", () => ({
  useModuleStatus: () => [
    { id: "differentiation", route: "/differentiate", label: { he: "בידול", en: "Differentiation" }, completed: true },
    { id: "marketing", route: "/wizard", label: { he: "שיווק", en: "Marketing" }, completed: false },
    { id: "sales", route: "/sales", label: { he: "מכירות", en: "Sales" }, completed: false },
  ],
}));

describe("BackToHub", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BackToHub />
      </MemoryRouter>
    );
    expect(screen.getByText("navCommandCenter")).toBeInTheDocument();
  });

  it("shows current page name when provided", () => {
    render(
      <MemoryRouter initialEntries={["/wizard"]}>
        <BackToHub currentPage="Marketing Wizard" />
      </MemoryRouter>
    );
    expect(screen.getByText("Marketing Wizard")).toBeInTheDocument();
  });

  it("navigates to home on button click", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BackToHub />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("navCommandCenter"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("shows prev/next module navigation on module page", () => {
    render(
      <MemoryRouter initialEntries={["/wizard"]}>
        <BackToHub currentPage="Marketing" />
      </MemoryRouter>
    );
    // /wizard is index 1 in modules, so prev = Differentiation
    expect(screen.getByText("Differentiation")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("shows position indicator", () => {
    render(
      <MemoryRouter initialEntries={["/wizard"]}>
        <BackToHub currentPage="Marketing" />
      </MemoryRouter>
    );
    expect(screen.getByText("(2/3)")).toBeInTheDocument();
  });

  it("has nav landmark", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BackToHub />
      </MemoryRouter>
    );
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
