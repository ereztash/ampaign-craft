import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ModulePipeline from "../ModulePipeline";

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

vi.mock("@/hooks/useModuleStatus", () => ({
  useModuleStatus: vi.fn(() => [
    {
      id: "differentiation",
      label: { he: "בידול", en: "Differentiation" },
      icon: "Crosshair",
      color: "text-amber-500",
      route: "/differentiate",
      completed: true,
    },
    {
      id: "marketing",
      label: { he: "שיווק", en: "Marketing" },
      icon: "BarChart3",
      color: "text-primary",
      route: "/wizard",
      completed: false,
    },
    {
      id: "sales",
      label: { he: "מכירות", en: "Sales" },
      icon: "TrendingUp",
      color: "text-accent",
      route: "/sales",
      completed: false,
    },
    {
      id: "pricing",
      label: { he: "תמחור", en: "Pricing" },
      icon: "DollarSign",
      color: "text-emerald-500",
      route: "/pricing",
      completed: false,
    },
    {
      id: "retention",
      label: { he: "שימור", en: "Retention" },
      icon: "Heart",
      color: "text-pink-500",
      route: "/retention",
      completed: false,
    },
  ]),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("ModulePipeline", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <ModulePipeline />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows all 5 module labels", () => {
    render(
      <MemoryRouter>
        <ModulePipeline />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("Differentiation")[0]).toBeTruthy();
    expect(screen.getAllByText("Marketing")[0]).toBeTruthy();
    expect(screen.getAllByText("Sales")[0]).toBeTruthy();
    expect(screen.getAllByText("Pricing")[0]).toBeTruthy();
    expect(screen.getAllByText("Retention")[0]).toBeTruthy();
  });

  it("shows Complete badge for completed module", () => {
    render(
      <MemoryRouter>
        <ModulePipeline />
      </MemoryRouter>,
    );
    expect(screen.getByText("Complete")).toBeTruthy();
  });

  it("shows Start badges for incomplete modules", () => {
    render(
      <MemoryRouter>
        <ModulePipeline />
      </MemoryRouter>,
    );
    const startBadges = screen.getAllByText("Start");
    expect(startBadges.length).toBe(4);
  });

  it("navigates when a module card is clicked", () => {
    render(
      <MemoryRouter>
        <ModulePipeline />
      </MemoryRouter>,
    );
    const cards = screen.getAllByRole("button");
    fireEvent.click(cards[0]);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("shows flow labels when showLabels is true", () => {
    render(
      <MemoryRouter>
        <ModulePipeline showLabels={true} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/feeds hooks/i)).toBeTruthy();
  });

  it("hides flow labels when showLabels is false", () => {
    render(
      <MemoryRouter>
        <ModulePipeline showLabels={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/feeds hooks/i)).toBeNull();
  });
});
