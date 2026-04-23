// ═══════════════════════════════════════════════
// M7 — Knowledge Extractor (Rule-Based Layer)
//
// Strictly-additive overlay: observes writes to shared_context + known
// form shapes and emits ExtractedFact objects using ONLY the closed
// predicates in graosOntology. Pure, synchronous, zero I/O.
//
// Two complementary paths:
//   1. This file (rule-based). Deterministic, no cost, runs inline in
//      hot paths. Covers ~60% of extractable facts (fields with known
//      shape: businessField, audienceType, budgetRange, etc.).
//   2. supabase/functions/extract-knowledge (LLM-based, async via
//      event_queue). Covers free-form fields (productDescription,
//      chat turns) that rules can't touch.
//
// Design notes:
//   - Every rule returns at most one fact per field and is a pure
//     function of the input. Same input → same output (idempotent).
//   - No LLM, no network. Runs in the browser, in edge functions, or
//     in tests with no setup.
//   - Rules know the concrete business field catalog in the app; when
//     the form adds a field, add a rule here or accept that the LLM
//     path will pick it up asynchronously.
//   - All output passes through verifyFact before landing in
//     knowledge_facts. A rule that produces an invalid triple (wrong
//     entity type, etc.) is a bug — tests enforce verifyFact passes.
// ═══════════════════════════════════════════════

import {
  canonicalize,
  EXTRACTOR_VERSION,
  type EntityRef,
  type ExtractedFact,
  type ObjectRef,
  type Predicate,
  type Regime,
} from "./graosOntology";

// ───────────────────────────────────────────────
// Input shape consumed by the rule engine. This matches the subset of
// FormData used by the wizard + differentiation phases. Unknown fields
// are ignored — we only extract what we recognize.
// ───────────────────────────────────────────────

export interface ExtractionContext {
  /** Source user — goes into the evidence record AND the fact's user_id. */
  userId: string;
  /** Source row in the corresponding table. Required for provenance. */
  sourceId: string;
  sourceTable:
    | "shared_context"
    | "saved_plans"
    | "differentiation_results"
    | "user_form_data"
    | "ai_coach_message"
    | "meta_insights"
    | "import";
  /** Current behavioral regime (M1). Optional — defaults to "stable". */
  regime?: Regime;
  /** DAPL snapshot (M5) if available. Stored as-is on the fact. */
  daplSnapshot?: Record<string, unknown>;
  /** When this context was captured. Defaults to Date.now(). */
  timestamp?: number;
}

