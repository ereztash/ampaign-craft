import { useLanguage } from "@/i18n/LanguageContext";
import { PhaseQuestion, DifferentiationFormData, HiddenValueScore, HiddenValueType, CompetitorArchetype, CompetitorArchetypeId, BuyingCommitteeRole, BuyingCommitteeRoleId, ClaimExample } from "@/types/differentiation";
import { HIDDEN_VALUES, COMPETITOR_ARCHETYPES as ARCHETYPE_DEFS, BUYING_COMMITTEE_ROLES as ROLE_DEFS } from "@/engine/differentiationKnowledge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { Plus, X } from "lucide-react";

interface PhaseCardProps {
  questions: PhaseQuestion[];
  formData: DifferentiationFormData;
  onUpdate: (partial: Partial<DifferentiationFormData>) => void;
}

const DifferentiationPhaseCard = ({ questions, formData, onUpdate }: PhaseCardProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";

  const renderQuestion = (q: PhaseQuestion) => {
    switch (q.type) {
      case "text":
        return (
          <Input
            id={`diff-${q.id}`}
            value={(formData as unknown as Record<string, string>)[q.id] || ""}
            onChange={(e) => onUpdate({ [q.id]: e.target.value })}
            placeholder={q.placeholder?.[language]}
            dir="auto"
          />
        );

      case "textarea":
        return (
          <Textarea
            id={`diff-${q.id}`}
            value={(formData as unknown as Record<string, string>)[q.id] || ""}
            onChange={(e) => onUpdate({ [q.id]: e.target.value })}
            placeholder={q.placeholder?.[language]}
            className="min-h-[80px]"
            dir="auto"
          />
        );

      case "select":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options?.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => onUpdate({ [q.id]: opt.value })}
                aria-pressed={(formData as unknown as Record<string, string>)[q.id] === opt.value}
                className={`rounded-lg border p-3 text-sm text-start transition-colors ${
                  (formData as unknown as Record<string, string>)[q.id] === opt.value
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {opt.label[language]}
              </button>
            ))}
          </div>
        );

      case "competitor-list":
        return <CompetitorList formData={formData} onUpdate={onUpdate} placeholder={q.placeholder?.[language] || ""} maxItems={q.maxItems || 3} />;

      case "claim-evidence-pairs":
        return <ClaimEvidencePairs formData={formData} onUpdate={onUpdate} />;

      case "slider":
        return <HiddenValueSliders formData={formData} onUpdate={onUpdate} />;

      case "multi-select":
        if (q.id === "competitorArchetypes") {
          return <CompetitorArchetypeSelector formData={formData} onUpdate={onUpdate} options={q.options || []} />;
        }
        if (q.id === "buyingCommittee") {
          return <BuyingCommitteeSelector formData={formData} onUpdate={onUpdate} options={q.options || []} />;
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          {q.normalizingFrame && (
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-sm text-muted-foreground italic" dir="auto">
              {q.normalizingFrame[language]}
            </div>
          )}
          <label htmlFor={`diff-${q.id}`} className="text-sm font-medium text-foreground" dir="auto">
            {q.label[language]}
            {q.required && <span className="text-destructive ms-1">*</span>}
          </label>
          {q.helperText && (
            <p className="text-xs text-muted-foreground" dir="auto">{q.helperText[language]}</p>
          )}
          {renderQuestion(q)}
        </div>
      ))}
    </div>
  );
};

// === SUB-COMPONENTS ===

function CompetitorList({ formData, onUpdate, placeholder, maxItems }: { formData: DifferentiationFormData; onUpdate: (p: Partial<DifferentiationFormData>) => void; placeholder: string; maxItems: number }) {
  const { language } = useLanguage();
  const competitors = formData.topCompetitors;

  const add = () => {
    if (competitors.length < maxItems) onUpdate({ topCompetitors: [...competitors, ""] });
  };
  const remove = (i: number) => onUpdate({ topCompetitors: competitors.filter((_, idx) => idx !== i) });
  const change = (i: number, val: string) => {
    const next = [...competitors];
    next[i] = val;
    onUpdate({ topCompetitors: next });
  };

  return (
    <div className="space-y-2">
      {competitors.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={c} onChange={(e) => change(i, e.target.value)} placeholder={`${placeholder} ${i + 1}`} aria-label={`${tx({ he: "מתחרה", en: "Competitor" }, language)} ${i + 1}`} dir="auto" />
          <Button variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0"><X className="h-4 w-4" /></Button>
        </div>
      ))}
      {competitors.length < maxItems && (
        <Button variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="h-3 w-3" /> {competitors.length === 0 ? "Add competitor" : "Add another"}
        </Button>
      )}
    </div>
  );
}

function ClaimEvidencePairs({ formData, onUpdate }: { formData: DifferentiationFormData; onUpdate: (p: Partial<DifferentiationFormData>) => void }) {
  const { language } = useLanguage();
  const claims = formData.claimExamples;

  // Auto-generate claim slots from currentPositioning if empty
  if (claims.length === 0 && formData.currentPositioning.trim()) {
    const sentences = formData.currentPositioning.split(/[.;,\n]/).filter((s) => s.trim().length > 5).slice(0, 3);
    if (sentences.length > 0) {
      const initial: ClaimExample[] = sentences.map((s) => ({ claim: s.trim(), evidence: "", verified: false, gap: "" }));
      onUpdate({ claimExamples: initial });
      return null;
    }
  }

  const updateClaim = (i: number, field: keyof ClaimExample, val: string) => {
    const next = [...claims];
    next[i] = { ...next[i], [field]: val };
    onUpdate({ claimExamples: next });
  };

  return (
    <div className="space-y-4">
      {claims.map((c, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={c.verified ? "default" : "outline"} className="text-xs">
              {language === "he" ? `טענה ${i + 1}` : `Claim ${i + 1}`}
            </Badge>
            {c.verified && <Badge className="text-xs bg-accent">✓</Badge>}
          </div>
          <p className="text-sm font-medium" dir="auto">{c.claim}</p>
          <Textarea
            value={c.evidence}
            onChange={(e) => updateClaim(i, "evidence", e.target.value)}
            placeholder={language === "he" ? "ראיה: שם לקוח, מספר, תוצאה ספציפית..." : "Evidence: client name, number, specific outcome..."}
            className="min-h-[60px]"
            dir="auto"
          />
          {c.gap && (
            <p className="text-xs text-amber-600" dir="auto">{c.gap}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function HiddenValueSliders({ formData, onUpdate }: { formData: DifferentiationFormData; onUpdate: (p: Partial<DifferentiationFormData>) => void }) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const values = formData.hiddenValues;

  // Emoji icons make each value instantly recognizable
  const VALUE_ICONS: Record<string, string> = {
    legitimacy: "\u{1F3C6}", risk: "\u{1F6E1}\uFE0F", identity: "\u{1F6A9}", cognitive_ease: "\u{1F4A1}",
    autonomy: "\u{1F3AE}", status: "\u{2B50}", empathy: "\u{1F91D}", narrative: "\u{1F4D6}",
    convenience: "\u{26A1}", aesthetic: "\u{1F3A8}", belonging: "\u{1F465}", self_expression: "\u{1F58C}\uFE0F",
    guilt_free: "\u{1F33F}", instant_gratification: "\u{1F381}",
  };

  // 3 clear levels instead of confusing 1-5 slider
  const LEVELS = [
    { score: 1, he: "לא משפיע", en: "Low impact", color: "border-border text-muted-foreground" },
    { score: 3, he: "חשוב", en: "Important", color: "border-primary/50 text-primary bg-primary/5" },
    { score: 5, he: "קריטי", en: "Critical", color: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
  ];

  const updateValue = (valueId: HiddenValueType, score: number) => {
    const existing = values.find((v) => v.valueId === valueId);
    if (existing) {
      onUpdate({ hiddenValues: values.map((v) => v.valueId === valueId ? { ...v, score } : v) });
    } else {
      onUpdate({ hiddenValues: [...values, { valueId, score, signal: "" }] });
    }
  };

  const ratedCount = values.filter((v) => v.score > 0).length;

  return (
    <div className="space-y-3">
      {/* Progress hint */}
      <p className="text-xs text-muted-foreground text-center" dir="auto">
        {isHe
          ? `${ratedCount}/${HIDDEN_VALUES.length} דורגו. לחצו על הרמה המתאימה`
          : `${ratedCount}/${HIDDEN_VALUES.length} rated. Tap the right level`}
      </p>

      {HIDDEN_VALUES.map((hv) => {
        const current = values.find((v) => v.valueId === hv.id);
        const currentScore = current?.score || 0;
        const icon = VALUE_ICONS[hv.id] || "";

        return (
          <div key={hv.id} className="rounded-xl border p-3 space-y-2">
            {/* Probe question as primary label (plain language) */}
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug" dir="auto">
                  {hv.probe[language]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{hv[language]}</p>
              </div>
            </div>

            {/* 3-level tap selector instead of slider */}
            <div className="flex gap-2">
              {LEVELS.map((level) => (
                <button
                  key={level.score}
                  type="button"
                  onClick={() => updateValue(hv.id, level.score)}
                  className={`flex-1 rounded-lg border-2 py-1.5 px-2 text-xs font-medium transition-all ${
                    currentScore === level.score
                      ? level.color + " shadow-sm"
                      : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {level[language]}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompetitorArchetypeSelector({ formData, onUpdate, options }: { formData: DifferentiationFormData; onUpdate: (p: Partial<DifferentiationFormData>) => void; options: { value: string; label: { he: string; en: string } }[] }) {
  const { language } = useLanguage();
  const competitors = formData.topCompetitors.filter((c) => c.trim());
  const archetypes = formData.competitorArchetypes;

  const setArchetype = (competitorName: string, archetypeId: string) => {
    const existing = archetypes.find((a) => a.name === competitorName);
    if (existing) {
      onUpdate({ competitorArchetypes: archetypes.map((a) => a.name === competitorName ? { ...a, archetype: archetypeId as CompetitorArchetypeId } : a) });
    } else {
      onUpdate({ competitorArchetypes: [...archetypes, { name: competitorName, archetype: archetypeId as CompetitorArchetypeId, threat_level: "medium", counter_strategy: "" }] });
    }
  };

  return (
    <div className="space-y-4">
      {competitors.map((comp) => {
        const current = archetypes.find((a) => a.name === comp);
        return (
          <div key={comp} className="rounded-lg border p-3">
            <div className="text-sm font-medium mb-2">{comp}</div>
            <div className="grid grid-cols-1 gap-1.5">
              {options.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setArchetype(comp, opt.value)}
                  aria-pressed={current?.archetype === opt.value}
                  className={`text-start rounded-md border p-2 text-xs transition-colors ${
                    current?.archetype === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  {opt.label[language]}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BuyingCommitteeSelector({ formData, onUpdate, options }: { formData: DifferentiationFormData; onUpdate: (p: Partial<DifferentiationFormData>) => void; options: { value: string; label: { he: string; en: string } }[] }) {
  const { language } = useLanguage();
  const selected = formData.buyingCommitteeMap ?? [];
  const selectedIds = new Set((selected || []).map((r) => r.role));

  const toggle = (roleId: string) => {
    if (selectedIds.has(roleId as BuyingCommitteeRoleId)) {
      onUpdate({ buyingCommitteeMap: selected.filter((r) => r.role !== roleId) });
    } else {
      const roleDef = ROLE_DEFS.find((r) => r.id === roleId);
      onUpdate({ buyingCommitteeMap: [...selected, { role: roleId as BuyingCommitteeRoleId, primaryConcern: roleDef?.primaryConcern || "", narrative: "" }] });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => toggle(opt.value)}
          aria-pressed={selectedIds.has(opt.value as BuyingCommitteeRoleId)}
          className={`text-start rounded-lg border p-3 text-sm transition-colors ${
            selectedIds.has(opt.value as BuyingCommitteeRoleId) ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
          }`}
        >
          {opt.label[language]}
        </button>
      ))}
    </div>
  );
}

export default DifferentiationPhaseCard;
