// ═══════════════════════════════════════════════
// Archetype UI Configs — 5 persona-driven UI configurations
// Each config defines sidebar order, tab priorities, density,
// CTA tone, and prominent modules for its archetype.
// ═══════════════════════════════════════════════

import type { ArchetypeId, ArchetypeUIConfig } from "@/types/archetype";

// ═══════════════════════════════════════════════
// CONFIG DEFINITIONS
// ═══════════════════════════════════════════════

const ARCHETYPE_UI_CONFIGS: Record<ArchetypeId, ArchetypeUIConfig> = {
  // ─── The Strategist ───────────────────────────
  // Prevention + Systematic + Established
  // B2B, methodology-first, proof-heavy, risk-mitigating
  strategist: {
    archetypeId: "strategist",
    workspaceOrder: ["strategy", "dashboard", "data", "plans", "ai", "command", "crm"],
    modulesOrder: ["sales", "differentiate", "pricing", "retention", "wizard"],
    defaultTab: "analytics",
    tabPriorityOverrides: {
      analytics: 5,
      strategy: 8,
      brief: 10,
      planning: 12,
      sales: 15,
      retention: 20,
      content: 25,
      pricing: 30,
      branddna: 999,
    },
    dataAttribute: "strategist",
    informationDensity: "rich",
    ctaTone: "analytical",
    prominentModules: ["differentiation", "marketing"],
    label: { he: "האסטרטג", en: "The Strategist" },
    adaptationDescription: {
      he: "אתה בונה מתוך נתונים — סידרנו לך את הכלים בהתאם",
      en: "You build from data — we've arranged your tools accordingly",
    },
  },

  // ─── The Optimizer ────────────────────────────
  // Promotion + Systematic + Scale  (also: cold-start default)
  // B2B SaaS, subscription, data-driven growth mindset
  optimizer: {
    archetypeId: "optimizer",
    workspaceOrder: ["dashboard", "data", "strategy", "plans", "ai", "command", "crm"],
    modulesOrder: ["retention", "pricing", "sales", "differentiate", "wizard"],
    defaultTab: "analytics",
    tabPriorityOverrides: {
      analytics: 5,
      retention: 8,
      pricing: 10,
      strategy: 12,
      sales: 15,
      brief: 18,
      content: 30,
      branddna: 999,
    },
    dataAttribute: "optimizer",
    informationDensity: "compact",
    ctaTone: "direct",
    prominentModules: ["retention", "pricing"],
    label: { he: "האופטימייזר", en: "The Optimizer" },
    adaptationDescription: {
      he: "אתה מוכוון שיפור — הדאשבורד שלך מחדד לנתונים הכי רלוונטיים",
      en: "You're improvement-focused — your dashboard is tuned to the most relevant data",
    },
  },

  // ─── The Pioneer ──────────────────────────────
  // Promotion + Heuristic/Systematic + Early
  // Brand/vision builder, aspirational, high dreamOutcome
  pioneer: {
    archetypeId: "pioneer",
    workspaceOrder: ["command", "ai", "strategy", "dashboard", "plans", "data", "crm"],
    modulesOrder: ["wizard", "differentiate", "sales", "pricing", "retention"],
    defaultTab: "strategy",
    tabPriorityOverrides: {
      strategy: 5,
      content: 8,
      sales: 12,
      planning: 15,
      pricing: 20,
      retention: 25,
      analytics: 30,
      stylome: 35,
      brief: 999,
    },
    dataAttribute: "pioneer",
    informationDensity: "standard",
    ctaTone: "inspirational",
    prominentModules: ["differentiation", "marketing", "sales"],
    label: { he: "החלוץ", en: "The Pioneer" },
    adaptationDescription: {
      he: "אתה בונה משהו חדש — הובלנו אותך ישר לבנייה",
      en: "You're building something new — we took you straight to building mode",
    },
  },

  // ─── The Connector ────────────────────────────
  // Prevention + Heuristic + Relationship
  // Loyalty/retention focus, human-first, community-driven
  connector: {
    archetypeId: "connector",
    workspaceOrder: ["ai", "dashboard", "command", "strategy", "plans", "data", "crm"],
    modulesOrder: ["retention", "sales", "pricing", "differentiate", "wizard"],
    defaultTab: "retention",
    tabPriorityOverrides: {
      retention: 5,
      content: 8,
      strategy: 12,
      sales: 18,
      pricing: 22,
      analytics: 28,
      stylome: 30,
      planning: 35,
      brief: 999,
    },
    dataAttribute: "connector",
    informationDensity: "standard",
    ctaTone: "relational",
    prominentModules: ["retention"],
    label: { he: "המחבר", en: "The Connector" },
    adaptationDescription: {
      he: "הלקוחות שלך הם הלב — שמנו retention בקדמת הבמה",
      en: "Your customers are your heart — we put retention front and center",
    },
  },

  // ─── The Closer ───────────────────────────────
  // Promotion + Heuristic + Sales velocity
  // High-ticket, direct sales, ROI-urgency, D-dominant
  closer: {
    archetypeId: "closer",
    workspaceOrder: ["command", "dashboard", "strategy", "plans", "ai", "data", "crm"],
    modulesOrder: ["sales", "pricing", "retention", "differentiate", "wizard"],
    defaultTab: "sales",
    tabPriorityOverrides: {
      sales: 5,
      pricing: 8,
      strategy: 12,
      brief: 18,
      retention: 15,
      analytics: 20,
      planning: 25,
      content: 30,
      branddna: 999,
    },
    dataAttribute: "closer",
    informationDensity: "compact",
    ctaTone: "urgency",
    prominentModules: ["sales", "pricing"],
    label: { he: "הסגרן", en: "The Closer" },
    adaptationDescription: {
      he: "אתה סוגר עסקאות — חישלנו לך את הנתיב הכי ישיר",
      en: "You close deals — we sharpened the most direct path for you",
    },
  },
};

// ═══════════════════════════════════════════════
// ACCESSORS
// ═══════════════════════════════════════════════

export function getArchetypeUIConfig(archetypeId: ArchetypeId): ArchetypeUIConfig {
  return ARCHETYPE_UI_CONFIGS[archetypeId] ?? ARCHETYPE_UI_CONFIGS.optimizer;
}

export { ARCHETYPE_UI_CONFIGS };

// ═══════════════════════════════════════════════
// SIDEBAR REORDERING UTILITY
// ═══════════════════════════════════════════════

/**
 * Reorders an array of nav item IDs based on the archetype's preferred order.
 * Items not in the ordered list are appended at the end in their original order.
 */
export function reorderNavItems<T extends string>(
  items: T[],
  preferredOrder: T[],
): T[] {
  const orderMap = new Map(preferredOrder.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a)! : 9999;
    const bi = orderMap.has(b) ? orderMap.get(b)! : 9999;
    return ai - bi;
  });
}
