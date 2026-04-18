import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ExpressWizard from "../ExpressWizard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (k: string) => k,
    isRTL: false,
    setLanguage: vi.fn(),
  }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/lib/smartDefaults", () => ({
  getSmartDefaults: vi.fn((field: string, goal: string) => ({
    businessField: field,
    mainGoal: goal,
    audienceType: "B2C",
    budgetRange: "medium",
    salesModel: "direct",
    productDescription: "",
    averagePrice: "",
  })),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("ExpressWizard", () => {
  it("renders without crashing", () => {
    const { container } = render(<ExpressWizard onComplete={vi.fn()} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the field selection prompt", () => {
    render(<ExpressWizard onComplete={vi.fn()} />);
    expect(screen.getByText("What's your field?")).toBeTruthy();
  });

  it("shows the goal selection prompt", () => {
    render(<ExpressWizard onComplete={vi.fn()} />);
    expect(screen.getByText("What's your main goal?")).toBeTruthy();
  });

  it("Generate button is disabled when no field or goal selected", () => {
    render(<ExpressWizard onComplete={vi.fn()} />);
    expect(screen.getByText(/generate instant plan/i).closest("button")).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("Generate button becomes enabled after selecting field and goal", () => {
    render(<ExpressWizard onComplete={vi.fn()} />);
    // Field keys are used as labels via t() which returns the key itself
    fireEvent.click(screen.getByText("fieldTech"));
    fireEvent.click(screen.getByText("goalLeads"));
    const btn = screen.getByText(/generate instant plan/i).closest("button");
    expect(btn).not.toHaveProperty("disabled", true);
  });

  it("calls onComplete with form data when Generate is clicked", () => {
    const onComplete = vi.fn();
    render(<ExpressWizard onComplete={onComplete} />);
    fireEvent.click(screen.getByText("fieldTech"));
    fireEvent.click(screen.getByText("goalSales"));
    fireEvent.click(screen.getByText(/generate instant plan/i));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ businessField: "tech", mainGoal: "sales" }),
    );
  });

  it("shows auto-select info text after selecting both", () => {
    render(<ExpressWizard onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("fieldFashion"));
    fireEvent.click(screen.getByText("goalAwareness"));
    expect(screen.getByText(/auto-selected/i)).toBeTruthy();
  });
});
