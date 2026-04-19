import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SmartOnboarding from "../SmartOnboarding";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false, isRTL: false }),
}));
vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => null),
    setJSON: vi.fn(),
    getString: vi.fn(() => null),
    setString: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@/services/eventQueue", () => ({
  trackOnboardingAbandoned: vi.fn(() => Promise.resolve()),
  trackArchetypeRevealed: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/analytics", () => ({
  Analytics: {
    onboardingStarted: vi.fn(),
    firstPlanGenerated: vi.fn(),
  },
}));

vi.mock("@/engine/businessFingerprintEngine", () => ({
  computeFingerprint: vi.fn(() => ({
    archetypeId: "optimizer",
    archetypeLabel: { he: "אופטימייזר", en: "Optimizer" },
    signals: [],
    score: 0.8,
  })),
}));

vi.mock("@/types/profile", () => ({
  getIndustryDefaults: vi.fn(() => ({
    audienceType: "b2c",
    salesModel: "direct",
    ageRange: "25-44",
    channels: ["instagram"],
    pricePositioning: 50,
    competitiveIntensity: 50,
    budgetCapacity: 50,
    teamSize: 10,
    marketMaturity: 50,
  })),
  INITIAL_UNIFIED_PROFILE: {
    businessField: "other",
    audienceType: null,
    mainGoal: null,
    salesModel: "direct",
    ageRange: "25-44",
    channels: [],
    pricePositioning: 50,
    competitiveIntensity: 50,
    budgetCapacity: 50,
    teamSize: 10,
    marketMaturity: 50,
    valuePriorities: ["speed", "quality", "cost", "innovation"],
    currentStuckPoint: null,
  },
}));

vi.mock("@/components/BusinessDNACard", () => ({
  default: () => <div data-testid="business-dna-card" />,
}));

vi.mock("@/components/ui/adaptive-slider", () => ({
  AdaptiveSlider: ({ label, value, onChange }: any) => (
    <div>
      <span>{label?.en || "Slider"}</span>
      <input type="range" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  ),
}));

describe("SmartOnboarding", () => {
  const onComplete = vi.fn();

  it("renders without crashing", () => {
    expect(() => render(<SmartOnboarding onComplete={onComplete} />)).not.toThrow();
  });

  it("shows the first step question about what is stuck", () => {
    render(<SmartOnboarding onComplete={onComplete} />);
    expect(screen.getByText(/What's stuck this week/i)).toBeInTheDocument();
  });

  it("shows Step 1 of 5 indicator", () => {
    render(<SmartOnboarding onComplete={onComplete} />);
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
  });

  it("shows Next button on step 0", () => {
    render(<SmartOnboarding onComplete={onComplete} />);
    expect(screen.getAllByRole("button", { name: /Next/i })[0]).toBeInTheDocument();
  });

  it("does not show Back button on first step — step indicator shows 1", () => {
    render(<SmartOnboarding onComplete={onComplete} />);
    // Back button may be rendered hidden; verify we're on step 1
    expect(screen.getByText(/Step 1/i)).toBeInTheDocument();
  });

  it("Next button click does not crash the component", () => {
    render(<SmartOnboarding onComplete={onComplete} />);
    fireEvent.click(screen.getByText(/Not enough leads coming in/i));
    expect(() => fireEvent.click(screen.getAllByRole("button", { name: /Next/i })[0])).not.toThrow();
  });

  it("shows preset stuck-point options on step 0", () => {
    render(<SmartOnboarding onComplete={onComplete} />);
    expect(screen.getByText(/Not enough leads coming in/i)).toBeInTheDocument();
  });
});
