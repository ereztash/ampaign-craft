// ═══════════════════════════════════════════════
// QA Security Agent — Heuristic-based security validation
// Checks: PII leaks, injection vectors in templates,
// unsafe WhatsApp/email patterns. No LLM needed.
// ═══════════════════════════════════════════════

import type { AgentDefinition } from "../agentRunner";
import type { QASecurityResult, QAFinding, QASeverity } from "@/types/qa";
import type { FunnelResult } from "@/types/funnel";

export const qaSecurityAgent: AgentDefinition = {
  name: "qaSecurity",
  dependencies: ["funnel"],
  writes: ["qaSecurityResult"],
  run: (board) => {
    const funnelResult = board.get("funnelResult");
    if (!funnelResult) return;

    const result = runSecurityAudit(funnelResult);
    board.set("qaSecurityResult", result);
  },
};

export function runSecurityAudit(funnelResult: FunnelResult): QASecurityResult {
  const findings: QAFinding[] = [];
  let findingId = 0;
  let piiDetected = false;
  let injectionRisks = 0;
  let unsafeTemplates = 0;

  const addFinding = (
    category: QAFinding["category"],
    severity: QASeverity,
    messageHe: string,
    messageEn: string,
    location?: string,
    suggestionHe?: string,
    suggestionEn?: string,
    autoFixable = false
  ) => {
    findings.push({
      id: `security-${++findingId}`,
      category,
      severity,
      message: { he: messageHe, en: messageEn },
      location,
      suggestion: suggestionHe ? { he: suggestionHe, en: suggestionEn || "" } : undefined,
      autoFixable,
    });
  };

  // Collect all text content from the funnel result
  const textContent = collectTextContent(funnelResult);

  // ── PII Detection ──
  piiDetected = detectPII(textContent, addFinding);

  // ── Injection Risk Detection ──
  injectionRisks = detectInjectionRisks(textContent, addFinding);

  // ── Unsafe Template Detection ──
  unsafeTemplates = detectUnsafeTemplates(textContent, addFinding);

  // Calculate score: start at 100, deduct per finding
  const deductions = findings.reduce((sum, f) => {
    if (f.severity === "critical") return sum + 20;
    if (f.severity === "warning") return sum + 8;
    return sum + 2;
  }, 0);
  const score = Math.max(0, 100 - deductions);

  return { findings, piiDetected, injectionRisks, unsafeTemplates, score };
}

// ═══════════════════════════════════════════════
// TEXT CONTENT COLLECTOR
// ═══════════════════════════════════════════════

interface TextItem {
  text: string;
  location: string;
}

function collectTextContent(result: FunnelResult): TextItem[] {
  const items: TextItem[] = [];

  // Funnel name
  if (result.funnelName?.he) items.push({ text: result.funnelName.he, location: "funnelName.he" });
  if (result.funnelName?.en) items.push({ text: result.funnelName.en, location: "funnelName.en" });

  // Hook tips
  if (result.hookTips) {
    for (let i = 0; i < result.hookTips.length; i++) {
      const hook = result.hookTips[i];
      if (hook.example?.he) items.push({ text: hook.example.he, location: `hookTips[${i}].example.he` });
      if (hook.example?.en) items.push({ text: hook.example.en, location: `hookTips[${i}].example.en` });
    }
  }

  // Copy formulas
  if (result.copyLab?.formulas) {
    for (let i = 0; i < result.copyLab.formulas.length; i++) {
      const formula = result.copyLab.formulas[i];
      if (formula.example?.he) items.push({ text: formula.example.he, location: `copyLab.formulas[${i}].example.he` });
      if (formula.example?.en) items.push({ text: formula.example.en, location: `copyLab.formulas[${i}].example.en` });
    }
  }

  // Overall tips
  if (result.overallTips) {
    for (let i = 0; i < result.overallTips.length; i++) {
      const tip = result.overallTips[i];
      if (tip.he) items.push({ text: tip.he, location: `overallTips[${i}].he` });
      if (tip.en) items.push({ text: tip.en, location: `overallTips[${i}].en` });
    }
  }

  // Stage names and channel content
  for (let i = 0; i < result.stages.length; i++) {
    const stage = result.stages[i];
    if (stage.name?.he) items.push({ text: stage.name.he, location: `stages[${i}].name.he` });
    if (stage.name?.en) items.push({ text: stage.name.en, location: `stages[${i}].name.en` });

    for (const channel of (stage.channels || [])) {
      if (channel.name) items.push({ text: channel.name, location: `stages[${i}].channels` });
    }
  }

  return items;
}

// ═══════════════════════════════════════════════
// PII DETECTION
// ═══════════════════════════════════════════════

// Israeli ID: 9 digits
const ISRAELI_ID_REGEX = /\b\d{9}\b/;
// Israeli phone: 05X-XXXXXXX or 05XXXXXXXX
const ISRAELI_PHONE_REGEX = /\b0[5][0-9][-\s]?\d{7}\b/;
// Email
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
// Credit card (basic 16-digit pattern)
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/;

