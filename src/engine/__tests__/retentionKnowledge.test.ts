import { describe, it, expect } from "vitest";
import {
  ONBOARDING_SEQUENCES,
  CHURN_SIGNALS,
  REFERRAL_TEMPLATES,
  RETENTION_TRIGGERS,
  type ReferralTemplate,
} from "../retentionKnowledge";

// ═══════════════════════════════════════════════
// ONBOARDING_SEQUENCES
// ═══════════════════════════════════════════════

describe("ONBOARDING_SEQUENCES", () => {
  const expectedTypes = ["ecommerce", "saas", "services", "creator"] as const;

  it("exports sequences for all four business types", () => {
    for (const type of expectedTypes) {
      expect(ONBOARDING_SEQUENCES[type]).toBeDefined();
      expect(Array.isArray(ONBOARDING_SEQUENCES[type])).toBe(true);
    }
  });

  it("each sequence has at least 4 steps", () => {
    for (const type of expectedTypes) {
      expect(ONBOARDING_SEQUENCES[type].length).toBeGreaterThanOrEqual(4);
    }
  });

  it("each step has required fields: day, name, channel, emoji, template, goal", () => {
    for (const type of expectedTypes) {
      for (const step of ONBOARDING_SEQUENCES[type]) {
        expect(typeof step.day).toBe("number");
        expect(step.name.he).toBeTruthy();
        expect(step.name.en).toBeTruthy();
        expect(step.channel).toBeTruthy();
        expect(step.emoji).toBeTruthy();
        expect(step.template.he).toBeTruthy();
        expect(step.template.en).toBeTruthy();
        expect(step.goal.he).toBeTruthy();
        expect(step.goal.en).toBeTruthy();
      }
    }
  });

  it("steps are ordered by ascending day number", () => {
    for (const type of expectedTypes) {
      const days = ONBOARDING_SEQUENCES[type].map((s) => s.day);
      for (let i = 1; i < days.length; i++) {
        expect(days[i]).toBeGreaterThanOrEqual(days[i - 1]);
      }
    }
  });

  it("day 0 step exists for all business types", () => {
    for (const type of expectedTypes) {
      const day0 = ONBOARDING_SEQUENCES[type].find((s) => s.day === 0);
      expect(day0).toBeDefined();
    }
  });

  it("ecommerce sequence starts with order confirmation at day 0", () => {
    const step0 = ONBOARDING_SEQUENCES.ecommerce[0];
    expect(step0.day).toBe(0);
    expect(step0.channel).toBe("email");
  });

  it("saas sequence starts with welcome email at day 0", () => {
    const step0 = ONBOARDING_SEQUENCES.saas[0];
    expect(step0.day).toBe(0);
    expect(step0.channel).toBe("email");
  });

  it("services sequence last step is referral invitation", () => {
    const steps = ONBOARDING_SEQUENCES.services;
    const lastStep = steps[steps.length - 1];
    expect(lastStep.goal.en).toContain("referral");
  });

  it("templates contain placeholder tokens", () => {
    // ecommerce day 0 should have {שם} or {name}
    const step0He = ONBOARDING_SEQUENCES.ecommerce[0].template.he;
    expect(step0He).toMatch(/\{שם\}|{name}/);
  });
});

// ═══════════════════════════════════════════════
// CHURN_SIGNALS
// ═══════════════════════════════════════════════

describe("CHURN_SIGNALS", () => {
  it("exports an array with at least 3 signals", () => {
    expect(Array.isArray(CHURN_SIGNALS)).toBe(true);
    expect(CHURN_SIGNALS.length).toBeGreaterThanOrEqual(3);
  });

  it("each signal has signal, risk, intervention, channel", () => {
    for (const s of CHURN_SIGNALS) {
      expect(s.signal.he).toBeTruthy();
      expect(s.signal.en).toBeTruthy();
      expect(["critical", "high", "medium", "low"]).toContain(s.risk);
      expect(s.intervention.he).toBeTruthy();
      expect(s.intervention.en).toBeTruthy();
      expect(s.channel).toBeTruthy();
    }
  });

  it("includes at least one critical risk signal", () => {
    const critical = CHURN_SIGNALS.filter((s) => s.risk === "critical");
    expect(critical.length).toBeGreaterThanOrEqual(1);
  });

  it("includes at least one high risk signal", () => {
    const high = CHURN_SIGNALS.filter((s) => s.risk === "high");
    expect(high.length).toBeGreaterThanOrEqual(1);
  });

  it("payment failure signal is critical", () => {
    const paymentSignal = CHURN_SIGNALS.find((s) => s.signal.en.toLowerCase().includes("payment"));
    expect(paymentSignal).toBeDefined();
    expect(paymentSignal!.risk).toBe("critical");
  });

  it("usage drop signal is high risk", () => {
    const usageSignal = CHURN_SIGNALS.find((s) => s.signal.en.toLowerCase().includes("usage"));
    expect(usageSignal).toBeDefined();
    expect(usageSignal!.risk).toBe("high");
  });
});

