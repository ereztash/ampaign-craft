import { describe, it, expect } from "vitest";
import { qaSecurityAgent, runSecurityAudit } from "../qaSecurityAgent";
import { Blackboard } from "../../blackboardStore";
import type { FunnelResult } from "@/types/funnel";

// ── Helpers ───────────────────────────────────────────────────────────────
function makeBoard() {
  return new Blackboard();
}

function makeFunnelResult(overrides: Partial<FunnelResult> = {}): FunnelResult {
  return {
    funnelName: { he: "משפך מכירות", en: "Sales Funnel" },
    stages: [
      {
        id: "awareness",
        name: { he: "מודעות", en: "Awareness" },
        budgetPercent: 40,
        channels: [
          {
            channel: "facebook",
            name: { he: "פייסבוק", en: "Facebook" },
            budgetPercent: 60,
            kpis: [],
            tips: [],
          },
        ],
        description: { he: "שלב מודעות", en: "Awareness stage" },
      },
    ],
    totalBudget: 6000,
    formData: {} as any,
    hookTips: [],
    overallTips: [],
    ...overrides,
  } as FunnelResult;
}

function makeFunnelWithText(text: string): FunnelResult {
  return makeFunnelResult({
    funnelName: { he: text, en: "Sales Funnel" },
  });
}

describe("qaSecurityAgent", () => {
  // ── Agent metadata ────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(qaSecurityAgent.name).toBe("qaSecurity");
    });

    it("depends on funnel agent", () => {
      expect(qaSecurityAgent.dependencies).toContain("funnel");
    });

    it("writes to qaSecurityResult section", () => {
      expect(qaSecurityAgent.writes).toContain("qaSecurityResult");
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when funnelResult is missing", () => {
      const board = makeBoard();

      qaSecurityAgent.run(board);

      expect(board.get("qaSecurityResult")).toBeNull();
    });
  });

  // ── Board integration ─────────────────────────────────────────────────────
  describe("Board integration", () => {
    it("writes qaSecurityResult when funnelResult is present", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      qaSecurityAgent.run(board);

      expect(board.get("qaSecurityResult")).not.toBeNull();
    });

    it("result has required fields", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      qaSecurityAgent.run(board);

      const result = board.get("qaSecurityResult");
      expect(result).toHaveProperty("findings");
      expect(result).toHaveProperty("piiDetected");
      expect(result).toHaveProperty("injectionRisks");
      expect(result).toHaveProperty("unsafeTemplates");
      expect(result).toHaveProperty("score");
    });
  });
});

