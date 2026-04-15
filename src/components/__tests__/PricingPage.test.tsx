import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PricingPage from "../PricingPage";

// Mock LanguageContext
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (key: string) => key, isRtl: false }),
}));

describe("PricingPage", () => {
  it("renders all 3 tiers", () => {
    render(<PricingPage />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
  });

  it("shows prices", () => {
    render(<PricingPage />);
    expect(screen.getByText("₪0")).toBeInTheDocument();
    // Price and billing suffix are rendered in separate elements
    expect(screen.getByText("₪99")).toBeInTheDocument();
    expect(screen.getByText("₪249")).toBeInTheDocument();
  });

  it("highlights current tier", () => {
    render(<PricingPage currentTier="pro" />);
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
  });

  it("shows Most Popular badge on Pro", () => {
    render(<PricingPage />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("calls onSelectTier when clicking upgrade", () => {
    const onSelect = vi.fn();
    render(<PricingPage onSelectTier={onSelect} />);
    // Pro and Business tiers have a free trial, so the CTA reads "Start Free Trial"
    const upgradeButtons = screen.getAllByText("Start Free Trial");
    fireEvent.click(upgradeButtons[0]);
    expect(onSelect).toHaveBeenCalled();
  });

  it("disables button for current tier", () => {
    render(<PricingPage currentTier="free" />);
    const currentBtn = screen.getByText("Current Plan");
    expect(currentBtn.closest("button")).toBeDisabled();
  });
});
