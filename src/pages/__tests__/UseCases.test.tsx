import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UseCases from "../UseCases";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

describe("UseCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <UseCases />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows the main heading", () => {
    render(
      <MemoryRouter>
        <UseCases />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/success stories/i)).toBeInTheDocument();
  });

  it("shows the subheading description", () => {
    render(
      <MemoryRouter>
        <UseCases />
      </MemoryRouter>,
    );
    expect(screen.getByText(/real examples of strategies/i)).toBeInTheDocument();
  });

  it("renders all 6 use case cards", () => {
    render(
      <MemoryRouter>
        <UseCases />
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole("button", { name: /build a similar strategy/i });
    expect(buttons).toHaveLength(6);
  });

  it("shows the E-commerce use case", () => {
    render(
      <MemoryRouter>
        <UseCases />
      </MemoryRouter>,
    );
    expect(screen.getByText(/e-commerce/i)).toBeInTheDocument();
    expect(screen.getByText(/boosting shopify conversion rate/i)).toBeInTheDocument();
  });

  it("shows the SaaS use case", () => {
    render(
      <MemoryRouter>
        <UseCases />
      </MemoryRouter>,
    );
    expect(screen.getByText(/reducing b2b saas churn/i)).toBeInTheDocument();
  });

  it("shows the Local Business use case", () => {
    render(
      <MemoryRouter>
        <UseCases />
      </MemoryRouter>,
    );
    expect(screen.getByText(/local business/i)).toBeInTheDocument();
    expect(screen.getByText(/filling the calendar for spa/i)).toBeInTheDocument();
  });
});
