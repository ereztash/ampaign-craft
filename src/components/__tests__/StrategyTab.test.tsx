import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { readInsightChecked, writeInsightChecked } from "../StrategyTab";

describe("insightChecked TTL helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("readInsightChecked returns false when no entry exists", () => {
    expect(readInsightChecked("funnel-123")).toBe(false);
  });

  it("readInsightChecked returns true for a valid (non-expired) entry", () => {
    writeInsightChecked("funnel-abc");
    expect(readInsightChecked("funnel-abc")).toBe(true);
  });

  it("readInsightChecked returns false and removes entry when TTL has expired", () => {
    // Write a record with an already-expired timestamp
    localStorage.setItem(
      "insight-checked-funnel-expired",
      JSON.stringify({ value: true, expiresAt: Date.now() - 1000 }),
    );
    expect(readInsightChecked("funnel-expired")).toBe(false);
    expect(localStorage.getItem("insight-checked-funnel-expired")).toBeNull();
  });

  it("readInsightChecked returns false for a malformed entry", () => {
    localStorage.setItem("insight-checked-funnel-bad", "not-json{{{");
    expect(readInsightChecked("funnel-bad")).toBe(false);
  });

  it("keys are scoped per funnelId — different funnels don't interfere", () => {
    writeInsightChecked("funnel-A");
    expect(readInsightChecked("funnel-A")).toBe(true);
    expect(readInsightChecked("funnel-B")).toBe(false);
  });

  it("writeInsightChecked sets expiresAt ~7 days from now", () => {
    const before = Date.now();
    writeInsightChecked("funnel-ttl");
    const after = Date.now();

    const raw = localStorage.getItem("insight-checked-funnel-ttl");
    expect(raw).not.toBeNull();
    const { expiresAt } = JSON.parse(raw!);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs);
  });

  it("entry just before expiry is still valid", () => {
    const justBefore = Date.now() + 1000; // expires 1 second from now
    localStorage.setItem(
      "insight-checked-funnel-near",
      JSON.stringify({ value: true, expiresAt: justBefore }),
    );
    expect(readInsightChecked("funnel-near")).toBe(true);
  });
});
