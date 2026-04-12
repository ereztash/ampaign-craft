import { describe, it, expect, beforeEach } from "vitest";
import { getFallbackTemplate, mapTaskToFallback } from "@/lib/fallbackTemplates";
import { moderateOutput } from "@/engine/outputModeration";
import { enqueueOfflineOperation, getOfflineQueue, clearOfflineQueue, flushOfflineQueue } from "@/services/networkResilience";

describe("Fallback templates", () => {
  it("returns template for known industry", () => {
    const t = getFallbackTemplate("tech", "headline");
    expect(t.he).toBeTruthy();
    expect(t.en).toBeTruthy();
  });

  it("falls back to 'other' for unknown industry", () => {
    const t = getFallbackTemplate("unknown_industry", "ad-copy");
    expect(t.en).toContain("business");
  });

  it("maps task types correctly", () => {
    expect(mapTaskToFallback("headline")).toBe("headline");
    expect(mapTaskToFallback("email-sequence")).toBe("email");
    expect(mapTaskToFallback("whatsapp-message")).toBe("whatsapp");
    expect(mapTaskToFallback("ad-copy")).toBe("ad-copy");
    expect(mapTaskToFallback("social-post")).toBe("headline");
    expect(mapTaskToFallback("landing-page")).toBe("ad-copy");
  });

  it("has templates for all 10 industries", () => {
    const industries = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"];
    for (const ind of industries) {
      const t = getFallbackTemplate(ind, "headline");
      expect(t.he.length).toBeGreaterThan(5);
      expect(t.en.length).toBeGreaterThan(5);
    }
  });
});

describe("Output content moderation", () => {
  it("allows safe content", () => {
    const result = moderateOutput("Buy our great product today! Limited offer.");
    expect(result.safe).toBe(true);
    expect(result.severity).toBe("none");
  });

  it("blocks harmful content", () => {
    const result = moderateOutput("Content about nazis and terrorism");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("blocked");
  });

  it("flags excessive negativity", () => {
    const result = moderateOutput("This is worthless and hopeless, truly terrible");
    expect(result.flags).toContain("excessive_negativity");
  });

  it("flags high-pressure tactics", () => {
    const result = moderateOutput("BUY NOW!!! ACT NOW before it's too late!!!");
    expect(result.flags).toContain("high_pressure");
  });

  it("handles empty input", () => {
    expect(moderateOutput("").safe).toBe(true);
    expect(moderateOutput(null as any).safe).toBe(true);
  });
});

describe("Offline queue", () => {
  beforeEach(() => {
    clearOfflineQueue();
  });

  it("enqueues and retrieves operations", () => {
    enqueueOfflineOperation("training_pair", { engine: "test", data: "some data" });
    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe("training_pair");
  });

  it("maintains cap of 100 operations", () => {
    for (let i = 0; i < 110; i++) {
      enqueueOfflineOperation("op", { i });
    }
    const queue = getOfflineQueue();
    expect(queue.length).toBeLessThanOrEqual(100);
  });

  it("flushes successfully processed operations", async () => {
    enqueueOfflineOperation("audit", { action: "test" });
    enqueueOfflineOperation("audit", { action: "test2" });

    const result = await flushOfflineQueue(async () => true);
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
    expect(getOfflineQueue().length).toBe(0);
  });

  it("keeps failed operations in queue", async () => {
    enqueueOfflineOperation("audit", { action: "will_fail" });

    const result = await flushOfflineQueue(async () => false);
    expect(result.failed).toBe(1);
    expect(getOfflineQueue().length).toBe(1);
  });
});
