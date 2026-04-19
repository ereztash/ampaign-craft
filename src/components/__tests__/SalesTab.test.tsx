import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SalesTab from "../SalesTab";
import type { FunnelResult } from "@/types/funnel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));
vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => null),
    setJSON: vi.fn(),
    getString: vi.fn(() => null),
    setString: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/loose", () => ({
  supabaseLoose: {
    from: vi.fn(() => ({ insert: vi.fn(() => Promise.resolve({ error: null })) })),
  },
}));

vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn(() => ({ derived: { coldStartMode: false } })),
}));

vi.mock("@/engine/salesPipelineEngine", () => ({
  generateSalesPipeline: vi.fn(() => ({
    salesType: "high-touch",
    stages: [
      {
        id: "discovery",
        name: { he: "גילוי", en: "Discovery" },
        emoji: "🔍",
        actions: [{ he: "שאל שאלות", en: "Ask discovery questions" }],
        conversionRate: 80,
        avgDaysInStage: 3,
      },
    ],
    forecast: {
      monthlyDeals: 5,
      avgDealSize: 5000,
      pipelineValue: 25000,
      expectedRevenue: 20000,
      cycleLength: 14,
      winRate: 0.4,
    },
    objectionScripts: [
      {
        emoji: "💰",
        objection: { he: "יקר מדי", en: "Too expensive" },
        response: { he: "בואו נדבר על ערך", en: "Let's talk about value" },
        technique: "Reframing",
      },
    ],
    automations: [
      {
        emoji: "⚡",
        trigger: { he: "לא ענה", en: "No response" },
        action: { he: "שלח תזכורת", en: "Send follow-up reminder" },
        tool: "WhatsApp",
      },
    ],
    closingTips: [{ he: "טיפ לסגירה", en: "Always confirm budget upfront" }],
  })),
  getSalesTypeLabel: vi.fn(() => ({ he: "מכירה ישירה", en: "High-touch Sales" })),
  getNeuroClosingFrameworks: vi.fn(() => [
    {
      emoji: "🧠",
      name: { he: "עוגן", en: "Anchoring" },
      vectorLabel: { he: "עוגן מחיר", en: "Price anchor" },
      psychology: { he: "הסבר", en: "Anchoring psychology explanation" },
      script: { he: "סקריפט", en: "Anchor script text" },
      bestFor: { he: "B2B", en: "B2B clients" },
    },
  ]),
  detectBuyerPersonality: vi.fn(() => "analytical"),
  BUYER_PERSONALITIES: [
    {
      id: "analytical",
      emoji: "🔬",
      name: { he: "אנליטי", en: "Analytical" },
      traits: { he: "מאפיינים", en: "Data-driven, detail-oriented" },
      sellTo: { he: "איך למכור", en: "Present data and proof" },
      avoid: { he: "מה להימנע", en: "Avoid vague claims" },
    },
  ],
}));

vi.mock("@/engine/discProfileEngine", () => ({
  inferDISCProfile: vi.fn(() => ({
    dominant: 0.3,
    influential: 0.4,
    steady: 0.2,
    conscientious: 0.1,
    primaryType: "I",
    label: { he: "משפיע", en: "Influential" },
  })),
}));

vi.mock("@/engine/neuroClosingEngine", () => ({
  generateClosingStrategy: vi.fn(() => ({
    title: { he: "אסטרטגיית סגירה", en: "Closing Strategy" },
    primaryTechnique: "scarcity",
    scripts: [],
    objectionHandlers: [],
    followUpSequence: [],
    urgencyTactics: [],
    trustBuilders: [],
    pricePresentation: { he: "הצגת מחיר", en: "Price presentation" },
    badge: { he: "I", en: "Influential" },
    badgeColor: "blue",
  })),
}));

vi.mock("@/components/DISCProfileCard", () => ({
  DISCProfileCard: () => <div data-testid="disc-profile-card" />,
}));

vi.mock("@/components/NeuroClosingCard", () => ({
  NeuroClosingCard: () => <div data-testid="neuro-closing-card" />,
}));

vi.mock("@/components/WhatsAppSendButton", () => ({
  WhatsAppSendButton: () => <button>Send via WhatsApp</button>,
}));

vi.mock("@/components/EmailComposer", () => ({
  EmailComposer: () => <button>Email</button>,
}));

vi.mock("@/components/QuoteBuilder", () => ({
  default: () => <div data-testid="quote-builder" />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

const mockResult: FunnelResult = {
  id: "r1",
  formData: { businessField: "tech", audienceType: "b2b", mainGoal: "sales" } as any,
  funnelName: { he: "תוכנית", en: "Plan" },
  totalBudget: { min: 5000, max: 10000 },
  stages: [],
  kpis: [],
  overallTips: [],
  copyLab: null,
  personalBrand: null,
} as any;

describe("SalesTab", () => {
  it("renders without crashing", () => {
    expect(() =>
      render(
        <MemoryRouter>
          <SalesTab result={mockResult} />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  it("shows the DISC profile card", () => {
    render(
      <MemoryRouter>
        <SalesTab result={mockResult} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("disc-profile-card")).toBeInTheDocument();
  });

  it("shows salesPipeline translation key", () => {
    render(
      <MemoryRouter>
        <SalesTab result={mockResult} />
      </MemoryRouter>,
    );
    expect(screen.getByText("salesPipeline")).toBeInTheDocument();
  });

  it("shows Create Quote button", () => {
    render(
      <MemoryRouter>
        <SalesTab result={mockResult} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Create Quote")).toBeInTheDocument();
  });

  it("shows the objection text", () => {
    render(
      <MemoryRouter>
        <SalesTab result={mockResult} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/"Too expensive"/i)).toBeInTheDocument();
  });

  it("shows the Selling Toolkit section", () => {
    render(
      <MemoryRouter>
        <SalesTab result={mockResult} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Selling Toolkit/i)).toBeInTheDocument();
  });
});
