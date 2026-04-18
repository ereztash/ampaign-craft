import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DifferentiationWizard from "../DifferentiationWizard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/engine/differentiationPhases", () => ({
  PHASES: [
    {
      id: "identity",
      number: 1,
      title: { he: "זהות", en: "Identity" },
      description: { he: "תיאור", en: "Describe your business" },
      color: "#f59e0b",
      aiEnrichment: false,
      questions: [
        {
          id: "businessName",
          type: "text",
          label: { he: "שם עסק", en: "Business Name" },
          required: true,
        },
      ],
    },
    {
      id: "synthesis",
      number: 2,
      title: { he: "סינתזה", en: "Synthesis" },
      description: { he: "סינתזה סופית", en: "Final synthesis" },
      color: "#8b5cf6",
      aiEnrichment: true,
      questions: [],
    },
  ],
}));

vi.mock("@/engine/differentiationEngine", () => ({
  generateDifferentiation: vi.fn(() => ({ differentiationStrength: 80 })),
}));

vi.mock("@/lib/differentiationFormRules", () => ({
  canProceedPhase: vi.fn(() => true),
  getPhaseColor: vi.fn(() => "#f59e0b"),
}));

vi.mock("@/components/DifferentiationPhaseCard", () => ({
  default: ({ questions }: { questions: { label: { en: string } }[] }) => (
    <div data-testid="phase-card">
      {questions.map((q, i) => (
        <span key={i}>{q.label.en}</span>
      ))}
    </div>
  ),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
  },
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

describe("DifferentiationWizard", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <DifferentiationWizard onComplete={vi.fn()} onBack={vi.fn()} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the first phase title", () => {
    render(<DifferentiationWizard onComplete={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Identity")).toBeTruthy();
  });

  it("renders phase card", () => {
    render(<DifferentiationWizard onComplete={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByTestId("phase-card")).toBeTruthy();
  });

  it("shows Back button on first phase", () => {
    render(<DifferentiationWizard onComplete={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("button", { name: /diffBack/i })).toBeTruthy();
  });

  it("calls onBack when back button is pressed on phase 0", () => {
    const onBack = vi.fn();
    render(<DifferentiationWizard onComplete={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /diffBack/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows progress bar", () => {
    const { container } = render(
      <DifferentiationWizard onComplete={vi.fn()} onBack={vi.fn()} />,
    );
    // Progress is rendered as role="progressbar" or a div with a value
    expect(container.querySelector("[role='progressbar'], [aria-valuenow]") || container.querySelector(".h-1\\.5")).toBeTruthy();
  });

  it("shows Next button when canProceed is true", () => {
    render(<DifferentiationWizard onComplete={vi.fn()} onBack={vi.fn()} />);
    // Next button text uses t("diffNext") which returns "diffNext" from mock
    expect(screen.getByRole("button", { name: /diffNext/i })).toBeTruthy();
  });
});
