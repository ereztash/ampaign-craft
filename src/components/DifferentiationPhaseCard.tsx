import { useLanguage } from "@/i18n/LanguageContext";
import { PhaseQuestion, DifferentiationFormData, HiddenValueScore, HiddenValueType, CompetitorArchetype, CompetitorArchetypeId, BuyingCommitteeRole, BuyingCommitteeRoleId, ClaimExample } from "@/types/differentiation";
import { HIDDEN_VALUES, COMPETITOR_ARCHETYPES as ARCHETYPE_DEFS, BUYING_COMMITTEE_ROLES as ROLE_DEFS } from "@/engine/differentiationKnowledge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
            value={(formData as Record<string, string>)[q.id] || ""}
            onChange={(e) => onUpdate({ [q.id]: e.target.value })}
            placeholder={q.placeholder?.[language]}
            dir="auto"
          />
        );

      case "textarea":
        return (
          <Textarea
            id={`diff-${q.id}`}
            value={(formData as Record<string, string>)[q.id] || ""}
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
                aria-pressed={(formData as Record<string, string>)[q.id] === opt.value}
                className={`rounded-lg border p-3 text-sm text-start transition-colors ${
                  (formData as Record<string, string>)[q.id] === opt.value
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
          <Input value={c} onChange={(e) => change(i, e.target.value)} placeholder={`${placeholder} ${i + 1}`} dir="auto" />
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
  const values = formData.hiddenValues;

  const updateValue = (valueId: HiddenValueType, score: number) => {
    const existing = values.find((v) => v.valueId === valueId);
    if (existing) {
      onUpdate({ hiddenValues: values.map((v) => v.valueId === valueId ? { ...v, score } : v) });
    } else {
      onUpdate({ hiddenValues: [...values, { valueId, score, signal: "" }] });
    }
  };

  return (
    <div className="space-y-4">
      {HIDDEN_VALUES.map((hv) => {
        const current = values.find((v) => v.valueId === hv.id);
        return (
          <div key={hv.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{hv[language]}</span>
              <Badge variant="outline">{current?.score || 1}/5</Badge>
            </div>
            <p className="text-xs text-muted-foreground italic" dir="auto">{hv.probe[language]}</p>
            <input
              type="range" min={1} max={5} step={1}
              value={current?.score || 1}
              onChange={(e) => updateValue(hv.id, Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{language === "he" ? "לא חשוב" : "Not important"}</span>
              <span>{language === "he" ? "קריטי" : "Critical"}</span>
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
  const selected = formData.buyingCommitteeMap;
  const selectedIds = new Set(selected.map((r) => r.role));

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
