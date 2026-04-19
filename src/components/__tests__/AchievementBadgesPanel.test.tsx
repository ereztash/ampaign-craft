import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AchievementBadgesPanel from "../AchievementBadgesPanel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: Record<string, string>, lang: string) => obj[lang] ?? obj["en"] ?? "",
}));

vi.mock("@/hooks/useAchievements", () => ({
  useAchievements: () => ({
    achievements: [
      {
        id: "a1",
        emoji: "🏆",
        name: { he: "פרס", en: "Award" },
        description: { he: "תיאור", en: "Description" },
        unlockedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "a2",
        emoji: "⭐",
        name: { he: "כוכב", en: "Star" },
        description: { he: "תיאור נוסף", en: "Another desc" },
        unlockedAt: null,
      },
    ],
    unlockedCount: 1,
    totalCount: 2,
    streak: { currentStreak: 3 },
    mastery: { percentage: 50 },
  }),
}));

describe("AchievementBadgesPanel", () => {
  it("renders without crashing when open", () => {
    render(<AchievementBadgesPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Your Achievements")).toBeInTheDocument();
  });

  it("shows streak info", () => {
    render(<AchievementBadgesPanel open={true} onOpenChange={vi.fn()} />);
    expect(document.body.textContent).toContain("3");
    expect(document.body.textContent).toContain("weeks");
  });

  it("shows badge count", () => {
    render(<AchievementBadgesPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getAllByText(/1\/2/)[0]).toBeInTheDocument();
  });

  it("shows mastery percentage", () => {
    render(<AchievementBadgesPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it("renders achievement emoji and name", () => {
    render(<AchievementBadgesPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Award")).toBeInTheDocument();
    expect(screen.getByText("Star")).toBeInTheDocument();
  });

  it("does not show content when closed", () => {
    render(<AchievementBadgesPanel open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Your Achievements")).not.toBeInTheDocument();
  });
});
