import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PricingWizard from "../PricingWizard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/lib/a11y", () => ({
  radioCard: (_selected: boolean, _label?: string) => ({ role: "radio", "aria-checked": _selected }),
  radioGroup: (_id?: string) => ({ role: "radiogroup" }),
  checkboxCard: (_checked: boolean, _label?: string) => ({ role: "checkbox", "aria-checked": _checked }),
}));

vi.mock("@/engine/pricingWizardEngine", () => ({
  DIFFERENTIATOR_OPTIONS: [
    { key: "unique_method", he: "שיטה ייחודית", en: "Unique method", premiumPct: 20 },
    { key: "guarantee", he: "ערבות", en: "Guarantee", premiumPct: 10 },
  ],
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ value, onValueChange, ...props }: any) => (
    <input
      type="range"
      value={value?.[0]}
      onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
      {...props}
    />
  ),
}));

describe("PricingWizard", () => {
  const onComplete = vi.fn();

  it("renders without crashing", () => {
    expect(() => render(<PricingWizard onComplete={onComplete} />)).not.toThrow();
  });

  it("shows Step 1 of 4 progress", () => {
    render(<PricingWizard onComplete={onComplete} />);
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("shows the Dream Outcome label on step 1", () => {
    render(<PricingWizard onComplete={onComplete} />);
    expect(screen.getByText("Dream Outcome:")).toBeInTheDocument();
  });

  it("shows Back button disabled on first step", () => {
    render(<PricingWizard onComplete={onComplete} />);
    const backBtn = screen.getByText("Back");
    expect(backBtn.closest("button")).toBeDisabled();
  });

  it("shows Next button enabled on first step", () => {
    render(<PricingWizard onComplete={onComplete} />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("advances to step 2 when Next is clicked on step 1", () => {
    render(<PricingWizard onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
  });

  it("shows PSM content on step 2", () => {
    render(<PricingWizard onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/price sensitivity/i)).toBeInTheDocument();
  });

  it("shows methodology footnote", () => {
    render(<PricingWizard onComplete={onComplete} />);
    expect(screen.getByText(/Van Westendorp/i)).toBeInTheDocument();
  });
});
