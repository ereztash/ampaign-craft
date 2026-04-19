import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/safeStorage", () => {
  const store: Record<string, unknown> = {};
  return {
    safeStorage: {
      getJSON: vi.fn((key: string, fallback: unknown) => store[key] ?? fallback),
      setJSON: vi.fn((key: string, value: unknown) => { store[key] = value; }),
      remove: vi.fn((key: string) => { delete store[key]; }),
    },
  };
});

import {
  isOnline,
  withRetry,
  enqueueOfflineOperation,
  getOfflineQueue,
  clearOfflineQueue,
  flushOfflineQueue,
  setupNetworkListeners,
} from "../networkResilience";
import { safeStorage } from "@/lib/safeStorage";

describe("networkResilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safeStorage.getJSON).mockReturnValue([]);
  });

  describe("isOnline", () => {
    it("returns navigator.onLine when available", () => {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      expect(isOnline()).toBe(true);
    });

    it("returns true when navigator is unavailable", () => {
      const origNavigator = global.navigator;
      // @ts-expect-error intentional override
      global.navigator = undefined;
      expect(isOnline()).toBe(true);
      global.navigator = origNavigator;
    });
  });

  describe("withRetry", () => {
    it("returns the value on first success", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await withRetry(fn, 3, 0);
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries and succeeds on second attempt", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce("recovered");
      const result = await withRetry(fn, 3, 0);
      expect(result).toBe("recovered");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("throws after all retries exhausted", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("always fails"));
      await expect(withRetry(fn, 2, 0)).rejects.toThrow("always fails");
      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it("uses maxRetries = 0 to try once only", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      await expect(withRetry(fn, 0, 0)).rejects.toThrow("fail");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("enqueueOfflineOperation / getOfflineQueue", () => {
    it("adds an operation to the queue with id and createdAt", () => {
      const stored: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => { stored.push(v); });

      enqueueOfflineOperation("sync_plan", { planId: "p1" });

      const queue = stored[0] as Array<{ type: string; payload: unknown; id: string; createdAt: string }>;
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe("sync_plan");
      expect(queue[0].payload).toEqual({ planId: "p1" });
      expect(queue[0].id).toBeTruthy();
      expect(queue[0].createdAt).toBeTruthy();
    });

    it("limits queue to 100 entries", () => {
      const existing = Array.from({ length: 100 }, (_, i) => ({
        id: String(i), type: "t", payload: {}, createdAt: "ts",
      }));
      vi.mocked(safeStorage.getJSON).mockReturnValue(existing);

      const stored: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => { stored.push(v); });

      enqueueOfflineOperation("overflow", {});

      const queue = stored[0] as unknown[];
      expect(queue).toHaveLength(100);
    });

    it("getOfflineQueue reads from safeStorage", () => {
      const ops = [{ id: "1", type: "op", payload: {}, createdAt: "ts" }];
      vi.mocked(safeStorage.getJSON).mockReturnValue(ops);
      expect(getOfflineQueue()).toEqual(ops);
    });
  });

  describe("clearOfflineQueue", () => {
    it("removes the queue key from safeStorage", () => {
      clearOfflineQueue();
      expect(safeStorage.remove).toHaveBeenCalledWith("funnelforge-offline-queue");
    });
  });

  describe("flushOfflineQueue", () => {
    it("returns early with zeros when queue is empty", async () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([]);
      const result = await flushOfflineQueue(vi.fn());
      expect(result).toEqual({ processed: 0, failed: 0 });
    });

    it("processes all ops successfully", async () => {
      const ops = [
        { id: "1", type: "a", payload: {}, createdAt: "ts" },
        { id: "2", type: "b", payload: {}, createdAt: "ts" },
      ];
      vi.mocked(safeStorage.getJSON).mockReturnValue(ops);

      const handler = vi.fn().mockResolvedValue(true);
      const result = await flushOfflineQueue(handler);

      expect(result).toEqual({ processed: 2, failed: 0 });
      expect(handler).toHaveBeenCalledTimes(2);
      expect(safeStorage.remove).toHaveBeenCalled(); // queue cleared
    });

    it("counts failed ops when handler returns false", async () => {
      const ops = [{ id: "1", type: "x", payload: {}, createdAt: "ts" }];
      vi.mocked(safeStorage.getJSON).mockReturnValue(ops);

      const handler = vi.fn().mockResolvedValue(false);
      const result = await flushOfflineQueue(handler);

      expect(result).toEqual({ processed: 0, failed: 1 });
      // Remaining ops are persisted
      expect(safeStorage.setJSON).toHaveBeenCalledWith(
        "funnelforge-offline-queue",
        expect.arrayContaining([expect.objectContaining({ id: "1" })]),
      );
    });

    it("counts failed ops when handler throws", async () => {
      const ops = [{ id: "1", type: "x", payload: {}, createdAt: "ts" }];
      vi.mocked(safeStorage.getJSON).mockReturnValue(ops);

      const handler = vi.fn().mockRejectedValue(new Error("network"));
      const result = await flushOfflineQueue(handler);

      expect(result).toEqual({ processed: 0, failed: 1 });
    });
  });

  describe("setupNetworkListeners", () => {
    it("returns a teardown function", () => {
      const handler = vi.fn().mockResolvedValue(true);
      const remove = setupNetworkListeners(handler);
      expect(typeof remove).toBe("function");
      remove(); // should not throw
    });
  });
});
