import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SalesEntry from "../SalesEntry";
import { getLatestPlanResult } from "@/lib/minimalFormDefaults";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/lib/minimalFormDefaults", () => ({
  getLatestPlanResult: vi.fn(() => null),
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

vi.mock("@/components/SalesTab", () => ({
  default: () => <div data-testid="sales-tab" />,
}));

vi.mock("@/components/ModuleNextStep", () => ({
  ModuleNextStep: () => <div data-testid="module-next-step" />,
}));

vi.mock("@/components/DidThisHelp", () => ({
  DidThisHelp: () => <div data-testid="did-this-help" />,
}));

vi.mock("@/components/ui/illustration", () => ({
  default: () => <div data-testid="illustration" />,
}));

describe("SalesEntry — no plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <SalesEntry />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <SalesEntry />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the gate state when no plan", () => {
    render(
      <MemoryRouter>
        <SalesEntry />
      </MemoryRouter>,
    );
    expect(screen.getByText(/personalized sales scripts/i)).toBeInTheDocument();
    expect(screen.getByText(/first build a marketing plan/i)).toBeInTheDocument();
  });

  it("shows Build Plan CTA button when no plan", () => {
    render(
      <MemoryRouter>
        <SalesEntry />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /build plan/i })).toBeInTheDocument();
  });
});

const mockedGetLatestPlanResult = vi.mocked(getLatestPlanResult);

describe("SalesEntry — with plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetLatestPlanResult.mockReturnValue({
      formData: { businessField: "tech", audienceType: "b2c" },
      stages: [],
      kpis: [],
    } as never);
  });

  it("renders the sales tab when plan exists", () => {
    render(
      <MemoryRouter>
        <SalesEntry />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sales-tab")).toBeInTheDocument();
  });
});
