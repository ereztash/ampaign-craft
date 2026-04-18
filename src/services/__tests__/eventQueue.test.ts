import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase loose mock ───────────────────────────────────────────────────

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/loose", () => ({
  supabaseLoose: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

// ── Module under test ─────────────────────────────────────────────────────

import {
  publishEvent,
  getRecentEvents,
  getEventStatus,
  onPlanGenerated,
  requestQA,
  requestResearch,
  trackSignupCompleted,
  trackFirstPlanGenerated,
  trackOnboardingAbandoned,
  trackArchetypeRevealed,
  trackPaywallViewed,
  trackShareCreated,
  trackSignupFromShare,
  trackReferralRewardEarned,
} from "../eventQueue";

describe("eventQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── publishEvent ──────────────────────────────────────────────────────

  describe("publishEvent", () => {
    it("returns eventId on success", async () => {
      mockRpc.mockResolvedValue({ data: "evt-123", error: null });

      const result = await publishEvent("plan.generated", { planId: "p-1" }, "user-1");
      expect(result.eventId).toBe("evt-123");
      expect(result.error).toBeUndefined();
    });

    it("returns error string on failure", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "rpc failed" } });

      const result = await publishEvent("plan.generated", {}, "user-1");
      expect(result.eventId).toBeNull();
      expect(result.error).toBe("rpc failed");
    });

    it("calls rpc with the correct parameters", async () => {
      mockRpc.mockResolvedValue({ data: "evt-999", error: null });

      await publishEvent("notification.send", { foo: "bar" }, "user-42", {
        priority: 1,
        maxAttempts: 5,
        delaySeconds: 10,
      });

      expect(mockRpc).toHaveBeenCalledWith("publish_event", {
        p_event_type: "notification.send",
        p_payload: { foo: "bar" },
        p_user_id: "user-42",
        p_priority: 1,
        p_max_attempts: 5,
        p_delay_seconds: 10,
      });
    });

    it("uses default options when none provided", async () => {
      mockRpc.mockResolvedValue({ data: "evt-1", error: null });

      await publishEvent("benchmark.update", {}, "user-1");

      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_priority: 5,
        p_max_attempts: 3,
        p_delay_seconds: 0,
      }));
    });
  });

  // ── getRecentEvents ───────────────────────────────────────────────────

  describe("getRecentEvents", () => {
    const mockRow = {
      id: "e-1",
      event_type: "plan.generated",
      payload: { planId: "p-1" },
      status: "completed",
      attempts: 1,
      created_at: "2024-01-01T00:00:00Z",
      completed_at: "2024-01-01T00:00:01Z",
      error: undefined,
      result: undefined,
    };

    it("returns mapped events on success", async () => {
      const chain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [mockRow], error: null }),
            })),
          })),
        })),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getRecentEvents("user-1");
      expect(result.events).toHaveLength(1);
      expect(result.events[0].id).toBe("e-1");
      expect(result.events[0].eventType).toBe("plan.generated");
      expect(result.events[0].status).toBe("completed");
    });

    it("returns error string on failure", async () => {
      const chain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } }),
            })),
          })),
        })),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getRecentEvents("user-1");
      expect(result.events).toHaveLength(0);
      expect(result.error).toBe("db error");
    });

    it("uses provided limit", async () => {
      const limitFn = vi.fn().mockResolvedValue({ data: [], error: null });
      const chain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ limit: limitFn })),
          })),
        })),
      };
      mockFrom.mockReturnValue(chain);

      await getRecentEvents("user-1", 5);
      expect(limitFn).toHaveBeenCalledWith(5);
    });
  });

  // ── getEventStatus ────────────────────────────────────────────────────

  describe("getEventStatus", () => {
    it("returns mapped event on success", async () => {
      const row = {
        id: "evt-77",
        event_type: "embedding.requested",
        payload: {},
        status: "pending",
        attempts: 0,
        created_at: "2024-01-01T00:00:00Z",
      };
      const chain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          })),
        })),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getEventStatus("evt-77");
      expect(result.event).not.toBeNull();
      expect(result.event!.id).toBe("evt-77");
      expect(result.event!.eventType).toBe("embedding.requested");
    });

    it("returns null event on error", async () => {
      const chain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
          })),
        })),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getEventStatus("missing");
      expect(result.event).toBeNull();
      expect(result.error).toBe("not found");
    });

    it("returns null event when data is null but no error", async () => {
      const chain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getEventStatus("evt-none");
      expect(result.event).toBeNull();
    });
  });

  // ── convenience publishers ────────────────────────────────────────────

  describe("convenience publishers", () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({ data: "evt-ok", error: null });
    });

    it("onPlanGenerated publishes plan.generated with priority 3", async () => {
      await onPlanGenerated("p-1", "u-1");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "plan.generated",
        p_priority: 3,
      }));
    });

    it("requestQA publishes plan.qa_requested with priority 2", async () => {
      await requestQA("p-1", "u-1");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "plan.qa_requested",
        p_priority: 2,
      }));
    });

    it("requestResearch publishes research.requested with question and domain", async () => {
      await requestResearch("what is ROI?", "marketing", "u-1");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "research.requested",
        p_payload: expect.objectContaining({ question: "what is ROI?", domain: "marketing" }),
      }));
    });

    it("trackSignupCompleted publishes aarrr.acquisition.signup_completed", async () => {
      await trackSignupCompleted("u-1", "google");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "aarrr.acquisition.signup_completed",
        p_payload: expect.objectContaining({ source: "google" }),
      }));
    });

    it("trackFirstPlanGenerated publishes aarrr.activation.first_plan_generated", async () => {
      await trackFirstPlanGenerated("u-1", "plan-x", "tech");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "aarrr.activation.first_plan_generated",
        p_payload: expect.objectContaining({ planId: "plan-x", industry: "tech" }),
      }));
    });

    it("trackOnboardingAbandoned includes lastStep and abandonedAt", async () => {
      await trackOnboardingAbandoned("u-1", 3);
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "aarrr.activation.onboarding_abandoned",
        p_payload: expect.objectContaining({ lastStep: 3 }),
      }));
    });

    it("trackArchetypeRevealed includes archetype and confidence", async () => {
      await trackArchetypeRevealed("u-1", "pioneer", 0.85);
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "aarrr.activation.archetype_revealed",
        p_payload: expect.objectContaining({ archetype: "pioneer", confidence: 0.85 }),
      }));
    });

    it("trackPaywallViewed includes feature and currentTier", async () => {
      await trackPaywallViewed("u-1", "ai_copy", "free");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "aarrr.revenue.paywall_viewed",
        p_payload: expect.objectContaining({ feature: "ai_copy", currentTier: "free" }),
      }));
    });

    it("trackShareCreated includes shareId", async () => {
      await trackShareCreated("u-1", "share-abc");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "aarrr.referral.share_created",
        p_payload: expect.objectContaining({ shareId: "share-abc" }),
      }));
    });

    it("trackSignupFromShare includes referrerCode", async () => {
      await trackSignupFromShare("u-1", "REF123");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "aarrr.referral.signup_from_share",
        p_payload: expect.objectContaining({ referrerCode: "REF123" }),
      }));
    });

    it("trackReferralRewardEarned includes rewardType and claimedAt", async () => {
      await trackReferralRewardEarned("u-1", "free_month");
      expect(mockRpc).toHaveBeenCalledWith("publish_event", expect.objectContaining({
        p_event_type: "aarrr.referral.reward_earned",
        p_payload: expect.objectContaining({ rewardType: "free_month" }),
      }));
    });
  });
});
