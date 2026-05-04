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
  { id: "sales", labelKey: "tabSales", group: "growth" as const, visible: true, priority: 30 },
  { id: "hooks", labelKey: "tabHooks", group: "content" as const, visible: true, priority: 40, badge: { he: "חדש", en: "New" } },
];

describe("AdaptiveTabNav", () => {
  it("renders group navigation buttons", () => {
    render(
      <Tabs value="analytics" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={mockTabs} activeTab="analytics" onTabSelect={vi.fn()} />
      </Tabs>
    );
    expect(screen.getByText("groupStrategy")).toBeInTheDocument();
    expect(screen.getByText("groupContent")).toBeInTheDocument();
    expect(screen.getByText("groupGrowth")).toBeInTheDocument();
  });

  it("highlights the group that contains the active tab", () => {
    render(
      <Tabs value="sales" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={mockTabs} activeTab="sales" onTabSelect={vi.fn()} />
      </Tabs>
    );
    const growthBtn = screen.getByText("groupGrowth").closest("button")!;
    expect(growthBtn.className).toMatch(/bg-primary/);
    const strategyBtn = screen.getByText("groupStrategy").closest("button")!;
    expect(strategyBtn.className).not.toMatch(/bg-primary/);
  });

  it("derives activeGroup from activeTab prop — no stale local state", () => {
    const { rerender } = render(
      <Tabs value="analytics" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={mockTabs} activeTab="analytics" onTabSelect={vi.fn()} />
      </Tabs>
    );
    // Initially in strategy group
    expect(screen.getByText("groupStrategy").closest("button")!.className).toMatch(/bg-primary/);

    // Simulate parent switching to a growth tab
    rerender(
      <Tabs value="sales" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={mockTabs} activeTab="sales" onTabSelect={vi.fn()} />
      </Tabs>
    );
    expect(screen.getByText("groupGrowth").closest("button")!.className).toMatch(/bg-primary/);
    expect(screen.getByText("groupStrategy").closest("button")!.className).not.toMatch(/bg-primary/);
  });

  it("calls onTabSelect with first tab of group when super-tab is clicked", () => {
    const onTabSelect = vi.fn();
    render(
      <Tabs value="analytics" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={mockTabs} activeTab="analytics" onTabSelect={onTabSelect} />
      </Tabs>
    );
    fireEvent.click(screen.getByText("groupContent"));
    // First tab in content group by priority is "content" (priority 20)
    expect(onTabSelect).toHaveBeenCalledWith("content");
  });

  it("shows sub-tabs of the active group only", () => {
    render(
      <Tabs value="analytics" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={mockTabs} activeTab="analytics" onTabSelect={vi.fn()} />
      </Tabs>
    );
    expect(screen.getByText("tabAnalytics")).toBeInTheDocument();
    expect(screen.queryByText("tabContent")).not.toBeInTheDocument();
    expect(screen.queryByText("tabSales")).not.toBeInTheDocument();
  });

  it("falls back to first available group when activeTab is unknown", () => {
    render(
      <Tabs value="nonexistent" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={mockTabs} activeTab="nonexistent" onTabSelect={vi.fn()} />
      </Tabs>
    );
    // Should highlight first group (strategy) — no crash, no undefined active
    const strategyBtn = screen.getByText("groupStrategy").closest("button")!;
    expect(strategyBtn.className).toMatch(/bg-primary/);
  });

  it("renders with empty tabs array without crashing", () => {
    render(
      <Tabs value="x" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={[]} activeTab="x" onTabSelect={vi.fn()} />
      </Tabs>
    );
    expect(document.querySelector("[class*='space-y-2']")).toBeTruthy();
  });

  it("shows badge dot when a tab in the group has a badge", () => {
    render(
      <Tabs value="content" onValueChange={vi.fn()}>
        <AdaptiveTabNav tabs={mockTabs} activeTab="content" onTabSelect={vi.fn()} />
      </Tabs>
    );
    // content group has "hooks" tab with a badge → dot indicator on groupContent button
    const dotSpans = document.querySelectorAll(".rounded-full.bg-accent");
    expect(dotSpans.length).toBeGreaterThanOrEqual(1);
  });
});