export interface ExtractionInput {
  businessField?: string;
  audienceType?: string;
  salesModel?: string;
  budgetRange?: string;
  mainGoal?: string;
  experienceLevel?: string;
  productDescription?: string;
  averagePrice?: number;
  existingChannels?: string[];
  competitors?: string[];
  topPainPoint?: string;
  industryPains?: string[];
  identityStatement?: string;
  mechanism?: string;
  topHiddenValues?: string[];
  archetype?: string;
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function makeEntityRef(type: EntityRef["type"], raw: string): EntityRef {
  return { type, canonical: canonicalize(raw) };
}

function makeLiteral(value: string | number | boolean): ObjectRef {
  return { literal: typeof value === "string" ? value.trim().slice(0, 500) : value };
}

interface RuleOutput {
  subject: EntityRef;
  predicate: Predicate;
  object: ObjectRef;
  /** Confidence before regime floor is applied. The caller may adjust. */
  baseConfidence: number;
  /** Short fragment of source text for the evidence.quote column. */
  quote: string;
}

/**
 * Build a complete ExtractedFact from a rule's RuleOutput + context.
 * Applies canonicalization defensively (the rules already call
 * canonicalize() but doing it again costs nothing and guarantees the
 * invariant that verifyFact's anti-injection canonical-equality check
 * is satisfied).
 */
function toFact(rule: RuleOutput, ctx: ExtractionContext): ExtractedFact {
  const subject = { ...rule.subject, canonical: canonicalize(rule.subject.canonical) };
  const object: ObjectRef = "type" in rule.object
    ? { type: rule.object.type, canonical: canonicalize(rule.object.canonical) }
    : { literal: rule.object.literal };
  return {
    subject,
    predicate: rule.predicate,
    object,
    confidence: rule.baseConfidence,
    evidence: {
      source_table: ctx.sourceTable,
      source_id: ctx.sourceId,
      quote: rule.quote.slice(0, 500),
    },
    dapl_snapshot: ctx.daplSnapshot,
    regime: ctx.regime,
    extracted_by: "m7-rule-based",
    extractor_version: EXTRACTOR_VERSION,
  };
}

// ───────────────────────────────────────────────
// Rules — one function per recognized field. Each rule returns 0..N
// RuleOutput items. They deliberately do NOT call verifyFact/toFact;
// that's the caller's job.
// ───────────────────────────────────────────────

function ruleBusinessField(input: ExtractionInput): RuleOutput[] {
  const v = input.businessField;
  if (!v) return [];
  return [
    {
      subject: makeEntityRef("business", "self"),
      predicate: "operates_in_market",
      object: makeLiteral(v),
      baseConfidence: 0.9,
      quote: `businessField=${v}`,
    },
  ];
}

function ruleAudience(input: ExtractionInput): RuleOutput[] {
  const v = input.audienceType;
  if (!v) return [];
  return [
    {
      subject: makeEntityRef("business", "self"),
      predicate: "targets_audience",
      object: makeEntityRef("audience", v),
      baseConfidence: 0.9,
      quote: `audienceType=${v}`,
    },
  ];
}

function ruleCompetitors(input: ExtractionInput): RuleOutput[] {
  const list = input.competitors;
  if (!Array.isArray(list) || list.length === 0) return [];
  const out: RuleOutput[] = [];
  for (const name of list.slice(0, 20)) {
    if (typeof name !== "string" || name.trim().length === 0) continue;
    out.push({
      subject: makeEntityRef("business", "self"),
      predicate: "competes_with",
      object: makeEntityRef("competitor", name),
      baseConfidence: 0.85,
      quote: `competitor: ${name.slice(0, 120)}`,
    });
  }
  return out;
}

function ruleChannels(input: ExtractionInput): RuleOutput[] {
  const list = input.existingChannels;
  if (!Array.isArray(list) || list.length === 0) return [];
  // existing channels don't yet have a converted_on metric; we only
  // assert the business "operates" the channel. Use a literal so we
  // don't create a standalone channel entity without evidence of
  // performance. Once the Meta sync lands, the LLM extractor can
  // upgrade this to converted_on with real numbers.
  return list.slice(0, 20).map((ch) => ({
    subject: makeEntityRef("business", "self"),
    predicate: "plans_to" as Predicate,
    object: makeLiteral(`use-channel-${ch}`),
    baseConfidence: 0.7,
    quote: `existingChannels contains ${String(ch).slice(0, 80)}`,
  }));
}

function rulePainPoints(input: ExtractionInput): RuleOutput[] {
  const out: RuleOutput[] = [];
  const addPain = (text: string, conf: number, quote: string) => {
    const t = text.trim();
    if (t.length === 0) return;
    // Audience-of-self maps to the business's target audience; we
    // intentionally don't invent a persona entity here — the LLM path
    // can refine when it sees richer context.
    const audienceRef = makeEntityRef("audience", input.audienceType ?? "customers");
    const painRef = makeEntityRef("pain", t.slice(0, 80));
    out.push({
      subject: audienceRef,
      predicate: "experiences_pain",
      object: painRef,
      baseConfidence: conf,
      quote,
    });
  };

  if (input.topPainPoint) addPain(input.topPainPoint, 0.8, `topPainPoint: ${input.topPainPoint}`);
  if (Array.isArray(input.industryPains)) {
    for (const p of input.industryPains.slice(0, 10)) {
      if (typeof p === "string") addPain(p, 0.7, `industryPain: ${p.slice(0, 120)}`);
    }
  }
  return out;
}

function ruleArchetype(input: ExtractionInput): RuleOutput[] {
  const v = input.archetype;
  if (!v) return [];
  return [
    {
      subject: makeEntityRef("business", "self"),
      predicate: "exhibits_archetype",
      object: makeLiteral(v),
      baseConfidence: 0.85,
      quote: `archetype=${v}`,
    },
  ];
}

function ruleHiddenValues(input: ExtractionInput): RuleOutput[] {
  const list = input.topHiddenValues;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.slice(0, 10).map((v) => ({
    subject: makeEntityRef("business", "self"),
    predicate: "plans_to" as Predicate,
    object: makeLiteral(`highlight-value-${String(v).slice(0, 120)}`),
    baseConfidence: 0.75,
    quote: `hiddenValue: ${String(v).slice(0, 120)}`,
  }));
}

function ruleMechanism(input: ExtractionInput): RuleOutput[] {
  const v = input.mechanism;
  if (!v || v.trim().length === 0) return [];
  return [
    {
      subject: makeEntityRef("business", "self"),
      predicate: "has_product",
      object: makeEntityRef("product", v.slice(0, 120)),
      baseConfidence: 0.8,
      quote: `mechanism: ${v.slice(0, 200)}`,
    },
  ];
}

const RULES: Array<(i: ExtractionInput) => RuleOutput[]> = [
  ruleBusinessField,
  ruleAudience,
  ruleCompetitors,
  ruleChannels,
  rulePainPoints,
  ruleArchetype,
  ruleHiddenValues,
  ruleMechanism,
];

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

export interface ExtractionResult {
  /** Facts that passed every rule's internal checks. The caller is
   *  still responsible for running verifyFact on each and writing
   *  only the accepted ones. */
  facts: ExtractedFact[];
  /** Count of rules that fired (fired != produced a fact, because a
   *  rule can produce 0 outputs when the field is missing). */
  rulesFired: number;
}

export function extractFacts(
  input: ExtractionInput,
  ctx: ExtractionContext,
): ExtractionResult {
  const facts: ExtractedFact[] = [];
  let rulesFired = 0;
  for (const rule of RULES) {
    const outputs = rule(input);
    if (outputs.length > 0) rulesFired += 1;
    for (const out of outputs) {
      facts.push(toFact(out, ctx));
    }
  }
  return { facts, rulesFired };
}

/**
 * Returns true when the input has enough recognizable structured
 * fields that the rule-based engine can produce meaningful output.
 * Used by the pipeline to decide whether to skip the LLM fallback.
 */
export function hasRuleCoverage(input: ExtractionInput): boolean {
  return Boolean(
    input.businessField ||
    input.audienceType ||
    input.archetype ||
    input.mechanism ||
    (Array.isArray(input.competitors) && input.competitors.length > 0) ||
    input.topPainPoint,
  );
}
