import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RetentionGrowthTab from "../RetentionGrowthTab";
import type { FunnelResult } from "@/types/funnel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));
vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({ derived: { coldStartMode: false } })),
}));

vi.mock("@/engine/churnPredictionEngine", () => ({
  assessChurnRisk: vi.fn(() => ({
    riskLevel: "low",
    riskScore: 20,
    signals: [],
    interventions: [],
    label: { he: "סיכון נמוך", en: "Low Risk" },
  })),
}));

vi.mock("@/components/ChurnPredictionCard", () => ({
  ChurnPredictionCard: () => <div data-testid="churn-prediction-card" />,
}));

vi.mock("@/engine/retentionGrowthEngine", () => ({
  generateRetentionStrategy: vi.fn(() => ({
    projectedImpact: {
      projectedChurnReduction: 25,
      ltvMultiplier: 2.5,
      additionalRevenue: { he: "הכנסה נוספת של ₪5000", en: "Additional revenue of ₪5000" },
    },
    onboarding: {
      type: "high-touch",
      timeToValue: "3 days",
      steps: [
        {
          day: 1,
          emoji: "🚀",
          name: { he: "ברוך הבא", en: "Welcome" },
          channel: "email",
          template: { he: "שלום", en: "Hello, welcome!" },
          goal: { he: "הפעלה", en: "Activation" },
        },
      ],
      ahaMetric: { he: "מדד הצלחה", en: "First value moment" },
    },
    churnPlaybook: {
      signals: [
        {
          signal: { he: "אין כניסה 7 ימים", en: "No login in 7 days" },
          risk: "high",
          intervention: { he: "שלח מייל", en: "Send re-engagement email" },
        },
      ],
      saveOffers: [{ he: "הצעה מיוחדת", en: "Special retention offer" }],
    },
    referralBlueprint: {
      label: { he: "תוכנית הפניות", en: "Referral Program" },
      mechanics: { he: "מנגנון", en: "Mechanics description" },
      reward: { he: "חודש חינם", en: "1 month free" },
      bestTiming: { he: "אחרי חודש", en: "After first month" },
      template: { he: "שתף חבר", en: "Refer a friend template" },
    },
    growthLoop: {
      label: { he: "לולאת צמיחה", en: "Growth Loop" },
      description: { he: "תיאור", en: "Growth loop description" },
      steps: [{ he: "שלב 1", en: "Step 1" }, { he: "שלב 2", en: "Step 2" }],
      kFactor: "1.3",
    },
    loyaltyStrategy: {
      label: { he: "אסטרטגיית נאמנות", en: "Loyalty Strategy" },
      recommendation: { he: "המלצה", en: "Loyalty recommendation" },
      tiers: [
        { name: { he: "כסף", en: "Silver" }, threshold: "0-500", benefit: { he: "5% הנחה", en: "5% discount" } },
        { name: { he: "זהב", en: "Gold" }, threshold: "500+", benefit: { he: "10% הנחה", en: "10% discount" } },
      ],
    },
    triggerMap: [
      {
        emoji: "🎂",
        trigger: { he: "יום הולדת", en: "Birthday" },
        timing: { he: "יום לפני", en: "Day before" },
        action: { he: "שלח ברכה", en: "Send greeting" },
        channel: "WhatsApp",
      },
    ],
  })),
}));

vi.mock("@/components/ChurnPlaybookTab", () => ({
  default: () => <div data-testid="churn-playbook-tab" />,
}));

const mockResult: FunnelResult = {
  id: "r1",
  formData: { businessField: "tech", audienceType: "b2c" } as any,
  funnelName: { he: "תוכנית", en: "Plan" },
  totalBudget: { min: 5000, max: 10000 },
  stages: [],
  kpis: [],
  overallTips: [],
  copyLab: null,
  personalBrand: null,
} as any;

describe("RetentionGrowthTab", () => {
  it("renders without crashing", () => {
    expect(() => render(<RetentionGrowthTab result={mockResult} />)).not.toThrow();
  });

  it("shows Retention tab trigger", () => {
    render(<RetentionGrowthTab result={mockResult} />);
    expect(screen.getByText("Retention")).toBeInTheDocument();
  });

  it("shows Churn Playbook tab trigger", () => {
    render(<RetentionGrowthTab result={mockResult} />);
    expect(screen.getByText("Churn Playbook")).toBeInTheDocument();
  });

  it("shows churn reduction percentage", () => {
    render(<RetentionGrowthTab result={mockResult} />);
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("shows LTV multiplier", () => {
    render(<RetentionGrowthTab result={mockResult} />);
    expect(screen.getByText("2.5×")).toBeInTheDocument();
  });

  it("shows the ChurnPredictionCard component", () => {
    render(<RetentionGrowthTab result={mockResult} />);
    expect(screen.getByTestId("churn-prediction-card")).toBeInTheDocument();
  });

  it("shows Referral Program label", () => {
    render(<RetentionGrowthTab result={mockResult} />);
    expect(screen.getByText("Referral Program")).toBeInTheDocument();
  });
});
