import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PricingWizardResults from "../PricingWizardResults";
import type { PricingWizardRecommendation } from "@/engine/pricingWizardEngine";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

vi.mock("@/lib/userStateClassifier", () => ({
  getPersistedUserState: () => "ready" as const,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

const mockRec: PricingWizardRecommendation = {
  charmPrice: 497,
  acceptableRange: { low: 300, high: 700 },
  anchorPrice: 800,
  differentiationPremium: 0.15,
  hormoziScore: 7.5,
  psmOPP: 497,
  rationale: { he: "הסבר", en: "This price is optimal" },
  dailyBreakdown: { he: "₪16/יום", en: "₪16/day" },
  primaryFrame: { he: "מסגור ראשי", en: "Primary framing text" },
  costOfInactionFrame: { he: "עלות אי-פעולה", en: "Cost of inaction text" },
  tiers: [
    { role: "decoy", name: { he: "בסיס", en: "Basic" }, price: 197, annualPrice: 147, isPrimary: false },
    { role: "primary", name: { he: "פרו", en: "Pro" }, price: 497, annualPrice: 397, isPrimary: true },
    { role: "premium", name: { he: "עסקי", en: "Business" }, price: 997, annualPrice: 797, isPrimary: false },
  ],
  ltv: 5964,
  recommendedCAC: 1988,
  customersNeeded: 0,
};

describe("PricingWizardResults", () => {
  it("renders without crashing", () => {
    expect(() => render(<PricingWizardResults rec={mockRec} />)).not.toThrow();
  });

  it("shows the charm price", () => {
    render(<PricingWizardResults rec={mockRec} />);
    expect(screen.getAllByText("₪497")[0]).toBeInTheDocument();
  });

  it("shows Recommended price in InsightActionCard answer", () => {
    render(<PricingWizardResults rec={mockRec} />);
    expect(screen.getByText(/Recommended price/i)).toBeInTheDocument();
  });

  it("shows Calculation details section", () => {
    render(<PricingWizardResults rec={mockRec} />);
    expect(screen.getByText(/Calculation details/i)).toBeInTheDocument();
  });

  it("shows 3 Price Tiers section", () => {
    render(<PricingWizardResults rec={mockRec} />);
    expect(screen.getByText(/3 Price Tiers/i)).toBeInTheDocument();
  });

  it("shows all tier names", () => {
    render(<PricingWizardResults rec={mockRec} />);
    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
  });

  it("shows Recommended badge on primary tier", () => {
    render(<PricingWizardResults rec={mockRec} />);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("shows How to talk about the price section", () => {
    render(<PricingWizardResults rec={mockRec} />);
    expect(screen.getByText(/How to talk about the price/i)).toBeInTheDocument();
  });
});
