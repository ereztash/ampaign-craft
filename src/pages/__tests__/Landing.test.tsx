import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "../Landing";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, tier: "free", isLocalAuth: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/lib/socialProofData", () => ({
  getTotalUsers: () => 5000,
}));

vi.mock("@/lib/pricingTiers", () => ({
  TIERS: [
    {
      id: "free",
      name: { en: "Free", he: "חינמי" },
      price: { en: "$0/mo", he: "₪0/חודש" },
      features: [
        { en: "Basic plan", he: "תוכנית בסיסית" },
        { en: "1 plan", he: "תוכנית אחת" },
        { en: "Limited exports", he: "ייצוא מוגבל" },
        { en: "Email support", he: "תמיכה במייל" },
      ],
    },
    {
      id: "pro",
      name: { en: "Pro", he: "פרו" },
      price: { en: "$29/mo", he: "₪99/חודש" },
      features: [
        { en: "Unlimited plans", he: "תוכניות ללא הגבלה" },
        { en: "AI coach", he: "מאמן AI" },
        { en: "Meta Ads", he: "מטא מודעות" },
        { en: "Priority support", he: "תמיכה מועדפת" },
      ],
    },
    {
      id: "business",
      name: { en: "Business", he: "עסקי" },
      price: { en: "$79/mo", he: "₪249/חודש" },
      features: [
        { en: "All Pro features", he: "כל פרו" },
        { en: "CRM", he: "CRM" },
        { en: "Custom branding", he: "מיתוג" },
        { en: "Dedicated support", he: "תמיכה ייחודית" },
      ],
    },
  ],
}));

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

describe("Landing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows the main element", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the hero heading", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/investing in marketing with no results/i)).toBeInTheDocument();
  });

  it("shows the main CTA button", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("button", { name: /build my plan/i }).length).toBeGreaterThan(0);
  });

  it("shows the 5 Modules section", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getByText(/5 modules/i)).toBeInTheDocument();
  });

  it("shows pricing plans section", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/plans/i)[0]).toBeInTheDocument();
  });

  it("shows How It Works section", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getByText(/how it works/i)).toBeInTheDocument();
  });
});
