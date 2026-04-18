import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock safeStorage before module import
vi.mock("../safeStorage", () => {
  let store: unknown[] = [];
  return {
    safeStorage: {
      getJSON: vi.fn((_key: string, fallback: unknown) => store.length ? store : fallback),
      setJSON: vi.fn((_key: string, value: unknown) => { store = value as unknown[]; }),
      remove: vi.fn(() => { store = []; }),
      __setStore: (v: unknown[]) => { store = v; },
      __getStore: () => store,
    },
  };
});

import {
  notificationQueue,
  notifyPlanSaved,
  notifyReferralClicked,
  notifyArchetypeRevealed,
} from "../notificationQueue";
import { safeStorage } from "../safeStorage";

// Helper to access the internal store through the mock
const mockStorage = safeStorage as unknown as {
  __setStore: (v: unknown[]) => void;
  __getStore: () => unknown[];
  getJSON: ReturnType<typeof vi.fn>;
  setJSON: ReturnType<typeof vi.fn>;
};

describe("notificationQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.__setStore([]);
  });

  // ── getAll ────────────────────────────────────────────────────────────

  describe("getAll", () => {
    it("returns empty array when nothing is stored", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([]);
      expect(notificationQueue.getAll()).toEqual([]);
    });

    it("returns stored notifications", () => {
      const items = [{ id: "1", type: "system", title: { he: "t", en: "t" }, read: false, createdAt: "2024" }];
      vi.mocked(safeStorage.getJSON).mockReturnValue(items);
      expect(notificationQueue.getAll()).toEqual(items);
    });
  });

  // ── getUnreadCount ────────────────────────────────────────────────────

  describe("getUnreadCount", () => {
    it("returns 0 when all notifications are read", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([
        { id: "1", read: true },
        { id: "2", read: true },
      ]);
      expect(notificationQueue.getUnreadCount()).toBe(0);
    });

    it("counts only unread notifications", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([
        { id: "1", read: false },
        { id: "2", read: true },
        { id: "3", read: false },
      ]);
      expect(notificationQueue.getUnreadCount()).toBe(2);
    });

    it("returns 0 for empty queue", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([]);
      expect(notificationQueue.getUnreadCount()).toBe(0);
    });
  });

  // ── push ──────────────────────────────────────────────────────────────

  describe("push", () => {
    it("adds a notification with generated id and createdAt", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([]);

      const captured: unknown[][] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v as unknown[]);
      });

      notificationQueue.push({
        type: "plan_saved",
        title: { he: "נשמר", en: "Saved" },
      });

      expect(captured).toHaveLength(1);
      const saved = captured[0] as Array<{ id: string; read: boolean; createdAt: string; type: string }>;
      expect(saved).toHaveLength(1);
      expect(typeof saved[0].id).toBe("string");
      expect(saved[0].id.length).toBeGreaterThan(0);
      expect(saved[0].read).toBe(false);
      expect(typeof saved[0].createdAt).toBe("string");
      expect(saved[0].type).toBe("plan_saved");
    });

    it("prepends new notification (newest first)", () => {
      const existing = [{ id: "old", type: "system", title: { he: "", en: "" }, read: false, createdAt: "2024" }];
      vi.mocked(safeStorage.getJSON).mockReturnValue(existing);

      const captured: unknown[][] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v as unknown[]);
      });

      notificationQueue.push({ type: "system", title: { he: "new", en: "new" } });

      const saved = captured[0] as Array<{ id: string }>;
      expect(saved[0].id).not.toBe("old"); // new item is first
      expect(saved[1].id).toBe("old");
    });

    it("trims to max 20 notifications", () => {
      const existing = Array.from({ length: 20 }, (_, i) => ({
        id: `n${i}`, type: "system", title: { he: "", en: "" }, read: false, createdAt: "2024",
      }));
      vi.mocked(safeStorage.getJSON).mockReturnValue(existing);

      const captured: unknown[][] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v as unknown[]);
      });

      notificationQueue.push({ type: "system", title: { he: "new", en: "new" } });

      const saved = captured[0] as unknown[];
      expect(saved).toHaveLength(20);
    });
  });

  // ── markAllRead ───────────────────────────────────────────────────────

  describe("markAllRead", () => {
    it("marks all notifications as read", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([
        { id: "1", read: false },
        { id: "2", read: false },
      ]);

      const captured: unknown[][] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v as unknown[]);
      });

      notificationQueue.markAllRead();

      const saved = captured[0] as Array<{ read: boolean }>;
      expect(saved.every((n) => n.read === true)).toBe(true);
    });
  });

  // ── clear ─────────────────────────────────────────────────────────────

  describe("clear", () => {
    it("saves an empty array", () => {
      const captured: unknown[][] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v as unknown[]);
      });

      notificationQueue.clear();

      expect(captured[0]).toEqual([]);
    });
  });

  // ── convenience writers ───────────────────────────────────────────────

  describe("convenience writers", () => {
    beforeEach(() => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([]);
    });

    it("notifyPlanSaved pushes a plan_saved notification with planName in body", () => {
      const captured: unknown[][] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v as unknown[]);
      });

      notifyPlanSaved("My Campaign Plan");

      const saved = captured[0] as Array<{ type: string; body: { he: string; en: string } }>;
      expect(saved[0].type).toBe("plan_saved");
      expect(saved[0].body.en).toBe("My Campaign Plan");
    });

    it("notifyReferralClicked pushes a referral_clicked notification with code in body", () => {
      const captured: unknown[][] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v as unknown[]);
      });

      notifyReferralClicked("REF42");

      const saved = captured[0] as Array<{ type: string; body: { he: string; en: string } }>;
      expect(saved[0].type).toBe("referral_clicked");
      expect(saved[0].body.en).toContain("REF42");
    });

    it("notifyArchetypeRevealed pushes an archetype_revealed notification", () => {
      const captured: unknown[][] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v as unknown[]);
      });

      notifyArchetypeRevealed({ he: "החלוץ", en: "The Pioneer" });

      const saved = captured[0] as Array<{ type: string; body: { he: string; en: string } }>;
      expect(saved[0].type).toBe("archetype_revealed");
      expect(saved[0].body.en).toBe("The Pioneer");
    });
  });
});
