import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LandingPage from "../LandingPage";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (k: string) => k,
    isRTL: false,
    setLanguage: vi.fn(),
  }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      isReturningUser: false,
      savedPlanCount: 0,
      visitCount: 1,
      lastPlanSummary: null,
    },
  }),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({
    streak: { currentStreak: 0 },
    mastery: { percentage: 0 },
    unlockedCount: 0,
    totalCount: 10,
  }),
}));

vi.mock("@/lib/socialProofData", () => ({
  getTotalUsers: vi.fn(() => 5000),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
  },
}));

vi.mock("@/engine/pulseEngine", () => ({
  generateWeeklyPulse: vi.fn(() => null),
}));

vi.mock("@/components/MarketingWrapped", () => ({
  default: () => <div data-testid="marketing-wrapped">MarketingWrapped</div>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("LandingPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<LandingPage onStart={vi.fn()} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows hero title for new users", () => {
    render(<LandingPage onStart={vi.fn()} />);
    // t("heroTitle") returns "heroTitle" from mock
    expect(screen.getByText("heroTitle")).toBeTruthy();
  });

  it("shows main CTA button", () => {
    render(<LandingPage onStart={vi.fn()} />);
    // t("ctaButton") returns "ctaButton"
    expect(screen.getByText("ctaButton")).toBeTruthy();
  });

  it("calls onStart when CTA is clicked", () => {
    const onStart = vi.fn();
    render(<LandingPage onStart={onStart} />);
    fireEvent.click(screen.getByText("ctaButton"));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("shows secondary Build My Plan CTA", () => {
    render(<LandingPage onStart={vi.fn()} />);
    expect(screen.getByText(/build my plan/i)).toBeTruthy();
  });

  it("shows user count social proof", () => {
    render(<LandingPage onStart={vi.fn()} />);
    // getTotalUsers returns 5000, shown as "5,000+ businesses already using it"
    expect(screen.getByText(/5,000\+/)).toBeTruthy();
  });

  it("shows feature cards", () => {
    render(<LandingPage onStart={vi.fn()} />);
    // t("featureAnalyze") etc. return key strings
    expect(screen.getByText("featureAnalyze")).toBeTruthy();
    expect(screen.getByText("featurePlan")).toBeTruthy();
    expect(screen.getByText("featureExecute")).toBeTruthy();
  });
});
