import { describe, it, expect } from "vitest";
import {
  computeCrmInsights,
  MIN_CLOSED_LEADS_FOR_INSIGHTS,
} from "../crmInsightEngine";
import type { Lead, LeadInteraction, LeadStatus } from "@/services/leadsService";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: overrides.id ?? `lead-${Math.random().toString(36).slice(2, 8)}`,
    userId: "user-1",
    name: overrides.name ?? "Test",
    phone: "",
    email: "",
    business: "",
    status: (overrides.status ?? "lead") as LeadStatus,
    notes: "",
    valueNIS: overrides.valueNIS ?? 0,
    nextFollowup: null,
    source: overrides.source ?? "",
    whyUs: overrides.whyUs ?? "",
    lostReason: overrides.lostReason ?? "",
    closedAt: overrides.closedAt ?? null,
    planId: null,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-25T00:00:00Z",
  };
}

describe("crmInsightEngine", () => {
  it("returns zeros for empty input and meaningful=false", () => {
    const r = computeCrmInsights([], []);
    expect(r.meaningful).toBe(false);
    expect(r.totalLeads).toBe(0);
    expect(r.closeRate).toBe(0);
    expect(r.medianTimeToCloseMs).toBeNull();
    expect(r.winThemes).toEqual([]);
    expect(r.staleLeads).toEqual([]);
  });

  it("flips meaningful=true at the threshold of decided leads", () => {
    const decided: Lead[] = [];
    for (let i = 0; i < MIN_CLOSED_LEADS_FOR_INSIGHTS; i++) {
      decided.push(makeLead({ id: `c-${i}`, status: i % 2 === 0 ? "closed" : "lost" }));
    }
    const r = computeCrmInsights(decided, []);
    expect(r.meaningful).toBe(true);
  });

  it("computes closeRate over decided leads only", () => {
    const leads = [
      makeLead({ id: "1", status: "closed" }),
      makeLead({ id: "2", status: "closed" }),
      makeLead({ id: "3", status: "lost" }),
      makeLead({ id: "4", status: "lead" }),     // open — excluded
      makeLead({ id: "5", status: "meeting" }),  // open — excluded
    ];
    const r = computeCrmInsights(leads, []);
    expect(r.closeRate).toBeCloseTo(2 / 3, 5);
  });

  it("computes ltvActualNIS as average of closed deal values only", () => {
    const leads = [
      makeLead({ status: "closed", valueNIS: 1000 }),
      makeLead({ status: "closed", valueNIS: 3000 }),
      makeLead({ status: "lost", valueNIS: 9999 }),         // ignored
      makeLead({ status: "lead", valueNIS: 9999 }),         // ignored
    ];
    const r = computeCrmInsights(leads, []);
    expect(r.ltvActualNIS).toBe(2000);
  });

  it("computes openPipelineNIS from non-terminal leads", () => {
    const leads = [
      makeLead({ status: "lead", valueNIS: 500 }),
      makeLead({ status: "meeting", valueNIS: 1500 }),
      makeLead({ status: "proposal", valueNIS: 2000 }),
      makeLead({ status: "closed", valueNIS: 9999 }),  // not in pipeline
      makeLead({ status: "lost", valueNIS: 9999 }),    // not in pipeline
    ];
    const r = computeCrmInsights(leads, []);
    expect(r.openPipelineNIS).toBe(4000);
  });

  it("computes median time-to-close among closed leads with closedAt", () => {
    const leads = [
      makeLead({
        status: "closed",
        createdAt: "2026-04-01T00:00:00Z",
        closedAt: "2026-04-04T00:00:00Z",   // 3 days
      }),
      makeLead({
        status: "closed",
        createdAt: "2026-04-01T00:00:00Z",
        closedAt: "2026-04-08T00:00:00Z",   // 7 days
      }),
      makeLead({
        status: "closed",
        createdAt: "2026-04-01T00:00:00Z",
        closedAt: "2026-04-11T00:00:00Z",   // 10 days
      }),
    ];
    const r = computeCrmInsights(leads, []);
    const ms = r.medianTimeToCloseMs!;
    expect(ms / (24 * 60 * 60 * 1000)).toBe(7);  // median = 7 days
  });

  it("clusters winThemes from why_us field of closed leads only", () => {
    const leads = [
      makeLead({ status: "closed", name: "A", whyUs: "fast delivery and great support" }),
      makeLead({ status: "closed", name: "B", whyUs: "delivery was fast and reliable" }),
      makeLead({ status: "closed", name: "C", whyUs: "great support team" }),
      makeLead({ status: "lead", name: "D", whyUs: "fast fast fast" }),  // open — ignored
    ];
    const r = computeCrmInsights(leads, []);
    const labels = r.winThemes.map((t) => t.label);
    // "fast" or "delivery" or "great" or "support" are the recurring tokens
    expect(labels.length).toBeGreaterThan(0);
    expect(labels).toEqual(expect.arrayContaining(["delivery"]));
  });

  it("clusters objectionThemes from lost_reason of lost leads only", () => {
    const leads = [
      makeLead({ status: "lost", name: "A", lostReason: "price was too high" }),
      makeLead({ status: "lost", name: "B", lostReason: "competitor offered lower price" }),
      makeLead({ status: "closed", name: "C", lostReason: "price price price" }),  // closed — ignored
    ];
    const r = computeCrmInsights(leads, []);
    const labels = r.objectionThemes.map((t) => t.label);
    expect(labels).toEqual(expect.arrayContaining(["price"]));
  });

  it("identifies staleLeads when last touch exceeds threshold", () => {
    const now = new Date("2026-04-25T00:00:00Z");
    const leads = [
      // Open lead, no interactions, created 10 days ago — STALE
      makeLead({ id: "stale-1", name: "Stale", status: "meeting", createdAt: "2026-04-15T00:00:00Z" }),
      // Open lead, last interaction 2 days ago — fresh
      makeLead({ id: "fresh-1", name: "Fresh", status: "meeting", createdAt: "2026-04-15T00:00:00Z" }),
      // Closed lead — never stale
      makeLead({ id: "closed-1", name: "Closed", status: "closed", createdAt: "2026-04-01T00:00:00Z" }),
    ];
    const interactions: LeadInteraction[] = [
      { id: "ix-1", leadId: "fresh-1", userId: "user-1", type: "note", note: "ping", occurredAt: "2026-04-23T00:00:00Z" },
    ];
    const r = computeCrmInsights(leads, interactions, { now, staleDays: 7 });
    expect(r.staleLeads.map((s) => s.leadId)).toEqual(["stale-1"]);
    expect(r.staleLeads[0].daysSinceLastTouch).toBeGreaterThanOrEqual(7);
  });

  it("does not flag closed/lost leads as stale even when untouched", () => {
    const now = new Date("2026-04-25T00:00:00Z");
    const leads = [
      makeLead({ id: "closed-1", status: "closed", createdAt: "2026-04-01T00:00:00Z" }),
      makeLead({ id: "lost-1", status: "lost", createdAt: "2026-04-01T00:00:00Z" }),
    ];
    const r = computeCrmInsights(leads, [], { now, staleDays: 3 });
    expect(r.staleLeads).toEqual([]);
  });

  it("ignores tokens shorter than 3 chars and stopwords", () => {
    const leads = [
      makeLead({ status: "closed", name: "A", whyUs: "of the to a an" }),
      makeLead({ status: "closed", name: "B", whyUs: "של את על עם או" }),
    ];
    const r = computeCrmInsights(leads, []);
    expect(r.winThemes).toEqual([]);
  });
});
