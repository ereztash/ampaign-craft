import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChurnPredictionCard } from "../ChurnPredictionCard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
  }),
}));

const mockAssessment = {
  riskTier: "watch" as const,
  riskScore: 45,
  nrrProjection: {
    current: 95,
    withIntervention: 108,
    improvement: 13,
  },
  signals: [
    {
      signal: "Low engagement",
      severity: "medium" as const,
      description: { he: "מעורבות נמוכה", en: "Customer engagement is below threshold" },
    },
  ],
  interventions: [
    {
      stage: 1,
      channel: "email",
      timing: "Day 7",
      action: { he: "פעולה", en: "Send re-engagement email" },
      template: { he: "תבנית", en: "Hi, we miss you!" },
    },
  ],
  retentionPlaybook: [
    { he: "טיפ", en: "Offer a discount to at-risk customers" },
  ],
};

describe("ChurnPredictionCard", () => {
  it("renders without crashing", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("Churn Prediction")).toBeInTheDocument();
  });

  it("shows the risk tier badge", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("Watch")).toBeInTheDocument();
  });

  it("shows the risk score in circle", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("shows NRR projection label", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("NRR Projection")).toBeInTheDocument();
  });

  it("shows current NRR value", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("shows with-intervention NRR", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("108%")).toBeInTheDocument();
  });

  it("shows risk signals", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("Risk Signals")).toBeInTheDocument();
    expect(screen.getByText("Customer engagement is below threshold")).toBeInTheDocument();
  });

  it("shows intervention plan collapsible trigger", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("Intervention Plan (3 Stages)")).toBeInTheDocument();
  });

  it("shows retention playbook", () => {
    render(<ChurnPredictionCard assessment={mockAssessment} />);
    expect(screen.getByText("Retention Playbook")).toBeInTheDocument();
    expect(screen.getByText(/Offer a discount to at-risk customers/)).toBeInTheDocument();
  });
});
