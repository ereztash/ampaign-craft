import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BusinessDNACard from "../BusinessDNACard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/engine/businessFingerprintEngine", () => ({
  DIMENSION_LABELS: {
    priceComplexity: { he: "מורכבות מחיר", en: "Price Complexity" },
    salesCycleLength: { he: "אורך מחזור מכירות", en: "Sales Cycle Length" },
    competitiveIntensity: { he: "עוצמת תחרות", en: "Competitive Intensity" },
    customerLifetimeValue: { he: "ערך לקוח לאורך זמן", en: "Customer LTV" },
    acquisitionComplexity: { he: "מורכבות רכישה", en: "Acquisition Complexity" },
    brandDependency: { he: "תלות מותג", en: "Brand Dependency" },
  },
  ARCHETYPE_LABELS: {
    "volume-value": { he: "נפח-ערך", en: "Volume-Value" },
    "premium-niche": { he: "פרמיום-נישה", en: "Premium-Niche" },
    "network-platform": { he: "רשת-פלטפורמה", en: "Network-Platform" },
    "service-trust": { he: "שירות-אמון", en: "Service-Trust" },
  },
}));

const mockFingerprint = {
  archetype: "volume-value",
  marketMode: "b2c",
  growthStage: "growth",
  dimensions: {
    priceComplexity: 0.4,
    salesCycleLength: 0.3,
    competitiveIntensity: 0.7,
    customerLifetimeValue: 0.5,
    acquisitionComplexity: 0.6,
    brandDependency: 0.2,
  },
} as any;

describe("BusinessDNACard", () => {
  it("renders without crashing", () => {
    render(<BusinessDNACard fingerprint={mockFingerprint} />);
    expect(screen.getByText("Your Business DNA")).toBeInTheDocument();
  });

  it("shows archetype badge", () => {
    render(<BusinessDNACard fingerprint={mockFingerprint} />);
    expect(screen.getByText("Volume-Value")).toBeInTheDocument();
  });

  it("shows market mode badge", () => {
    render(<BusinessDNACard fingerprint={mockFingerprint} />);
    expect(screen.getByText("B2C")).toBeInTheDocument();
  });

  it("shows growth stage badge", () => {
    render(<BusinessDNACard fingerprint={mockFingerprint} />);
    expect(screen.getByText("Growth")).toBeInTheDocument();
  });

  it("renders radar chart in full mode", () => {
    render(<BusinessDNACard fingerprint={mockFingerprint} />);
    // SVG radar chart should be present
    const svg = document.querySelector("svg[viewBox='0 0 200 200']");
    expect(svg).toBeInTheDocument();
  });

  it("renders compact grid instead of radar when compact=true", () => {
    render(<BusinessDNACard fingerprint={mockFingerprint} compact />);
    expect(screen.getByText("Price Complexity")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    // No SVG radar
    const svg = document.querySelector("svg[viewBox='0 0 200 200']");
    expect(svg).not.toBeInTheDocument();
  });
});
