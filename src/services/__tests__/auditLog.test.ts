import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock safeStorage before importing auditLog
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
  logAudit,
  getAuditLog,
  clearAuditLog,
  auditPlanCreated,
  auditDataExported,
  auditConsentChanged,
  auditDataDeleted,
} from "../auditLog";
import { safeStorage } from "@/lib/safeStorage";

const KEY = "funnelforge-audit-log";

describe("auditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal store by making getJSON return []
    vi.mocked(safeStorage.getJSON).mockReturnValue([]);
  });

  describe("logAudit", () => {
    it("appends an entry with the provided fields", () => {
      const captured: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v);
      });

      logAudit({ action: "test_action", actor: "user-1", target: "plan-1", timestamp: "2024-01-01T00:00:00.000Z" });

      expect(safeStorage.setJSON).toHaveBeenCalledOnce();
      const saved = captured[0] as Array<{ action: string; actor: string }>;
      expect(saved).toHaveLength(1);
      expect(saved[0].action).toBe("test_action");
      expect(saved[0].actor).toBe("user-1");
    });

    it("auto-assigns timestamp when not provided", () => {
      const captured: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v);
      });

      logAudit({ action: "auto_ts", actor: "u", target: "t", timestamp: "" });

      const saved = captured[0] as Array<{ timestamp: string }>;
      expect(saved[0].timestamp).toBeTruthy();
    });

    it("trims to 500 entries (ring buffer)", () => {
      // Simulate existing 500 entries
      const existing = Array.from({ length: 500 }, (_, i) => ({
        action: `a${i}`, actor: "u", target: "t", timestamp: "ts",
      }));
      vi.mocked(safeStorage.getJSON).mockReturnValue(existing);

      const captured: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => {
        captured.push(v);
      });

      logAudit({ action: "new_entry", actor: "u", target: "t", timestamp: "ts" });

      const saved = captured[0] as unknown[];
      expect(saved).toHaveLength(500);
      // The newest entry is last
      expect((saved[saved.length - 1] as { action: string }).action).toBe("new_entry");
    });
  });

  describe("getAuditLog", () => {
    it("returns entries from safeStorage", () => {
      const entries = [{ action: "x", actor: "u", target: "t", timestamp: "ts" }];
      vi.mocked(safeStorage.getJSON).mockReturnValue(entries);
      expect(getAuditLog()).toEqual(entries);
      expect(safeStorage.getJSON).toHaveBeenCalledWith(KEY, []);
    });

    it("returns empty array when nothing stored", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([]);
      expect(getAuditLog()).toEqual([]);
    });
  });

  describe("clearAuditLog", () => {
    it("calls safeStorage.remove with the correct key", () => {
      clearAuditLog();
      expect(safeStorage.remove).toHaveBeenCalledWith(KEY);
    });
  });

  describe("convenience helpers", () => {
    it("auditPlanCreated logs plan_created action", () => {
      const captured: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => { captured.push(v); });

      auditPlanCreated("user-99", "plan-abc");

      const saved = captured[0] as Array<{ action: string; actor: string; target: string }>;
      expect(saved[0].action).toBe("plan_created");
      expect(saved[0].actor).toBe("user-99");
      expect(saved[0].target).toBe("plan-abc");
    });

    it("auditDataExported logs data_exported action targeting all_data", () => {
      const captured: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => { captured.push(v); });

      auditDataExported("user-42");

      const saved = captured[0] as Array<{ action: string; target: string }>;
      expect(saved[0].action).toBe("data_exported");
      expect(saved[0].target).toBe("all_data");
    });

    it("auditConsentChanged logs consent_changed with metadata", () => {
      const captured: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => { captured.push(v); });

      auditConsentChanged("user-7", "marketingEmails", true);

      const saved = captured[0] as Array<{ action: string; target: string; metadata?: Record<string, unknown> }>;
      expect(saved[0].action).toBe("consent_changed");
      expect(saved[0].target).toBe("marketingEmails");
      expect(saved[0].metadata).toEqual({ value: true });
    });

    it("auditDataDeleted logs data_deleted action", () => {
      const captured: unknown[] = [];
      vi.mocked(safeStorage.setJSON).mockImplementation((_k, v) => { captured.push(v); });

      auditDataDeleted("user-3");

      const saved = captured[0] as Array<{ action: string; target: string }>;
      expect(saved[0].action).toBe("data_deleted");
      expect(saved[0].target).toBe("all_data");
    });
  });
});
