import { describe, it, expect } from "vitest";
import { runStaticAnalysis } from "../blackboard/agents/qaStaticAgent";
import { runSecurityAudit } from "../blackboard/agents/qaSecurityAgent";
import { computeOverallScore } from "../blackboard/agents/qaOrchestratorAgent";
import type { FormData, FunnelResult, FunnelStage, HookTip, CopyLabData } from "@/types/funnel";
import type { QAStaticResult, QAContentResult, QASecurityResult } from "@/types/qa";

// ═══════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation with AI features",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeStage(overrides: Partial<FunnelStage> = {}): FunnelStage {
  return {
    id: "stage-1",
    name: { he: "מודעות", en: "Awareness" },
    budgetPercent: 40,
    channels: [],
    description: { he: "שלב מודעות", en: "Awareness stage" },
    ...overrides,
  };
}

function makeHookTip(overrides: Partial<HookTip> = {}): HookTip {
  return {
    law: "scarcity",
    lawName: { he: "מחסור", en: "Scarcity" },
    formula: { he: "נוסחת מחסור", en: "Scarcity formula" },
    example: { he: "רק 10 מקומות נשארו!", en: "Only 10 spots left!" },
    channels: ["facebook"],
    ...overrides,
  };
}

function makeCopyLab(overrides: Partial<CopyLabData> = {}): CopyLabData {
  return {
    readerProfile: {
      level: 3,
      name: { he: "קורא מתקדם", en: "Advanced reader" },
      description: { he: "תיאור", en: "Description" },
      copyArchitecture: { he: "ארכיטקטורה", en: "Architecture" },
      principles: [],
    },
    formulas: [
      {
        name: { he: "AIDA", en: "AIDA" },
        origin: "classic",
        structure: { he: "מבנה", en: "Structure" },
        example: { he: "דוגמה לנוסחת AIDA בעברית", en: "AIDA example" },
        bestFor: ["ads"],
        conversionLift: "+15%",
      },
    ],
    writingTechniques: [],
    ...overrides,
  };
}