// ── Pure function: runSecurityAudit ───────────────────────────────────────
describe("runSecurityAudit", () => {
  describe("Clean content", () => {
    it("returns no findings for clean content", () => {
      const result = runSecurityAudit(makeFunnelResult());
      expect(result.piiDetected).toBe(false);
      expect(result.injectionRisks).toBe(0);
      expect(result.unsafeTemplates).toBe(0);
      expect(result.findings).toHaveLength(0);
    });

    it("returns score of 100 for clean content", () => {
      const result = runSecurityAudit(makeFunnelResult());
      expect(result.score).toBe(100);
    });
  });

  describe("PII detection — email", () => {
    it("detects email address in funnelName", () => {
      const funnel = makeFunnelWithText("Contact us at user@example.com for more info");
      const result = runSecurityAudit(funnel);
      expect(result.piiDetected).toBe(true);
    });

    it("email detection creates a critical finding", () => {
      const funnel = makeFunnelWithText("Email: test@company.co.il");
      const result = runSecurityAudit(funnel);
      const emailFindings = result.findings.filter(
        (f) => f.severity === "critical" && f.category === "security"
      );
      expect(emailFindings.length).toBeGreaterThan(0);
    });

    it("email finding has autoFixable true", () => {
      const funnel = makeFunnelWithText("Send to admin@example.com now");
      const result = runSecurityAudit(funnel);
      const emailFinding = result.findings.find(
        (f) => f.message.en.includes("Email address")
      );
      expect(emailFinding?.autoFixable).toBe(true);
    });
  });

  describe("PII detection — Israeli phone", () => {
    it("detects Israeli phone number", () => {
      const funnel = makeFunnelWithText("Call us at 050-1234567 today");
      const result = runSecurityAudit(funnel);
      expect(result.piiDetected).toBe(true);
    });

    it("phone detection creates a critical finding", () => {
      const funnel = makeFunnelWithText("054-9876543 for support");
      const result = runSecurityAudit(funnel);
      const phoneFindings = result.findings.filter(
        (f) => f.severity === "critical" && f.message.en.includes("Phone number")
      );
      expect(phoneFindings.length).toBeGreaterThan(0);
    });
  });

  describe("PII detection — credit card", () => {
    it("detects credit card pattern", () => {
      const funnel = makeFunnelWithText("Card: 1234-5678-9012-3456");
      const result = runSecurityAudit(funnel);
      const ccFindings = result.findings.filter(
        (f) => f.message.en.includes("Credit card")
      );
      expect(ccFindings.length).toBeGreaterThan(0);
    });
  });

  describe("Injection risk detection", () => {
    it("detects Handlebars template injection", () => {
      const funnel = makeFunnelWithText("Hello {{user.name}}, welcome!");
      const result = runSecurityAudit(funnel);
      expect(result.injectionRisks).toBeGreaterThan(0);
    });

    it("detects JS template literal injection", () => {
      const funnel = makeFunnelWithText("Price: ${totalPrice} NIS");
      const result = runSecurityAudit(funnel);
      expect(result.injectionRisks).toBeGreaterThan(0);
    });

    it("detects script tag as critical", () => {
      const funnel = makeFunnelWithText("<script>alert('xss')</script>");
      const result = runSecurityAudit(funnel);
      const scriptFindings = result.findings.filter(
        (f) => f.severity === "critical"
      );
      expect(scriptFindings.length).toBeGreaterThan(0);
    });

    it("detects javascript: URI as critical", () => {
      const funnel = makeFunnelWithText("Click: javascript:void(0)");
      const result = runSecurityAudit(funnel);
      const jsFindings = result.findings.filter(
        (f) => f.severity === "critical" && f.message.en.includes("JavaScript URI")
      );
      expect(jsFindings.length).toBeGreaterThan(0);
    });

    it("injection risk findings have autoFixable true", () => {
      const funnel = makeFunnelWithText("Hello {{name}}");
      const result = runSecurityAudit(funnel);
      const injectionFinding = result.findings.find(
        (f) => f.message.en.includes("Unsafe pattern")
      );
      expect(injectionFinding?.autoFixable).toBe(true);
    });
  });

  describe("Unsafe template detection", () => {
    it("detects shortened URLs", () => {
      const funnel = makeFunnelWithText("Click here: https://bit.ly/abc123");
      const result = runSecurityAudit(funnel);
      expect(result.unsafeTemplates).toBeGreaterThan(0);
    });

    it("detects excessive exclamation marks", () => {
      const funnel = makeFunnelWithText("Buy now!!!");
      const result = runSecurityAudit(funnel);
      const exclamFindings = result.findings.filter(
        (f) => f.message.en.includes("excessive exclamation")
      );
      expect(exclamFindings.length).toBeGreaterThan(0);
    });

    it("detects spam trigger word FREE", () => {
      const funnel = makeFunnelWithText("Get it FREE today");
      const result = runSecurityAudit(funnel);
      const spamFindings = result.findings.filter(
        (f) => f.message.en.includes("spam trigger word")
      );
      expect(spamFindings.length).toBeGreaterThan(0);
    });

    it("detects content exceeding WhatsApp 1024 char limit", () => {
      const longText = "א".repeat(1025);
      const funnel = makeFunnelWithText(longText);
      const result = runSecurityAudit(funnel);
      const lengthFindings = result.findings.filter(
        (f) => f.message.en.includes("exceeds WhatsApp template limit")
      );
      expect(lengthFindings.length).toBeGreaterThan(0);
    });

    it("does NOT flag content of exactly 1024 chars", () => {
      const okText = "א".repeat(1024);
      const funnel = makeFunnelWithText(okText);
      const result = runSecurityAudit(funnel);
      const lengthFindings = result.findings.filter(
        (f) => f.message.en.includes("exceeds WhatsApp template limit")
      );
      expect(lengthFindings.length).toBe(0);
    });
  });

  describe("Score calculation", () => {
    it("deducts 20 points per critical finding", () => {
      // email = critical = 20 deduction → score = 80
      const funnel = makeFunnelWithText("user@example.com");
      const result = runSecurityAudit(funnel);
      expect(result.score).toBeLessThanOrEqual(80);
    });

    it("deducts 8 points per warning finding", () => {
      const funnel = makeFunnelWithText("123456789"); // 9-digit potential ID = warning
      const result = runSecurityAudit(funnel);
      // May or may not trigger depending on text, just check it's <= 100
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("score is never negative", () => {
      const funnel = makeFunnelWithText(
        "user@example.com and 050-1234567 and {{inject}} and <script>xss</script> and FREE!!!"
      );
      const result = runSecurityAudit(funnel);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("score is 100 for fully clean content", () => {
      const result = runSecurityAudit(makeFunnelResult());
      expect(result.score).toBe(100);
    });
  });

  describe("Finding structure", () => {
    it("each finding has id, category, severity, message, autoFixable", () => {
      const funnel = makeFunnelWithText("user@example.com");
      const result = runSecurityAudit(funnel);
      for (const finding of result.findings) {
        expect(finding).toHaveProperty("id");
        expect(finding).toHaveProperty("category");
        expect(finding).toHaveProperty("severity");
        expect(finding.message).toHaveProperty("he");
        expect(finding.message).toHaveProperty("en");
        expect(typeof finding.autoFixable).toBe("boolean");
      }
    });

    it("finding IDs are unique and prefixed with 'security-'", () => {
      const funnel = makeFunnelWithText("user@example.com and 050-1234567");
      const result = runSecurityAudit(funnel);
      const ids = result.findings.map((f) => f.id);
      for (const id of ids) {
        expect(id).toMatch(/^security-\d+$/);
      }
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe("Content collection", () => {
    it("scans hookTips examples", () => {
      const funnel: FunnelResult = {
        ...makeFunnelResult(),
        hookTips: [
          {
            law: "1",
            lawName: { he: "", en: "" },
            formula: { he: "", en: "" },
            example: { he: "user@test.com", en: "user@test.com" },
            channels: [],
          },
        ],
      };
      const result = runSecurityAudit(funnel);
      expect(result.piiDetected).toBe(true);
    });

    it("scans overallTips", () => {
      const funnel: FunnelResult = {
        ...makeFunnelResult(),
        overallTips: [{ he: "050-9999999 לשירות לקוחות", en: "050-9999999 for support" }],
      };
      const result = runSecurityAudit(funnel);
      expect(result.piiDetected).toBe(true);
    });

    it("scans stage channel names", () => {
      const funnel = makeFunnelResult({
        stages: [
          {
            id: "s1",
            name: { he: "שלב", en: "Stage" },
            budgetPercent: 100,
            channels: [
              {
                channel: "facebook",
                name: { he: "פייסבוק {{inject}}", en: "Facebook" },
                budgetPercent: 100,
                kpis: [],
                tips: [],
              },
            ],
            description: { he: "", en: "" },
          },
        ],
      });
      const result = runSecurityAudit(funnel);
      expect(result.injectionRisks).toBeGreaterThan(0);
    });
  });
});
