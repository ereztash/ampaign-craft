import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Plans from "../Plans";
import { safeStorage } from "@/lib/safeStorage";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

const mockedSafeStorage = vi.mocked(safeStorage);

describe("Plans — empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSafeStorage.getJSON.mockReturnValue([]);
    localStorage.clear();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Plans />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <Plans />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the My Plans heading", () => {
    render(
      <MemoryRouter>
        <Plans />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/my plans/i)).toBeInTheDocument();
  });

  it("shows empty state message when no plans exist", () => {
    render(
      <MemoryRouter>
        <Plans />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no plans yet/i)).toBeInTheDocument();
  });

  it("shows New Plan button", () => {
    render(
      <MemoryRouter>
        <Plans />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("button", { name: /new plan/i }).length).toBeGreaterThan(0);
  });
});

describe("Plans — with saved plans", () => {
  const mockPlans = [
    {
      id: "plan-1",
      name: "Ecommerce Strategy",
      savedAt: new Date().toISOString(),
      result: { formData: { businessField: "tech" }, stages: [], kpis: [] },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockedSafeStorage.getJSON.mockReturnValue(mockPlans as never);
  });

  it("shows plan name when plans exist", () => {
    render(
      <MemoryRouter>
        <Plans />
      </MemoryRouter>,
    );
    expect(screen.getByText("Ecommerce Strategy")).toBeInTheDocument();
  });
});
