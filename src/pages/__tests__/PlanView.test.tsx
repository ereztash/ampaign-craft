import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlanView from "../PlanView";
import { safeStorage } from "@/lib/safeStorage";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ planId: "nonexistent-plan" }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/components/ResultsDashboard", () => ({
  default: () => <div data-testid="results-dashboard" />,
}));

const mockedSafeStorage = vi.mocked(safeStorage);

describe("PlanView — plan not found", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSafeStorage.getJSON.mockReturnValue([]);
    localStorage.clear();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <PlanView />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows plan not found state when planId does not match", () => {
    render(
      <MemoryRouter>
        <PlanView />
      </MemoryRouter>,
    );
    expect(screen.getByText(/plan not found/i)).toBeInTheDocument();
  });

  it("shows Back to Plans button in not found state", () => {
    render(
      <MemoryRouter>
        <PlanView />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /back to plans/i })).toBeInTheDocument();
  });
});

describe("PlanView — plan in storage but id mismatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Storage has plans, but none match "nonexistent-plan" from useParams mock
    mockedSafeStorage.getJSON.mockReturnValue([
      {
        id: "other-plan",
        name: "Other Plan",
        savedAt: new Date().toISOString(),
        result: { formData: { businessField: "tech" }, stages: [], kpis: [] },
      },
    ] as never);
  });

  it("still shows plan not found when ids do not match", () => {
    render(
      <MemoryRouter>
        <PlanView />
      </MemoryRouter>,
    );
    expect(screen.getByText(/plan not found/i)).toBeInTheDocument();
  });
});
