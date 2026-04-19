import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminArchetypeDebugPanel from "../AdminArchetypeDebugPanel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: Record<string, string>, lang: string) => obj[lang] ?? obj["en"] ?? "",
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    profile: {
      archetypeId: "strategist",
      scores: { strategist: 80, optimizer: 40, pioneer: 30, connector: 20, closer: 10 },
      confidence: 0.85,
      confidenceTier: "strong",
      signalHistory: [],
      sessionCount: 5,
      lastComputedAt: new Date().toISOString(),
      overrideByUser: null,
    },
    uiConfig: {
      informationDensity: "high",
      ctaTone: "analytical",
      defaultTab: "analytics",
      workspaceOrder: ["command", "data", "strategy"],
      modulesOrder: ["differentiate", "wizard", "sales"],
      tabPriorityOverrides: { analytics: 1, content: 2 },
      label: { he: "האסטרטג", en: "The Strategist" },
      adaptationDescription: { he: "תיאור", en: "Description" },
      personalityProfile: {
        regulatoryFocus: "promotion",
        processingStyle: "systematic",
        coreMotivation: { he: "מוטיבציה", en: "Motivation" },
      },
      prominentModules: [],
    },
    effectiveArchetypeId: "strategist",
    confidenceTier: "strong",
    setOverride: vi.fn(),
  }),
}));

vi.mock("@/engine/behavioralHeuristicEngine", () => ({
  deriveHeuristicSet: () => ({
    activeHeuristics: [
      {
        id: "H1",
        principle: "Test principle",
        source: "Test source",
        manifestations: {
          L1_navigation: "nav",
          L2_layout: "layout",
          L3_component: "component",
          L4_content: "content",
          L5_interaction: "interaction",
        },
      },
    ],
  }),
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
}));

describe("AdminArchetypeDebugPanel", () => {
  it("renders without crashing when open", () => {
    render(<AdminArchetypeDebugPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Archetype Debug Panel")).toBeInTheDocument();
  });

  it("shows owner only badge", () => {
    render(<AdminArchetypeDebugPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("owner only")).toBeInTheDocument();
  });

  it("shows classification summary section", () => {
    render(<AdminArchetypeDebugPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Classification Summary")).toBeInTheDocument();
  });

  it("shows confidence percentage", () => {
    render(<AdminArchetypeDebugPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("shows signal breakdown section", () => {
    render(<AdminArchetypeDebugPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Signal Breakdown")).toBeInTheDocument();
  });

  it("shows no signals message when empty", () => {
    render(<AdminArchetypeDebugPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("No signals yet")).toBeInTheDocument();
  });

  it("shows manual override section", () => {
    render(<AdminArchetypeDebugPanel open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Manual Override")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(<AdminArchetypeDebugPanel open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Archetype Debug Panel")).not.toBeInTheDocument();
  });
});