// ═══════════════════════════════════════════════
// REFERRAL_TEMPLATES
// ═══════════════════════════════════════════════

describe("REFERRAL_TEMPLATES", () => {
  const expectedModels = ["two_sided", "one_sided", "tiered"] as const;

  it("exports an array of referral templates", () => {
    expect(Array.isArray(REFERRAL_TEMPLATES)).toBe(true);
    expect(REFERRAL_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("covers all three referral models", () => {
    const models = REFERRAL_TEMPLATES.map((t) => t.model);
    for (const model of expectedModels) {
      expect(models).toContain(model);
    }
  });

  it("each template has model, label, mechanics, reward, whatsappTemplate", () => {
    for (const t of REFERRAL_TEMPLATES) {
      expect(expectedModels).toContain(t.model);
      expect(t.label.he).toBeTruthy();
      expect(t.label.en).toBeTruthy();
      expect(t.mechanics.he).toBeTruthy();
      expect(t.mechanics.en).toBeTruthy();
      expect(t.reward.he).toBeTruthy();
      expect(t.reward.en).toBeTruthy();
      expect(t.whatsappTemplate.he).toBeTruthy();
      expect(t.whatsappTemplate.en).toBeTruthy();
    }
  });

  it("two_sided template reward mentions both parties", () => {
    const twoSided = REFERRAL_TEMPLATES.find((t) => t.model === "two_sided");
    expect(twoSided!.mechanics.en.toLowerCase()).toContain("both");
  });

  it("tiered template mechanics describes tiers", () => {
    const tiered = REFERRAL_TEMPLATES.find((t) => t.model === "tiered");
    expect(tiered!.mechanics.en.toLowerCase()).toMatch(/silver|gold|platinum/i);
  });

  it("whatsapp templates contain {מוצר} or product placeholder", () => {
    for (const t of REFERRAL_TEMPLATES) {
      expect(t.whatsappTemplate.he).toMatch(/\{מוצר\}|\{product\}/);
    }
  });
});

// ═══════════════════════════════════════════════
// RETENTION_TRIGGERS
// ═══════════════════════════════════════════════

describe("RETENTION_TRIGGERS", () => {
  it("exports an array with at least 4 triggers", () => {
    expect(Array.isArray(RETENTION_TRIGGERS)).toBe(true);
    expect(RETENTION_TRIGGERS.length).toBeGreaterThanOrEqual(4);
  });

  it("each trigger has trigger, timing, channel, action, emoji", () => {
    for (const t of RETENTION_TRIGGERS) {
      expect(t.trigger.he).toBeTruthy();
      expect(t.trigger.en).toBeTruthy();
      expect(t.timing.he).toBeTruthy();
      expect(t.timing.en).toBeTruthy();
      expect(t.channel).toBeTruthy();
      expect(t.action.he).toBeTruthy();
      expect(t.action.en).toBeTruthy();
      expect(t.emoji).toBeTruthy();
    }
  });

  it("includes a birthday trigger", () => {
    const birthday = RETENTION_TRIGGERS.find((t) => t.trigger.en.toLowerCase().includes("birthday"));
    expect(birthday).toBeDefined();
  });

  it("includes a purchase anniversary trigger", () => {
    const anniversary = RETENTION_TRIGGERS.find((t) => t.trigger.en.toLowerCase().includes("anniversary"));
    expect(anniversary).toBeDefined();
  });

  it("includes a holiday trigger", () => {
    const holiday = RETENTION_TRIGGERS.find((t) => t.trigger.en.toLowerCase().includes("holiday"));
    expect(holiday).toBeDefined();
  });

  it("channels are strings (not empty)", () => {
    for (const t of RETENTION_TRIGGERS) {
      expect(typeof t.channel).toBe("string");
      expect(t.channel.length).toBeGreaterThan(0);
    }
  });

  it("birthday trigger fires on birthday day (timing)", () => {
    const birthday = RETENTION_TRIGGERS.find((t) => t.trigger.en.toLowerCase().includes("birthday"));
    expect(birthday!.timing.en.toLowerCase()).toContain("birthday");
  });
});
