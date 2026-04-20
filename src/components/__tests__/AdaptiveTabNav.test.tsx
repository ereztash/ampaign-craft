import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdaptiveTabNav from "../AdaptiveTabNav";
import { Tabs } from "@/components/ui/tabs";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (k: string) => k,
    isRTL: false,
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const mockTabs = [
  { id: "analytics", labelKey: "tabAnalytics", group: "strategy" as const, visible: true, priority: 10 },
  { id: "content", labelKey: "tabContent", group: "content" as const, visible: true, priority: 20 },
  { id: "growth", labelKey: "tabGrowth", group: "growth" as const, visible: true, priority: 30 },
  { id: "hooks", labelKey: "tabHooks", group: "content" as const, visible: true, priority: 40, badge: { he: "חדש", en: "New" } },
];

describe("AdaptiveTabNav", () => {
  it("renders without crashing", () => {
    render(
      <Tabs defaultValue="analytics">
        <AdaptiveTabNav tabs={mockTabs} />
      </Tabs>
    );
    expect(document.querySelector("[class*='flex']")).toBeTruthy();
  });

  it("shows group navigation buttons", () => {
    render(
      <Tabs defaultValue="analytics">
        <AdaptiveTabNav tabs={mockTabs} />
      </Tabs>
    );
    // Group buttons for strategy, content, and growth should appear
    expect(screen.getByText("groupStrategy")).toBeInTheDocument();
    expect(screen.getByText("groupContent")).toBeInTheDocument();
    expect(screen.getByText("groupGrowth")).toBeInTheDocument();
  });

  it("shows sub-tabs within active group", () => {
    render(
      <Tabs defaultValue="analytics">
        <AdaptiveTabNav tabs={mockTabs} />
      </Tabs>
    );
    // Default group is "strategy", should show analytics tab
    expect(screen.getByText("tabAnalytics")).toBeInTheDocument();
  });

  it("switches to content group on click", () => {
    render(
      <Tabs defaultValue="content">
        <AdaptiveTabNav tabs={mockTabs} />
      </Tabs>
    );
    fireEvent.click(screen.getByText("groupContent"));
    expect(screen.getByText("tabContent")).toBeInTheDocument();
  });

  it("renders with empty tabs array", () => {
    render(
      <Tabs defaultValue="x">
        <AdaptiveTabNav tabs={[]} />
      </Tabs>
    );
    // Should not crash with empty tabs
    expect(document.querySelector("[class*='space-y-2']")).toBeTruthy();
  });

  it("shows badge indicator when a tab has a badge", () => {
    render(
      <Tabs defaultValue="hooks">
        <AdaptiveTabNav tabs={mockTabs} />
      </Tabs>
    );
    // Click content group to see badge indicator
    fireEvent.click(screen.getByText("groupContent"));
    // The badge dot span should be present
    const dotSpans = document.querySelectorAll(".rounded-full.bg-accent");
    expect(dotSpans.length).toBeGreaterThanOrEqual(1);
  });
});