function makeFunnelResult(overrides: Partial<FunnelResult> = {}): FunnelResult {
  return {
    id: "test-funnel",
    funnelName: { he: "משפך מכירות טכנולוגי", en: "Tech Sales Funnel" },
    stages: [
      makeStage({ id: "s1", budgetPercent: 40 }),
      makeStage({ id: "s2", name: { he: "שיקול", en: "Consideration" }, budgetPercent: 35 }),
      makeStage({ id: "s3", name: { he: "המרה", en: "Conversion" }, budgetPercent: 25 }),
    ],
    totalBudget: { min: 3000, max: 5000 },
    overallTips: [
      { he: "טיפ ראשון", en: "First tip" },
      { he: "טיפ שני", en: "Second tip" },
    ],
    hookTips: [makeHookTip()],
    copyLab: makeCopyLab(),
    kpis: [{ name: { he: "המרה", en: "Conversion" }, target: "3%", confidence: "medium" }],
    createdAt: new Date().toISOString(),
    formData: makeFormData(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// QA STATIC AGENT
// ═══════════════════════════════════════════════

describe("qaStaticAgent — runStaticAnalysis", () => {
  it("returns clean result for valid input", () => {
    const formData = makeFormData();
    const funnelResult = makeFunnelResult();
    const result = runStaticAnalysis(formData, funnelResult);

    expect(result.budgetValid).toBe(true);
    expect(result.kpisRealistic).toBe(true);
    expect(result.fieldsComplete).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("detects budget allocation not summing to 100%", () => {
    const formData = makeFormData();
    const funnelResult = makeFunnelResult({
      stages: [
        makeStage({ budgetPercent: 50 }),
        makeStage({ id: "s2", budgetPercent: 20 }),
      ],
    });

    const result = runStaticAnalysis(formData, funnelResult);
    expect(result.budgetValid).toBe(false);

    const budgetFindings = result.findings.filter((f) => f.category === "budget");
    expect(budgetFindings.length).toBeGreaterThanOrEqual(1);
    expect(budgetFindings[0].severity).toBe("warning");
  });

  it("allows small budget rounding (within 5%)", () => {
    const formData = makeFormData();
    const funnelResult = makeFunnelResult({
      stages: [
        makeStage({ budgetPercent: 34 }),
        makeStage({ id: "s2", budgetPercent: 33 }),
        makeStage({ id: "s3", budgetPercent: 35 }),
      ],
    });

    const result = runStaticAnalysis(formData, funnelResult);
    expect(result.budgetValid).toBe(true);
  });

  it("detects zero-budget stage with channels", () => {
    const formData = makeFormData();
    const funnelResult = makeFunnelResult({
      stages: [
        makeStage({
          budgetPercent: 0,
          channels: [
            {
              channel: "facebook",
              name: { he: "פייסבוק", en: "Facebook" },
              budgetPercent: 100,
              kpis: [],
              tips: [],
            },
          ],
        }),
        makeStage({ id: "s2", budgetPercent: 100 }),
      ],
    });

    const result = runStaticAnalysis(formData, funnelResult);
    const zeroFindings = result.findings.filter(
      (f) => f.message.en.includes("0% budget")
    );
    expect(zeroFindings.length).toBe(1);
  });

  it("detects missing required fields", () => {
    const formData = makeFormData({
      businessField: "",
      mainGoal: "",
    });
    const funnelResult = makeFunnelResult();

    const result = runStaticAnalysis(formData, funnelResult);
    expect(result.fieldsComplete).toBe(false);

    const completenessFindings = result.findings.filter(
      (f) => f.category === "completeness"
    );
    expect(completenessFindings.length).toBeGreaterThanOrEqual(2);
    expect(completenessFindings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("warns on short product description", () => {
    const formData = makeFormData({ productDescription: "short" });
    const funnelResult = makeFunnelResult();

    const result = runStaticAnalysis(formData, funnelResult);
    const descFinding = result.findings.find(
      (f) => f.message.en.includes("Product description too short")
    );
    expect(descFinding).toBeDefined();
    expect(descFinding!.severity).toBe("warning");
  });

  it("detects B2C channels for B2B business", () => {
    const formData = makeFormData({
      audienceType: "b2b",
      existingChannels: ["tikTok", "linkedIn"],
    });
    const funnelResult = makeFunnelResult();

    const result = runStaticAnalysis(formData, funnelResult);
    const consistencyFinding = result.findings.find(
      (f) => f.category === "consistency" && f.message.en.includes("B2C channels")
    );
    expect(consistencyFinding).toBeDefined();
    expect(consistencyFinding!.severity).toBe("info");
  });

  it("warns on high budget with beginner experience", () => {
    const formData = makeFormData({
      budgetRange: "high",
      experienceLevel: "beginner",
    });
    const funnelResult = makeFunnelResult();

    const result = runStaticAnalysis(formData, funnelResult);
    const finding = result.findings.find(
      (f) => f.message.en.includes("beginner experience")
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("warning");
  });

  it("notes subscription model without retention focus", () => {
    const formData = makeFormData({
      salesModel: "subscription",
      mainGoal: "awareness",
    });
    const funnelResult = makeFunnelResult();

    const result = runStaticAnalysis(formData, funnelResult);
    const finding = result.findings.find(
      (f) => f.message.en.includes("Subscription model without retention")
    );
    expect(finding).toBeDefined();
  });

  it("computes score deductions correctly", () => {
    const formData = makeFormData({
      businessField: "",
      audienceType: "",
      mainGoal: "",
      budgetRange: "",
    });
    const funnelResult = makeFunnelResult();

    const result = runStaticAnalysis(formData, funnelResult);
    // 4 critical findings = 60 points deducted, plus any warnings
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("score never goes below 0", () => {
    const formData = makeFormData({
      businessField: "",
      audienceType: "",
      mainGoal: "",
      budgetRange: "",
      productDescription: "",
      existingChannels: [],
    });
    const funnelResult = makeFunnelResult();

    const result = runStaticAnalysis(formData, funnelResult);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════
// QA SECURITY AGENT
// ═══════════════════════════════════════════════

describe("qaSecurityAgent — runSecurityAudit", () => {
  it("returns clean result for safe content", () => {
    const funnelResult = makeFunnelResult();
    const result = runSecurityAudit(funnelResult);

    expect(result.piiDetected).toBe(false);
    expect(result.injectionRisks).toBe(0);
    expect(result.unsafeTemplates).toBe(0);
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
  });

  it("detects email addresses in content", () => {
    const funnelResult = makeFunnelResult({
      hookTips: [
        makeHookTip({
          example: { he: "שלח לנו ל-user@example.com", en: "Send to user@example.com" },
        }),
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.piiDetected).toBe(true);

    const emailFindings = result.findings.filter(
      (f) => f.message.en.includes("Email address")
    );
    expect(emailFindings.length).toBeGreaterThanOrEqual(1);
    expect(emailFindings[0].severity).toBe("critical");
    expect(emailFindings[0].autoFixable).toBe(true);
  });

  it("detects Israeli phone numbers", () => {
    const funnelResult = makeFunnelResult({
      overallTips: [
        { he: "התקשר 054-1234567 לפרטים", en: "Call 054-1234567 for details" },
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.piiDetected).toBe(true);

    const phoneFindings = result.findings.filter(
      (f) => f.message.en.includes("Phone number")
    );
    expect(phoneFindings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects credit card patterns", () => {
    const funnelResult = makeFunnelResult({
      overallTips: [
        { he: "כרטיס: 4111-1111-1111-1111", en: "Card: 4111-1111-1111-1111" },
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.piiDetected).toBe(true);

    const cardFindings = result.findings.filter(
      (f) => f.message.en.includes("Credit card")
    );
    expect(cardFindings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects script tag injection", () => {
    const funnelResult = makeFunnelResult({
      hookTips: [
        makeHookTip({
          example: { he: '<script>alert("xss")</script>', en: "Script injection" },
        }),
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.injectionRisks).toBeGreaterThanOrEqual(1);

    const scriptFindings = result.findings.filter(
      (f) => f.message.en.includes("Script tag")
    );
    expect(scriptFindings.length).toBeGreaterThanOrEqual(1);
    expect(scriptFindings[0].severity).toBe("critical");
  });

  it("detects template literal injection", () => {
    const funnelResult = makeFunnelResult({
      overallTips: [
        { he: "שם: ${user.name}", en: "Name: ${user.name}" },
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.injectionRisks).toBeGreaterThanOrEqual(1);
  });

  it("detects Handlebars template injection", () => {
    const funnelResult = makeFunnelResult({
      overallTips: [
        { he: "שלום {{user.name}}", en: "Hello {{user.name}}" },
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.injectionRisks).toBeGreaterThanOrEqual(1);
  });

  it("detects shortened URLs (WhatsApp unsafe)", () => {
    const funnelResult = makeFunnelResult({
      hookTips: [
        makeHookTip({
          example: { he: "לחץ כאן: https://bit.ly/abc123", en: "Click: https://bit.ly/abc123" },
        }),
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.unsafeTemplates).toBeGreaterThanOrEqual(1);

    const urlFindings = result.findings.filter(
      (f) => f.message.en.includes("shortened URL")
    );
    expect(urlFindings.length).toBeGreaterThanOrEqual(1);
  });

  it("detects spam trigger words in Hebrew", () => {
    const funnelResult = makeFunnelResult({
      overallTips: [
        { he: "מבצע חד פעמי! הזדמנות אחרונה!", en: "One-time offer! Last chance!" },
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.unsafeTemplates).toBeGreaterThanOrEqual(1);
  });

  it("detects excessive exclamation marks", () => {
    const funnelResult = makeFunnelResult({
      hookTips: [
        makeHookTip({
          example: { he: "הזדמנות מדהימה!!!", en: "Amazing opportunity!!!" },
        }),
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.unsafeTemplates).toBeGreaterThanOrEqual(1);
  });

  it("computes score with deductions for critical findings", () => {
    const funnelResult = makeFunnelResult({
      hookTips: [
        makeHookTip({
          example: {
            he: '<script>alert("xss")</script> שלח ל-test@test.com',
            en: '<script>alert("xss")</script> send to test@test.com',
          },
        }),
      ],
    });

    const result = runSecurityAudit(funnelResult);
    // At least 2 critical findings (script + email) = at least 40 deducted
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it("score never goes below 0", () => {
    const funnelResult = makeFunnelResult({
      hookTips: [
        makeHookTip({
          example: {
            he: '<script>alert("x")</script> test@a.com 054-1234567 4111-1111-1111-1111 https://bit.ly/x חינם!!!',
            en: '<script>alert("x")</script> test@a.com 054-1234567 4111-1111-1111-1111 https://bit.ly/x FREE!!!',
          },
        }),
      ],
    });

    const result = runSecurityAudit(funnelResult);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════
// QA ORCHESTRATOR AGENT
// ═══════════════════════════════════════════════

describe("qaOrchestratorAgent — computeOverallScore", () => {
  const cleanStatic: QAStaticResult = {
    findings: [],
    budgetValid: true,
    kpisRealistic: true,
    fieldsComplete: true,
    score: 100,
  };

  const cleanContent: QAContentResult = {
    findings: [],
    culturalScore: 90,
    brandConsistency: 85,
    ctaClarity: 88,
    hebrewQuality: 92,
    overallScore: 89,
  };

  const cleanSecurity: QASecurityResult = {
    findings: [],
    piiDetected: false,
    injectionRisks: 0,
    unsafeTemplates: 0,
    score: 100,
  };

  it("computes grade A for perfect scores", () => {
    const result = computeOverallScore(cleanStatic, cleanContent, cleanSecurity);
    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("A");
    expect(result.passedAt).not.toBeNull();
    expect(result.totalFindings).toBe(0);
    expect(result.criticalFindings).toBe(0);
  });

  it("applies weighted average correctly", () => {
    // static: 0.35 weight, content: 0.40 weight, security: 0.25 weight
    const result = computeOverallScore(
      { ...cleanStatic, score: 80 },
      { ...cleanContent, overallScore: 60 },
      { ...cleanSecurity, score: 100 }
    );

    const expected = Math.round(80 * 0.35 + 60 * 0.40 + 100 * 0.25);
    expect(result.overallScore).toBe(expected);
    expect(result.staticScore).toBe(80);
    expect(result.contentScore).toBe(60);
    expect(result.securityScore).toBe(100);
  });

  it("uses defaults when agents didn't run", () => {
    const result = computeOverallScore(null, null, null);
    // static=70, content=70, security=100
    const expected = Math.round(70 * 0.35 + 70 * 0.40 + 100 * 0.25);
    expect(result.overallScore).toBe(expected);
  });

  it("aggregates findings from all agents", () => {
    const staticWithFindings: QAStaticResult = {
      ...cleanStatic,
      findings: [
        {
          id: "s1",
          category: "budget",
          severity: "warning",
          message: { he: "test", en: "test" },
          autoFixable: false,
        },
      ],
    };

    const securityWithFindings: QASecurityResult = {
      ...cleanSecurity,
      findings: [
        {
          id: "sec1",
          category: "security",
          severity: "critical",
          message: { he: "PII", en: "PII" },
          autoFixable: true,
        },
        {
          id: "sec2",
          category: "template",
          severity: "warning",
          message: { he: "template", en: "template" },
          autoFixable: false,
        },
      ],
    };

    const result = computeOverallScore(staticWithFindings, cleanContent, securityWithFindings);
    expect(result.totalFindings).toBe(3);
    expect(result.criticalFindings).toBe(1);
  });

  it("caps grade at C when critical security findings exist", () => {
    const securityWithCritical: QASecurityResult = {
      ...cleanSecurity,
      score: 60,
      findings: [
        {
          id: "sec1",
          category: "security",
          severity: "critical",
          message: { he: "PII detected", en: "PII detected" },
          autoFixable: true,
        },
      ],
    };

    const result = computeOverallScore(cleanStatic, cleanContent, securityWithCritical);
    // Even if score is high, grade should be capped at C
    expect(["C", "D", "F"]).toContain(result.grade);
  });

  it("does not pass when critical findings exist", () => {
    const staticWithCritical: QAStaticResult = {
      ...cleanStatic,
      score: 90,
      findings: [
        {
          id: "s1",
          category: "completeness",
          severity: "critical",
          message: { he: "חסר", en: "Missing" },
          autoFixable: false,
        },
      ],
    };

    const result = computeOverallScore(staticWithCritical, cleanContent, cleanSecurity);
    expect(result.passedAt).toBeNull();
  });

  it("does not pass when overall score < 70", () => {
    const result = computeOverallScore(
      { ...cleanStatic, score: 30 },
      { ...cleanContent, overallScore: 30 },
      { ...cleanSecurity, score: 30 }
    );

    expect(result.overallScore).toBeLessThan(70);
    expect(result.passedAt).toBeNull();
    expect(result.grade).toBe("F");
  });

  it("generates budget recommendation when budget invalid", () => {
    const result = computeOverallScore(
      { ...cleanStatic, budgetValid: false },
      cleanContent,
      cleanSecurity
    );

    expect(result.recommendations.some((r) => r.en.includes("budget"))).toBe(true);
  });

  it("generates KPI recommendation when KPIs unrealistic", () => {
    const result = computeOverallScore(
      { ...cleanStatic, kpisRealistic: false },
      cleanContent,
      cleanSecurity
    );

    expect(result.recommendations.some((r) => r.en.includes("KPI"))).toBe(true);
  });

  it("generates completeness recommendation when fields missing", () => {
    const result = computeOverallScore(
      { ...cleanStatic, fieldsComplete: false },
      cleanContent,
      cleanSecurity
    );

    expect(result.recommendations.some((r) => r.en.includes("required fields"))).toBe(true);
  });

  it("generates cultural recommendation for low cultural score", () => {
    const result = computeOverallScore(
      cleanStatic,
      { ...cleanContent, culturalScore: 50 },
      cleanSecurity
    );

    expect(result.recommendations.some((r) => r.en.includes("cultural"))).toBe(true);
  });

  it("generates Hebrew quality recommendation for low score", () => {
    const result = computeOverallScore(
      cleanStatic,
      { ...cleanContent, hebrewQuality: 50 },
      cleanSecurity
    );

    expect(result.recommendations.some((r) => r.en.includes("Hebrew"))).toBe(true);
  });

  it("generates CTA recommendation for low clarity score", () => {
    const result = computeOverallScore(
      cleanStatic,
      { ...cleanContent, ctaClarity: 50 },
      cleanSecurity
    );

    expect(result.recommendations.some((r) => r.en.includes("calls to action"))).toBe(true);
  });

  it("generates PII recommendation when PII detected", () => {
    const result = computeOverallScore(
      cleanStatic,
      cleanContent,
      { ...cleanSecurity, piiDetected: true }
    );

    expect(result.recommendations.some((r) => r.en.includes("PII"))).toBe(true);
  });

  it("generates injection recommendation for injection risks", () => {
    const result = computeOverallScore(
      cleanStatic,
      cleanContent,
      { ...cleanSecurity, injectionRisks: 2 }
    );

    expect(result.recommendations.some((r) => r.en.includes("unsafe code"))).toBe(true);
  });

  it("generates template recommendation for unsafe templates", () => {
    const result = computeOverallScore(
      cleanStatic,
      cleanContent,
      { ...cleanSecurity, unsafeTemplates: 1 }
    );

    expect(result.recommendations.some((r) => r.en.includes("template"))).toBe(true);
  });

  it("assigns correct grade boundaries", () => {
    // Grade B: 80-89
    const resultB = computeOverallScore(
      { ...cleanStatic, score: 80 },
      { ...cleanContent, overallScore: 80 },
      { ...cleanSecurity, score: 80 }
    );
    expect(resultB.grade).toBe("B");

    // Grade C: 70-79
    const resultC = computeOverallScore(
      { ...cleanStatic, score: 70 },
      { ...cleanContent, overallScore: 70 },
      { ...cleanSecurity, score: 70 }
    );
    expect(resultC.grade).toBe("C");

    // Grade D: 55-69
    const resultD = computeOverallScore(
      { ...cleanStatic, score: 55 },
      { ...cleanContent, overallScore: 55 },
      { ...cleanSecurity, score: 55 }
    );
    expect(resultD.grade).toBe("D");
  });

  it("passes ISO timestamp when passing", () => {
    const result = computeOverallScore(cleanStatic, cleanContent, cleanSecurity);
    expect(result.passedAt).not.toBeNull();
    // Validate ISO format
    const date = new Date(result.passedAt!);
    expect(date.getTime()).not.toBeNaN();
  });
});

// ═══════════════════════════════════════════════
// INTEGRATION: STATIC + SECURITY TOGETHER
// ═══════════════════════════════════════════════

describe("QA pipeline integration", () => {
  it("full pipeline produces valid overall score", () => {
    const formData = makeFormData();
    const funnelResult = makeFunnelResult();

    const staticResult = runStaticAnalysis(formData, funnelResult);
    const securityResult = runSecurityAudit(funnelResult);

    // Simulate content result (LLM agent would produce this)
    const contentResult: QAContentResult = {
      findings: [],
      culturalScore: 85,
      brandConsistency: 80,
      ctaClarity: 75,
      hebrewQuality: 90,
      overallScore: 83,
    };

    const overall = computeOverallScore(staticResult, contentResult, securityResult);

    expect(overall.overallScore).toBeGreaterThanOrEqual(0);
    expect(overall.overallScore).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(overall.grade);
    expect(overall.totalFindings).toBeGreaterThanOrEqual(0);
    expect(typeof overall.staticScore).toBe("number");
    expect(typeof overall.contentScore).toBe("number");
    expect(typeof overall.securityScore).toBe("number");
  });

  it("problematic input produces actionable findings", () => {
    const formData = makeFormData({
      businessField: "",
      productDescription: "short",
      budgetRange: "high",
      experienceLevel: "beginner",
    });

    const funnelResult = makeFunnelResult({
      hookTips: [
        makeHookTip({
          example: { he: "שלח ל-test@example.com עכשיו!!!", en: "Send to test@example.com now!!!" },
        }),
      ],
    });

    const staticResult = runStaticAnalysis(formData, funnelResult);
    const securityResult = runSecurityAudit(funnelResult);

    const overall = computeOverallScore(staticResult, null, securityResult);

    expect(overall.totalFindings).toBeGreaterThan(0);
    expect(overall.criticalFindings).toBeGreaterThan(0);
    expect(overall.passedAt).toBeNull();
    expect(overall.recommendations.length).toBeGreaterThan(0);
  });
});
