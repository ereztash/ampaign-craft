import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GlossaryTooltip from "../GlossaryTooltip";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/lib/glossary", () => ({
  getGlossaryTerm: vi.fn((key: string) => {
    if (key === "cac") {
      return {
        term: { he: "עלות רכישת לקוח", en: "Customer Acquisition Cost" },
        definition: { he: "עלות לרכישת לקוח חדש", en: "Cost to acquire a new customer" },
        example: { he: "לדוגמה: ₪500", en: "e.g. $500" },
      };
    }
    return null;
  }),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

// Tooltip requires TooltipProvider in the tree
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

describe("GlossaryTooltip", () => {
  it("renders without crashing for a known term", () => {
    const { container } = render(<GlossaryTooltip termKey="cac" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders nothing for an unknown term", () => {
    const { container } = render(<GlossaryTooltip termKey="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows a help icon button for known term", () => {
    render(<GlossaryTooltip termKey="cac" />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("shows term name in tooltip content", () => {
    render(<GlossaryTooltip termKey="cac" />);
    expect(screen.getByText("Customer Acquisition Cost")).toBeTruthy();
  });

  it("shows definition in tooltip content", () => {
    render(<GlossaryTooltip termKey="cac" />);
    expect(screen.getByText("Cost to acquire a new customer")).toBeTruthy();
  });

  it("shows example when available", () => {
    render(<GlossaryTooltip termKey="cac" />);
    expect(screen.getByText("e.g. $500")).toBeTruthy();
  });
});
