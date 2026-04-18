import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DifferentiationTranscriptWizard from "../DifferentiationTranscriptWizard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({ profile: { unifiedProfile: null } }),
}));

vi.mock("@/types/profile", () => ({
  toDifferentiationPrefill: vi.fn(() => null),
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
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/engine/differentiation/conversationStages", () => ({
  STAGES: [],
  detectStagesInTranscript: vi.fn(() => ({
    coverage: 0.5,
    detectedStages: [],
    criticalMissing: [],
  })),
}));

vi.mock("@/engine/differentiation/principles", () => ({
  PRINCIPLES: [],
  aggregatePrincipleOutputs: vi.fn(),
}));

vi.mock("@/engine/differentiation/principleAgents", () => ({
  runPrincipleScan: vi.fn(() =>
    Promise.resolve({
      outputs: [],
      convergence: { convergence: "weak", strongSignals: [] },
    }),
  ),
}));

vi.mock("@/engine/differentiation/transcriptIO", () => ({
  readFileAsText: vi.fn(() => Promise.resolve("transcript text")),
  downloadDifferentiationMarkdown: vi.fn(),
  downloadPlanStage1Markdown: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("DifferentiationTranscriptWizard", () => {
  it("renders without crashing", () => {
    const { container } = render(<DifferentiationTranscriptWizard onBack={vi.fn()} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows step 1 label by default", () => {
    render(<DifferentiationTranscriptWizard onBack={vi.fn()} />);
    expect(screen.getByText("Client Intake")).toBeTruthy();
  });

  it("renders client name input in step 1", () => {
    render(<DifferentiationTranscriptWizard onBack={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Business \/ client name/i)).toBeTruthy();
  });

  it("renders differentiation status buttons", () => {
    render(<DifferentiationTranscriptWizard onBack={vi.fn()} />);
    expect(screen.getByText("None")).toBeTruthy();
    expect(screen.getByText("Weak")).toBeTruthy();
    expect(screen.getByText("Strong")).toBeTruthy();
  });

  it("Continue button is disabled when step 1 is invalid", () => {
    render(<DifferentiationTranscriptWizard onBack={vi.fn()} />);
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toHaveProperty("disabled", true);
  });

  it("calls onBack when Back button is clicked on step 1", () => {
    const onBack = vi.fn();
    render(<DifferentiationTranscriptWizard onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("advances to step 2 when step 1 is valid and Continue is clicked", () => {
    render(<DifferentiationTranscriptWizard onBack={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Business \/ client name/i), {
      target: { value: "TestCo" },
    });
    // Select a status so step is valid
    fireEvent.click(screen.getByText("None"));
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);
    expect(screen.getByText("Session Upload")).toBeTruthy();
  });

  it("shows step progress indicators", () => {
    render(<DifferentiationTranscriptWizard onBack={vi.fn()} />);
    // Step labels are rendered in the indicator row
    const stepNumbers = screen.getAllByText("1");
    expect(stepNumbers.length).toBeGreaterThan(0);
  });
});