function detectPII(
  content: TextItem[],
  addFinding: (...args: any[]) => void
): boolean {
  let detected = false;

  for (const item of content) {
    if (EMAIL_REGEX.test(item.text)) {
      addFinding(
        "security", "critical",
        "כתובת אימייל זוהתה בתוכן שנוצר — סיכון לדליפת מידע אישי",
        "Email address detected in generated content — PII leak risk",
        item.location,
        "הסר כתובות אימייל מהתוכן",
        "Remove email addresses from content",
        true
      );
      detected = true;
    }

    if (ISRAELI_PHONE_REGEX.test(item.text)) {
      addFinding(
        "security", "critical",
        "מספר טלפון זוהה בתוכן שנוצר — סיכון לדליפת מידע אישי",
        "Phone number detected in generated content — PII leak risk",
        item.location,
        "הסר מספרי טלפון מהתוכן",
        "Remove phone numbers from content",
        true
      );
      detected = true;
    }

    if (ISRAELI_ID_REGEX.test(item.text)) {
      // Only flag if it's not likely a budget number or generic digit sequence
      const match = item.text.match(ISRAELI_ID_REGEX);
      if (match && !item.location.includes("budget")) {
        addFinding(
          "security", "warning",
          "רצף של 9 ספרות שעלול להיות מספר ת.ז. — בדוק שאין מידע אישי",
          "9-digit sequence that could be an ID number — verify no PII",
          item.location,
          "ודא שאין מספרי זהות בתוכן",
          "Verify no ID numbers in content"
        );
      }
    }

    if (CREDIT_CARD_REGEX.test(item.text)) {
      addFinding(
        "security", "critical",
        "רצף דמוי כרטיס אשראי זוהה בתוכן",
        "Credit card-like sequence detected in content",
        item.location,
        "הסר מידע פיננסי מהתוכן",
        "Remove financial information from content",
        true
      );
      detected = true;
    }
  }

  return detected;
}

// ═══════════════════════════════════════════════
// INJECTION RISK DETECTION
// ═══════════════════════════════════════════════

// Template injection patterns
const TEMPLATE_INJECTION_PATTERNS = [
  { regex: /\{\{.*?\}\}/g, name: "Handlebars/Mustache template" },
  { regex: /\$\{.*?\}/g, name: "JS template literal" },
  { regex: /<script[\s>]/gi, name: "Script tag" },
  { regex: /javascript:/gi, name: "JavaScript URI" },
  { regex: /on\w+\s*=/gi, name: "Event handler attribute" },
];

function detectInjectionRisks(
  content: TextItem[],
  addFinding: (...args: any[]) => void
): number {
  let risks = 0;

  for (const item of content) {
    for (const pattern of TEMPLATE_INJECTION_PATTERNS) {
      if (pattern.regex.test(item.text)) {
        // Reset regex lastIndex for global patterns
        pattern.regex.lastIndex = 0;
        risks++;
        addFinding(
          "security",
          pattern.name === "Script tag" || pattern.name === "JavaScript URI" ? "critical" : "warning",
          `תבנית לא בטוחה (${pattern.name}) זוהתה בתוכן`,
          `Unsafe pattern (${pattern.name}) detected in content`,
          item.location,
          "הסר תבניות קוד מתוכן שיווקי",
          "Remove code patterns from marketing content",
          true
        );
      }
    }
  }

  return risks;
}

// ═══════════════════════════════════════════════
// UNSAFE TEMPLATE DETECTION
// ═══════════════════════════════════════════════

// WhatsApp Business API template rules
const WHATSAPP_UNSAFE_PATTERNS = [
  { regex: /https?:\/\/bit\.ly|https?:\/\/tinyurl/gi, name: "shortened URL" },
  { regex: /!!!|[!]{2,}/g, name: "excessive exclamation" },
  { regex: /FREE|חינם|מבצע חד פעמי|הזדמנות אחרונה/gi, name: "spam trigger word" },
];

function detectUnsafeTemplates(
  content: TextItem[],
  addFinding: (...args: any[]) => void
): number {
  let unsafe = 0;

  for (const item of content) {
    for (const pattern of WHATSAPP_UNSAFE_PATTERNS) {
      if (pattern.regex.test(item.text)) {
        pattern.regex.lastIndex = 0;
        unsafe++;
        addFinding(
          "template", "warning",
          `תבנית הודעה עלולה להיחסם: ${pattern.name}`,
          `Message template may be blocked: ${pattern.name}`,
          item.location,
          "שנה ניסוח כדי להימנע מחסימת תבנית",
          "Rephrase to avoid template blocking"
        );
      }
    }

    // Check for very long content (WhatsApp has 1024 char limit for template body)
    if (item.text.length > 1024) {
      unsafe++;
      addFinding(
        "template", "info",
        `תוכן באורך ${item.text.length} תווים — חורג ממגבלת תבנית WhatsApp (1024)`,
        `Content is ${item.text.length} chars — exceeds WhatsApp template limit (1024)`,
        item.location,
        "קצר את התוכן ל-1024 תווים",
        "Shorten content to 1024 characters"
      );
    }
  }

  return unsafe;
}
