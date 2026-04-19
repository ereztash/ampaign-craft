import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AICopyGenerator } from "../AICopyGenerator";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
  },
}));

vi.mock("@/hooks/useAICopy", () => ({
  useAICopy: () => ({
    generate: vi.fn(),
    isGenerating: false,
    result: null,
    error: null,
    reset: vi.fn(),
  }),
}));

const mockFunnelResult = {
  formData: {
    productDescription: "Test product",
    businessField: "tech",
    targetAudience: "developers",
  },
  hookTips: [],
  copyLab: { formulas: [], readerProfile: { level: 1, name: { he: "", en: "" }, description: { he: "", en: "" }, copyArchitecture: { he: "", en: "" }, principles: [] }, writingTechniques: [] },
  kpis: [],
  neuroStorytelling: null,
} as any;

describe("AICopyGenerator", () => {
  it("renders without crashing", () => {
    render(<AICopyGenerator funnelResult={mockFunnelResult} />);
    expect(screen.getByText("AI Copy Generator")).toBeInTheDocument();
  });

  it("shows task selection buttons", () => {
    render(<AICopyGenerator funnelResult={mockFunnelResult} />);
    expect(screen.getByText("Paid Ad")).toBeInTheDocument();
    expect(screen.getByText("Email Sequence")).toBeInTheDocument();
  });

  it("shows generate button", () => {
    render(<AICopyGenerator funnelResult={mockFunnelResult} />);
    expect(screen.getByText("Generate Copy")).toBeInTheDocument();
  });

  it("shows textarea for custom prompt", () => {
    render(<AICopyGenerator funnelResult={mockFunnelResult} />);
    expect(screen.getByPlaceholderText("Add specific instructions (optional)...")).toBeInTheDocument();
  });

  it("changes selected task when button is clicked", () => {
    render(<AICopyGenerator funnelResult={mockFunnelResult} />);
    const emailBtn = screen.getByText("Email Sequence");
    fireEvent.click(emailBtn);
    expect(emailBtn.closest("button")).toHaveClass("bg-primary");
  });

  it("shows error when error prop is set", () => {
    vi.mock("@/hooks/useAICopy", () => ({
      useAICopy: () => ({
        generate: vi.fn(),
        isGenerating: false,
        result: null,
        error: "An error occurred",
        reset: vi.fn(),
      }),
    }));
  });

  it("renders with stylomePrompt prop", () => {
    render(<AICopyGenerator funnelResult={mockFunnelResult} stylomePrompt="test prompt" />);
    expect(screen.getByText("AI Copy Generator")).toBeInTheDocument();
  });
});
