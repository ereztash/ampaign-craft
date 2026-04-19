import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ModuleNextStep } from "../ModuleNextStep";

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

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("ModuleNextStep", () => {
  it("renders without crashing for module 1", () => {
    const { container } = render(
      <MemoryRouter>
        <ModuleNextStep current={1} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows next module label for module 1 → 2", () => {
    render(
      <MemoryRouter>
        <ModuleNextStep current={1} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/marketing/i)[0]).toBeTruthy();
  });

  it("shows transition heading for module 1", () => {
    render(
      <MemoryRouter>
        <ModuleNextStep current={1} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/positioning ready/i)).toBeTruthy();
  });

  it("shows CTA button for module 1", () => {
    render(
      <MemoryRouter>
        <ModuleNextStep current={1} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /build marketing plan/i })).toBeTruthy();
  });

  it("navigates to /wizard when CTA clicked from module 1", () => {
    render(
      <MemoryRouter>
        <ModuleNextStep current={1} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /build marketing plan/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/wizard");
  });

  it("shows completion celebration for module 5", () => {
    render(
      <MemoryRouter>
        <ModuleNextStep current={5} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/all 5 modules complete/i)).toBeTruthy();
  });

  it("shows Command Center and New Plan buttons on completion", () => {
    render(
      <MemoryRouter>
        <ModuleNextStep current={5} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/back to command center/i)).toBeTruthy();
    expect(screen.getByText(/new plan/i)).toBeTruthy();
  });

  it("shows pipeline dots container", () => {
    const { container } = render(
      <MemoryRouter>
        <ModuleNextStep current={2} />
      </MemoryRouter>,
    );
    // Pipeline dots container has aria-label "Step 2 of 5"
    const dotsDiv = container.querySelector('[aria-label*="Step 2"]');
    expect(dotsDiv).toBeTruthy();
  });
});
