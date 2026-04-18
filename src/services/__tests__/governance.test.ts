import { describe, it, expect, beforeEach } from "vitest";
import { canPerform, type UserRole } from "@/types/governance";
import { sanitizeHTML, escapeHTML } from "@/lib/sanitize";
import { deleteAllUserData, exportUserData } from "@/services/dataGovernance";
import { logAudit, getAuditLog, clearAuditLog } from "@/services/auditLog";

describe("RBAC permission matrix", () => {
  it("owner has all permissions", () => {
    expect(canPerform("owner", "view_health_score")).toBe(true);
    expect(canPerform("owner", "view_financials")).toBe(true);
    expect(canPerform("owner", "manage_team")).toBe(true);
    expect(canPerform("owner", "delete_data")).toBe(true);
    expect(canPerform("owner", "manage_billing")).toBe(true);
  });

  it("viewer can only view basic data", () => {
    expect(canPerform("viewer", "view_health_score")).toBe(true);
    expect(canPerform("viewer", "view_churn_risk")).toBe(true);
    expect(canPerform("viewer", "edit_plan")).toBe(false);
    expect(canPerform("viewer", "export_data")).toBe(false);
    expect(canPerform("viewer", "manage_team")).toBe(false);
  });

  it("editor can edit but not manage", () => {
    expect(canPerform("editor", "edit_plan")).toBe(true);
    expect(canPerform("editor", "export_data")).toBe(true);
    expect(canPerform("editor", "manage_team")).toBe(false);
    expect(canPerform("editor", "view_financials")).toBe(false);
  });

  it("admin can manage but not bill", () => {
    expect(canPerform("admin", "manage_team")).toBe(true);
    expect(canPerform("admin", "view_financials")).toBe(true);
    expect(canPerform("admin", "manage_billing")).toBe(false);
  });
});

describe("HTML sanitization", () => {
  it("strips script tags", () => {
    expect(sanitizeHTML('<p>Safe</p><script>alert(1)</script>')).toBe("<p>Safe</p>");
  });

  it("strips iframe tags", () => {
    expect(sanitizeHTML('<iframe src="evil.com"></iframe>text')).toBe("text");
  });

  it("strips event handlers", () => {
    expect(sanitizeHTML('<div onclick="alert(1)">click</div>')).toBe("<div>click</div>");
  });

  it("strips javascript: URLs", () => {
    const result = sanitizeHTML('<a href="javascript:alert(1)">link</a>');
    expect(result).not.toContain("javascript:");
  });

  it("preserves safe HTML", () => {
    expect(sanitizeHTML("<p>Hello <strong>world</strong></p>")).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("handles empty input", () => {
    expect(sanitizeHTML("")).toBe("");
    expect(sanitizeHTML(null as unknown as string)).toBe("");
  });
});

describe("escapeHTML", () => {
  it("escapes all dangerous characters", () => {
    expect(escapeHTML('<script>alert("xss")</script>')).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });
});

describe("Data governance — right-to-delete", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deletes all funnelforge keys from localStorage", async () => {
    localStorage.setItem("funnelforge-plans", "[]");
    localStorage.setItem("funnelforge-user-profile", "{}");
    localStorage.setItem("other-key", "keep");

    const result = await deleteAllUserData();
    expect(result.deletedKeys).toContain("funnelforge-plans");
    expect(result.deletedKeys).toContain("funnelforge-user-profile");
    expect(localStorage.getItem("funnelforge-plans")).toBeNull();
    expect(localStorage.getItem("other-key")).toBe("keep");
  });

  it("exports all user data (localStorage only when no userId)", async () => {
    localStorage.setItem("funnelforge-plans", '["plan1"]');
    const data = await exportUserData();
    expect(data["funnelforge-plans"]).toEqual(["plan1"]);
    expect(data._format).toBe("funnelforge-gdpr-export-v2");
    // Without userId, no Supabase tables should be touched
    expect(data["supabase:training_pairs"]).toBeUndefined();
  });
});

describe("Audit logging", () => {
  beforeEach(() => {
    clearAuditLog();
  });

  it("logs and retrieves entries", () => {
    logAudit({ action: "test", actor: "user1", target: "plan1", timestamp: new Date().toISOString() });
    const log = getAuditLog();
    expect(log.length).toBe(1);
    expect(log[0].action).toBe("test");
  });

  it("maintains ring buffer limit", () => {
    for (let i = 0; i < 510; i++) {
      logAudit({ action: `action_${i}`, actor: "user", target: "t", timestamp: "" });
    }
    const log = getAuditLog();
    expect(log.length).toBeLessThanOrEqual(500);
    expect(log[log.length - 1].action).toBe("action_509");
  });
});
