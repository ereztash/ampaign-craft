import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NudgeBanner } from "../NudgeBanner";
import type { BehavioralNudge } from "@/engine/behavioralActionEngine";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, tier: "pro", isLocalAuth: false, setTier: vi.fn() }),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    archetype: "Strategist",
    confidence: 0.9,
    effectiveArchetypeId: "optimizer",
    confidenceTier: "strong",
    uiConfig: {},
  }),
}));

vi.mock("@/hooks/useArchetypeCopyTone", () => ({
  useArchetypeCopyTone: () => "direct",
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

vi.mock("@/engine/outcomeLoopEngine", () => ({
  captureRecommendationShown: vi.fn(() => "rec-id"),
  captureVariantPick: vi.fn(),
  captureOutcome: vi.fn(),
}));

const mockNudge: BehavioralNudge = {
  type: "goal_gradient",
  message: { he: "אתה קרוב למטרה", en: "You are close to your goal" },
  cta: { he: "הגדל", en: "Boost now" },
  route: "/strategy",
};

describe("NudgeBanner", () => {
  it("renders nothing when nudge is null", () => {
    const { container } = render(
      <MemoryRouter>
        <NudgeBanner nudge={null} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders without crashing with a valid nudge", () => {
    expect(() =>
      render(
        <MemoryRouter>
          <NudgeBanner nudge={mockNudge} />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  it("shows the nudge message", () => {
    render(
      <MemoryRouter>
        <NudgeBanner nudge={mockNudge} />
      </MemoryRouter>,
    );
    expect(screen.getByText("You are close to your goal")).toBeInTheDocument();
  });

  it("shows the CTA button when route and cta are present", () => {
    render(
      <MemoryRouter>
        <NudgeBanner nudge={mockNudge} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Boost now")).toBeInTheDocument();
  });

  it("shows the dismiss button when onDismiss is provided", () => {
    const onDismiss = vi.fn();
    render(
      <MemoryRouter>
        <NudgeBanner nudge={mockNudge} onDismiss={onDismiss} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Dismiss")).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button clicked", () => {
    const onDismiss = vi.fn();
    render(
      <MemoryRouter>
        <NudgeBanner nudge={mockNudge} onDismiss={onDismiss} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalled();
  });
});
