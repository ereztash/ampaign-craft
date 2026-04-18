import { describe, it, expect, vi } from "vitest";
import {
  createEmptyIntegrationState,
  getIntegration,
  isConnected,
  getConnectedPlatforms,
  updateIntegrationStatus,
  formatPlanNotification,
  formatWebhookPayload,
  buildEventPayload,
  PLATFORM_CONFIG,
  ENGINE_MANIFEST,
  type IntegrationState,
  type IntegrationPlatform,
  type IntegrationEvent,
} from "../integrationEngine";

// ── Mock external deps ─────────────────────────────────────────────────────
vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((_a: string, _b: string, _c: string) => `${_a}-${_b}-${_c}`),
}));

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("IntegrationEngine — ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("integrationEngine");
  });

  it("has stage 'deploy'", () => {
    expect(ENGINE_MANIFEST.stage).toBe("deploy");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// PLATFORM_CONFIG
// ─────────────────────────────────────────────────────────────────────────

describe("PLATFORM_CONFIG", () => {
  const platforms: IntegrationPlatform[] = ["slack", "whatsapp", "google_analytics", "facebook_ads", "mailchimp", "webhook", "hubspot"];

  it("has all 7 platforms configured", () => {
    for (const platform of platforms) {
      expect(PLATFORM_CONFIG[platform]).toBeDefined();
    }
  });

  it("each platform has bilingual name and description", () => {
    for (const platform of platforms) {
      const config = PLATFORM_CONFIG[platform];
      expect(config.name.he).toBeTruthy();
      expect(config.name.en).toBeTruthy();
      expect(config.description.he).toBeTruthy();
      expect(config.description.en).toBeTruthy();
    }
  });

  it("each platform has icon string", () => {
    for (const platform of platforms) {
      expect(PLATFORM_CONFIG[platform].icon).toBeTruthy();
    }
  });

  it("each platform has availableEvents array", () => {
    for (const platform of platforms) {
      expect(Array.isArray(PLATFORM_CONFIG[platform].availableEvents)).toBe(true);
    }
  });

  it("each platform has requiresOAuth boolean", () => {
    for (const platform of platforms) {
      expect(typeof PLATFORM_CONFIG[platform].requiresOAuth).toBe("boolean");
    }
  });

  it("slack requiresOAuth is true", () => {
    expect(PLATFORM_CONFIG.slack.requiresOAuth).toBe(true);
  });

  it("whatsapp requiresOAuth is false", () => {
    expect(PLATFORM_CONFIG.whatsapp.requiresOAuth).toBe(false);
  });

  it("webhook requiresOAuth is false", () => {
    expect(PLATFORM_CONFIG.webhook.requiresOAuth).toBe(false);
  });

  it("slack has all 4 available events", () => {
    const slackEvents = PLATFORM_CONFIG.slack.availableEvents;
    expect(slackEvents).toContain("plan_generated");
    expect(slackEvents).toContain("qa_completed");
    expect(slackEvents).toContain("research_completed");
    expect(slackEvents).toContain("weekly_pulse");
  });

  it("google_analytics has empty availableEvents", () => {
    expect(PLATFORM_CONFIG.google_analytics.availableEvents).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// createEmptyIntegrationState
// ─────────────────────────────────────────────────────────────────────────

describe("createEmptyIntegrationState", () => {
  it("returns state with integrations array", () => {
    const state = createEmptyIntegrationState();
    expect(Array.isArray(state.integrations)).toBe(true);
    expect(state.integrations.length).toBeGreaterThan(0);
  });

  it("creates one integration per platform", () => {
    const state = createEmptyIntegrationState();
    const platformCount = Object.keys(PLATFORM_CONFIG).length;
    expect(state.integrations).toHaveLength(platformCount);
  });

  it("all integrations start as 'disconnected'", () => {
    const state = createEmptyIntegrationState();
    for (const integration of state.integrations) {
      expect(integration.status).toBe("disconnected");
    }
  });

  it("each integration has a platform and config", () => {
    const state = createEmptyIntegrationState();
    for (const integration of state.integrations) {
      expect(integration.platform).toBeTruthy();
      expect(typeof integration.config).toBe("object");
    }
  });

  it("lastCheckedAt is a valid ISO string", () => {
    const state = createEmptyIntegrationState();
    expect(() => new Date(state.lastCheckedAt)).not.toThrow();
  });

  it("works with blackboardCtx", () => {
    expect(() => createEmptyIntegrationState({ userId: "u1", planId: "p1" })).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getIntegration
// ─────────────────────────────────────────────────────────────────────────

describe("getIntegration", () => {
  let state: IntegrationState;

  it("returns the integration for a known platform", () => {
    state = createEmptyIntegrationState();
    const integration = getIntegration(state, "slack");
    expect(integration).toBeDefined();
    expect(integration?.platform).toBe("slack");
  });

  it("returns undefined for unknown platform", () => {
    state = createEmptyIntegrationState();
    const integration = getIntegration(state, "nonexistent" as IntegrationPlatform);
    expect(integration).toBeUndefined();
  });

  it("returns correct integration for each platform", () => {
    state = createEmptyIntegrationState();
    for (const platform of Object.keys(PLATFORM_CONFIG) as IntegrationPlatform[]) {
      const integration = getIntegration(state, platform);
      expect(integration?.platform).toBe(platform);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// isConnected
// ─────────────────────────────────────────────────────────────────────────

describe("isConnected", () => {
  it("returns false for disconnected platform", () => {
    const state = createEmptyIntegrationState();
    expect(isConnected(state, "slack")).toBe(false);
  });

  it("returns true after connecting a platform", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "connected");
    expect(isConnected(state, "slack")).toBe(true);
  });

  it("returns false for platform in error state", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "error");
    expect(isConnected(state, "slack")).toBe(false);
  });

  it("returns false for unknown platform", () => {
    const state = createEmptyIntegrationState();
    expect(isConnected(state, "unknown" as IntegrationPlatform)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getConnectedPlatforms
// ─────────────────────────────────────────────────────────────────────────

describe("getConnectedPlatforms", () => {
  it("returns empty array when nothing connected", () => {
    const state = createEmptyIntegrationState();
    expect(getConnectedPlatforms(state)).toEqual([]);
  });

  it("returns connected platforms only", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "connected");
    state = updateIntegrationStatus(state, "webhook", "connected");
    const connected = getConnectedPlatforms(state);
    expect(connected).toContain("slack");
    expect(connected).toContain("webhook");
    expect(connected).not.toContain("whatsapp");
  });

  it("does not include platforms in error state", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "error");
    const connected = getConnectedPlatforms(state);
    expect(connected).not.toContain("slack");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// updateIntegrationStatus
// ─────────────────────────────────────────────────────────────────────────

describe("updateIntegrationStatus", () => {
  it("updates status of the specified platform", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "connected");
    const slackIntegration = getIntegration(state, "slack");
    expect(slackIntegration?.status).toBe("connected");
  });

  it("does not mutate the original state", () => {
    const original = createEmptyIntegrationState();
    updateIntegrationStatus(original, "slack", "connected");
    expect(getIntegration(original, "slack")?.status).toBe("disconnected");
  });

  it("sets connectedAt when status becomes connected", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "connected");
    const integration = getIntegration(state, "slack");
    expect(integration?.connectedAt).toBeTruthy();
    expect(() => new Date(integration!.connectedAt!)).not.toThrow();
  });

  it("does not set connectedAt when status is not connected", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "error", "Token expired");
    const integration = getIntegration(state, "slack");
    expect(integration?.connectedAt).toBeUndefined();
  });

  it("stores error message when provided", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "error", "Auth failed");
    const integration = getIntegration(state, "slack");
    expect(integration?.error).toBe("Auth failed");
  });

  it("updates lastCheckedAt", () => {
    const before = new Date().toISOString();
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "pending");
    expect(state.lastCheckedAt >= before).toBe(true);
  });

  it("other platforms remain unchanged", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "connected");
    const webhook = getIntegration(state, "webhook");
    expect(webhook?.status).toBe("disconnected");
  });

  it("transitions: connected → error works", () => {
    let state = createEmptyIntegrationState();
    state = updateIntegrationStatus(state, "slack", "connected");
    state = updateIntegrationStatus(state, "slack", "error", "rate limit");
    expect(getIntegration(state, "slack")?.status).toBe("error");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// formatPlanNotification
// ─────────────────────────────────────────────────────────────────────────

describe("formatPlanNotification", () => {
  it("returns text and metadata for slack", () => {
    const result = formatPlanNotification("slack", "My Campaign", 85);
    expect(result.text).toContain("My Campaign");
    expect(result.text).toContain("85/100");
    expect(result.metadata).toBeDefined();
  });

  it("slack text uses markdown bold", () => {
    const result = formatPlanNotification("slack", "BoldPlan");
    expect(result.text).toContain("*BoldPlan*");
  });

  it("returns text for whatsapp", () => {
    const result = formatPlanNotification("whatsapp", "WA Plan");
    expect(result.text).toContain("WA Plan");
    expect((result.metadata as any).template).toBe("plan_notification");
  });

  it("returns text for webhook", () => {
    const result = formatPlanNotification("webhook", "WebhookPlan", 70);
    expect(result.text).toContain("WebhookPlan");
    expect(result.text).toContain("70/100");
  });

  it("returns text for default platform (mailchimp)", () => {
    const result = formatPlanNotification("mailchimp", "MailPlan");
    expect(result.text).toContain("MailPlan");
    expect(result.metadata).toEqual({});
  });

  it("omits score text when score is undefined", () => {
    const result = formatPlanNotification("slack", "No Score");
    expect(result.text).not.toContain("QA:");
  });

  it("includes score text when score provided", () => {
    const result = formatPlanNotification("slack", "Scored", 92);
    expect(result.text).toContain("QA: 92/100");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// formatWebhookPayload
// ─────────────────────────────────────────────────────────────────────────

describe("formatWebhookPayload", () => {
  it("returns a WebhookPayload with required fields", () => {
    const payload = formatWebhookPayload("plan_generated", { planName: "Alpha" });
    expect(payload.event).toBe("plan_generated");
    expect(payload.source).toBe("campaign-craft");
    expect(payload.version).toBe("1.0");
    expect(payload.data).toBeDefined();
    expect(typeof payload.timestamp).toBe("string");
  });

  it("timestamp is a valid ISO string", () => {
    const payload = formatWebhookPayload("qa_completed", { score: 80 });
    expect(() => new Date(payload.timestamp)).not.toThrow();
  });

  it("data contains the provided context", () => {
    const payload = formatWebhookPayload("plan_generated", { planName: "Beta", score: 75 });
    expect(payload.data.planName).toBe("Beta");
    expect(payload.data.score).toBe(75);
  });

  it("works for all event types", () => {
    const events: IntegrationEvent[] = ["plan_generated", "qa_completed", "research_completed", "weekly_pulse"];
    for (const event of events) {
      const payload = formatWebhookPayload(event, {});
      expect(payload.event).toBe(event);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// buildEventPayload
// ─────────────────────────────────────────────────────────────────────────

describe("buildEventPayload", () => {
  it("plan_generated includes planName, industry, user_id", () => {
    const payload = buildEventPayload("plan_generated", {
      planName: "My Plan",
      industry: "tech",
      userId: "u123",
    });
    expect(payload.event).toBe("plan_generated");
    expect(payload.data.plan_name).toBe("My Plan");
    expect(payload.data.industry).toBe("tech");
    expect(payload.data.user_id).toBe("u123");
  });

  it("qa_completed includes plan_name and score", () => {
    const payload = buildEventPayload("qa_completed", { planName: "QA Plan", score: 88 });
    expect(payload.event).toBe("qa_completed");
    expect(payload.data.plan_name).toBe("QA Plan");
    expect(payload.data.score).toBe(88);
  });

  it("research_completed includes summary", () => {
    const payload = buildEventPayload("research_completed", { summary: "Market is hot" });
    expect(payload.event).toBe("research_completed");
    expect(payload.data.summary).toBe("Market is hot");
  });

  it("weekly_pulse includes summary", () => {
    const payload = buildEventPayload("weekly_pulse", { summary: "Week 1 complete" });
    expect(payload.event).toBe("weekly_pulse");
    expect(payload.data.summary).toBe("Week 1 complete");
  });

  it("all payloads have source and version", () => {
    const events: IntegrationEvent[] = ["plan_generated", "qa_completed", "research_completed", "weekly_pulse"];
    for (const event of events) {
      const payload = buildEventPayload(event, {});
      expect(payload.source).toBe("campaign-craft");
      expect(payload.version).toBe("1.0");
    }
  });

  it("all payloads have a valid timestamp", () => {
    const payload = buildEventPayload("weekly_pulse", {});
    expect(() => new Date(payload.timestamp)).not.toThrow();
  });
});
