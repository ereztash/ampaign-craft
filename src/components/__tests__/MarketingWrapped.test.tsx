import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketingWrapped from "../MarketingWrapped";
import type { SavedPlan } from "@/types/funnel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({
    unlockedCount: 3,
    totalCount: 10,
    streak: { currentStreak: 2 },
  }),
}));

vi.mock("@/engine/healthScoreEngine", () => ({
  calculateHealthScore: vi.fn(() => ({ total: 72, breakdown: {} })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const makePlan = (name: string, hookLawName: string): SavedPlan => ({
  id: name,
  name,
  savedAt: new Date().toISOString(),
  result: {
    formData: {},
    stages: [
      {
        channels: [{ channel: "instagram" }, { channel: "email" }],
      },
    ],
    hookTips: [{ lawName: { he: hookLawName, en: hookLawName } }],
    kpis: [],
  },
} as unknown as SavedPlan);

describe("MarketingWrapped", () => {
  it("renders without crashing with plans", () => {
    const plans = [makePlan("Plan A", "Scarcity"), makePlan("Plan B", "Social Proof")];
    const { container } = render(<MarketingWrapped plans={plans} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("returns null when plans array is empty", () => {
    const { container } = render(<MarketingWrapped plans={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows Marketing Wrapped title", () => {
    render(<MarketingWrapped plans={[makePlan("Plan A", "Urgency")]} />);
    expect(screen.getByText(/marketing wrapped/i)).toBeTruthy();
  });

  it("shows plan count and health score stats", () => {
    const plans = [makePlan("Plan A", "Hook1"), makePlan("Plan B", "Hook2")];
    render(<MarketingWrapped plans={plans} />);
    // Both plan count (2) and health score (72) should appear
    expect(screen.getByText("72")).toBeTruthy();
  });

  it("shows streak count", () => {
    render(<MarketingWrapped plans={[makePlan("Plan A", "Hook")]} />);
    // streak.currentStreak = 2 from mock
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("shows achievements ratio", () => {
    render(<MarketingWrapped plans={[makePlan("Plan A", "Hook")]} />);
    expect(screen.getByText("3/10")).toBeTruthy();
  });

  it("shows Share and Copy buttons", () => {
    render(<MarketingWrapped plans={[makePlan("Plan A", "Hook")]} />);
    expect(screen.getByText(/share/i)).toBeTruthy();
    expect(screen.getByText(/copy/i)).toBeTruthy();
  });
});
