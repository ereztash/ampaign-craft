// ═══════════════════════════════════════════════
// DifferentiationTranscriptWizard — 6-step wizard
// Rides alongside the existing 5-phase form wizard.
// Entry: /differentiate?mode=transcript
// ═══════════════════════════════════════════════

import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toDifferentiationPrefill } from "@/types/profile";
import { tx } from "@/i18n/tx";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  ChevronLeft, ChevronRight, Upload, FileText,
  Loader2, CheckCircle2, XCircle, AlertCircle,
  Download, BarChart2, Sparkles,
} from "lucide-react";

import { STAGES, detectStagesInTranscript, type StageDetectionReport } from "@/engine/differentiation/conversationStages";
import { PRINCIPLES, aggregatePrincipleOutputs, type PrincipleAgentOutput, type ConvergenceReport } from "@/engine/differentiation/principles";
import { runPrincipleScan } from "@/engine/differentiation/principleAgents";
import { readFileAsText, downloadDifferentiationMarkdown, downloadPlanStage1Markdown } from "@/engine/differentiation/transcriptIO";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface IntakeData {
  clientName: string;
  industry: string;
  differentiationStatus: "none" | "weak" | "working" | "strong";
}

interface DraftData {
  oneSentence: string;
  paragraph: string;
  marketCheck: string;
}

// Steps 1-6
type StepId = 1 | 2 | 3 | 4 | 5 | 6;

interface WizardState {
  step: StepId;
  intake: IntakeData;
  transcript: string;
  stageReport: StageDetectionReport | null;
  scanOutputs: PrincipleAgentOutput[];
  convergence: ConvergenceReport | null;
  approvedCodes: Set<string>;
  draft: DraftData;
}

const STEP_LABELS: { he: string; en: string }[] = [
  { he: "פרטי לקוח", en: "Client Intake" },
  { he: "העלאת תמלול", en: "Session Upload" },
  { he: "סריקת 12 עקרונות", en: "12-Agent Scan" },
  { he: "מפת התכנסות", en: "Convergence Map" },
  { he: "טיוטת בידול", en: "Differentiation Draft" },
  { he: "ייצוא", en: "Export" },
];

// ───────────────────────────────────────────────
// Validation per step (Rule 1 in CLAUDE.md)
// ───────────────────────────────────────────────

function isStepValid(step: StepId, state: WizardState): boolean {
  switch (step) {
    case 1:
      return state.intake.clientName.trim().length > 0 &&
        state.intake.differentiationStatus !== undefined;
    case 2:
      return state.transcript.trim().length > 50;
    case 3:
      return state.scanOutputs.length > 0;
    case 4:
      return state.approvedCodes.size >= 1;
    case 5:
      return state.draft.oneSentence.trim().length > 0;
    case 6:
      return true;
    default:
      return false;
  }
}

// ───────────────────────────────────────────────
// Draft generation from principle outputs
// ───────────────────────────────────────────────

function buildDraftFromScan(
  outputs: PrincipleAgentOutput[],
  approvedCodes: Set<string>,
  clientName: string,
): DraftData {
  const approved = outputs.filter((o) => approvedCodes.has(o.principleCode) && !o.failed);
  const topHypotheses = approved
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3)
    .map((o) => o.differentiationHypothesis)
    .filter(Boolean);

  const topQuotes = approved
    .flatMap((o) => o.evidenceQuotes)
    .slice(0, 2);

  const principleNames = approved
    .slice(0, 3)
    .map((o) => {
      const def = PRINCIPLES.find((p) => p.code === o.principleCode);
      return def?.name.en ?? o.principleCode;
    });

  const oneSentence = topHypotheses[0] ||
    `${clientName} differentiates through ${principleNames.join(", ")}.`;

  const paragraph = topHypotheses.length > 1
    ? topHypotheses.join(" ")
    : `${oneSentence} ${topQuotes.join(" ")}`.trim();

  const marketCheck = approved.length >= 3
    ? `Strong differentiation signal across ${approved.length} principles. Ready for market positioning.`
    : `Partial signal (${approved.length} approved principles). Consider strengthening evidence before market positioning.`;

  return { oneSentence, paragraph, marketCheck };
}

// ───────────────────────────────────────────────
// Main component
// ───────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

const DifferentiationTranscriptWizard = ({ onBack }: Props) => {
  const { language, isRTL } = useLanguage();
  const reducedMotion = useReducedMotion();
  const { profile } = useUserProfile();

  // Auto-fill intake from profile (friction reducer — don't ask again)
  const profilePrefill = profile.unifiedProfile
    ? toDifferentiationPrefill(profile.unifiedProfile)
    : null;

  const [state, setState] = useState<WizardState>({
    step: 1,
    intake: {
      clientName: profilePrefill?.businessName || "",
      industry: profilePrefill?.industry || "",
      differentiationStatus: "none",
    },
    transcript: "",
    stageReport: null,
    scanOutputs: [],
    convergence: null,
    approvedCodes: new Set(),
    draft: { oneSentence: "", paragraph: "", marketCheck: "" },
  });

  const [scanProgress, setScanProgress] = useState<{ completed: number; total: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [direction, setDirection] = useState(1);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Navigation ──

  const goTo = (step: StepId, dir: 1 | -1) => {
    setDirection(dir);
    update({ step });
  };

  const handleNext = async () => {
    const current = state.step;

    // Step 2 → 3: detect stages and prepare scan (no fire yet)
    if (current === 2) {
      const report = detectStagesInTranscript(state.transcript);
      update({ stageReport: report, step: 3 });
      setDirection(1);
      return;
    }

    // Step 3: trigger scan if not already done
    if (current === 3 && state.scanOutputs.length === 0) {
      await handleScan();
      return;
    }

    // Step 4 → 5: build draft automatically
    if (current === 4) {
      const draft = buildDraftFromScan(state.scanOutputs, state.approvedCodes, state.intake.clientName);
      update({ draft, step: 5 });
      setDirection(1);
      return;
    }

    if (current < 6) {
      goTo((current + 1) as StepId, 1);
    }
  };

  const handlePrev = () => {
    if (state.step > 1) goTo((state.step - 1) as StepId, -1);
    else onBack();
  };

  // ── Scan ──

  const handleScan = async () => {
    setScanning(true);
    setScanError(null);
    setScanProgress({ completed: 0, total: 12 });

    try {
      const result = await runPrincipleScan(
        {
          transcript: state.transcript,
          clientContext: {
            businessName: state.intake.clientName,
            industry: state.intake.industry,
            differentiationStatus: state.intake.differentiationStatus,
          },
        },
        {
          onProgress: (p) => setScanProgress({ completed: p.completed, total: p.total }),
        },
      );

      // Auto-select all strong signals
      const autoApproved = new Set<string>(
        result.convergence.strongSignals.map((o) => o.principleCode),
      );

      update({
        scanOutputs: result.outputs,
        convergence: result.convergence,
        approvedCodes: autoApproved,
        step: 4,
      });
      setDirection(1);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  // ── File upload ──

  const handleFile = async (file: File) => {
    setFileLoading(true);
    try {
      const text = await readFileAsText(file);
      update({ transcript: text });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setFileLoading(false);
    }
  };

  // ── Export ──

  const handleExport = (target: "differentiation" | "plan") => {
    if (!state.stageReport || !state.convergence) return;
    const exportInput = {
      clientName: state.intake.clientName,
      industry: state.intake.industry,
      differentiationStatus: state.intake.differentiationStatus,
      transcript: state.transcript,
      stageReport: state.stageReport,
      principleOutputs: state.scanOutputs,
      convergence: state.convergence,
      differentiationDraft: state.draft.oneSentence ? state.draft : undefined,
      createdAt: new Date().toISOString(),
    };
    if (target === "differentiation") downloadDifferentiationMarkdown(exportInput);
    else downloadPlanStage1Markdown(exportInput);
  };

  // ── Animations ──

  const variants = reducedMotion
    ? undefined
    : {
        enter: (d: number) => ({ x: d > 0 ? (isRTL ? -240 : 240) : (isRTL ? 240 : -240), opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? (isRTL ? 240 : -240) : (isRTL ? -240 : 240), opacity: 0 }),
      };

  const progress = (state.step / 6) * 100;
  const canProceed = isStepValid(state.step, state);

  // ───────────────────────────────────────────────
  // Render helpers
  // ───────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" dir="auto">
          {tx({ he: "שם הלקוח *", en: "Client Name *" }, language)}
        </label>
        <Input
          value={state.intake.clientName}
          onChange={(e) => update({ intake: { ...state.intake, clientName: e.target.value } })}
          placeholder={tx({ he: "שם העסק / הלקוח", en: "Business / client name" }, language)}
          dir="auto"
        />
        {profilePrefill?.businessName && (
          <p className="text-xs text-muted-foreground" dir="auto">
            {tx({ he: "מולא אוטומטית מהפרופיל שלך", en: "Auto-filled from your profile" }, language)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" dir="auto">
          {tx({ he: "תעשייה", en: "Industry" }, language)}
        </label>
        <Input
          value={state.intake.industry}
          onChange={(e) => update({ intake: { ...state.intake, industry: e.target.value } })}
          placeholder={tx({ he: "לדוגמה: SaaS, ייעוץ, קמעוני", en: "e.g. SaaS, consulting, retail" }, language)}
          dir="auto"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" dir="auto">
          {tx({ he: "מצב בידול נוכחי *", en: "Current differentiation status *" }, language)}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["none", "weak", "working", "strong"] as const).map((s) => {
            const labels = {
              none: { he: "אין", en: "None" },
              weak: { he: "חלש", en: "Weak" },
              working: { he: "עובד חלקית", en: "Partially working" },
              strong: { he: "חזק", en: "Strong" },
            };
            return (
              <button
                key={s}
                type="button"
                onClick={() => update({ intake: { ...state.intake, differentiationStatus: s } })}
                className={`rounded-lg border p-3 text-sm transition-colors text-start ${
                  state.intake.differentiationStatus === s
                    ? "border-amber-500 bg-amber-500/10 font-medium"
                    : "border-border hover:border-amber-300"
                }`}
              >
                {tx(labels[s], language)}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground" dir="auto">
        {tx({ he: "שאר השדות יתמלאו בהמשך לפי תוכן התמלול", en: "Remaining fields auto-populate from the transcript content" }, language)}
      </p>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Drag-drop / file input */}
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center space-y-3 cursor-pointer hover:border-amber-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {fileLoading ? (
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500" />
        ) : (
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
        )}
        <p className="text-sm font-medium" dir="auto">
          {tx({ he: "גרור קובץ לכאן, או לחץ לבחירה", en: "Drag a file here, or click to browse" }, language)}
        </p>
        <p className="text-xs text-muted-foreground">
          .txt · .md · .docx
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {tx({ he: "או הדבק ישירות", en: "or paste directly" }, language)}
          </span>
        </div>
      </div>

      <Textarea
        value={state.transcript}
        onChange={(e) => update({ transcript: e.target.value })}
        placeholder={tx({ he: "הדבק את תמלול הפגישה כאן...", en: "Paste the meeting transcript here..." }, language)}
        className="min-h-[180px] font-mono text-xs"
        dir="auto"
      />

      {state.transcript.trim().length > 0 && (
        <p className="text-xs text-muted-foreground" dir="auto">
          {tx(
            {
              he: `${state.transcript.trim().split(/\s+/).length.toLocaleString()} מילים`,
              en: `${state.transcript.trim().split(/\s+/).length.toLocaleString()} words`,
            },
            language,
          )}
        </p>
      )}
    </div>
  );

  const renderStep3 = () => {
    if (scanning) {
      return (
        <div className="text-center space-y-6 py-8">
          <div className="relative mx-auto w-20 h-20">
            <Loader2 className="h-20 w-20 animate-spin text-amber-500" />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-amber-700">
              {scanProgress?.completed}/{scanProgress?.total}
            </span>
          </div>
          <div className="space-y-2">
            <p className="font-medium" dir="auto">
              {tx({ he: "סורק 12 עקרונות במקביל...", en: "Scanning 12 principles in parallel..." }, language)}
            </p>
            <Progress value={scanProgress ? (scanProgress.completed / scanProgress.total) * 100 : 0} className="h-1.5 max-w-xs mx-auto" />
          </div>
        </div>
      );
    }

    if (scanError) {
      return (
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{scanError}</p>
          </div>
          <Button onClick={handleScan} variant="outline">
            {tx({ he: "🔄 נסה שוב", en: "🔄 Retry" }, language)}
          </Button>
        </div>
      );
    }

    // Pre-scan: show stage detection results and invite the scan
    const report = state.stageReport;
    return (
      <div className="space-y-5">
        {report && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" dir="auto">
                {tx({ he: "כיסוי שלבי שיחה", en: "Conversation stage coverage" }, language)}
              </span>
              <Badge variant={report.coverage > 0.6 ? "default" : "secondary"}>
                {Math.round(report.coverage * 100)}%
              </Badge>
            </div>
            <Progress value={report.coverage * 100} className="h-1.5" />
            <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto pr-1">
              {STAGES.map((stage) => {
                const detected = report.detectedStages.find((d) => d.stageId === stage.id);
                return (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-1.5 text-xs p-1.5 rounded ${
                      detected?.detected ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {detected?.detected
                      ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      : <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <span dir="auto">{stage.name[language]}</span>
                  </div>
                );
              })}
            </div>
            {report.criticalMissing.length > 0 && (
              <p className="text-xs text-amber-600" dir="auto">
                {tx(
                  {
                    he: `⚠ שלב קריטי חסר: ${report.criticalMissing.join(", ")}`,
                    en: `⚠ Critical stage missing: ${report.criticalMissing.join(", ")}`,
                  },
                  language,
                )}
              </p>
            )}
          </div>
        )}

        <Button onClick={handleScan} className="w-full gap-2" size="lg">
          <Sparkles className="h-4 w-4" />
          {tx({ he: "הפעל סריקת 12 עקרונות", en: "Run 12-Principle Scan" }, language)}
        </Button>
      </div>
    );
  };

  const renderStep4 = () => {
    const sorted = [...state.scanOutputs]
      .filter((o) => !o.failed)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const toggleCode = (code: string) => {
      const next = new Set(state.approvedCodes);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      update({ approvedCodes: next });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground" dir="auto">
            {tx(
              { he: "אשר/דחה עקרונות. לפחות 1 חייב להישאר.", en: "Approve/reject principles. At least 1 must remain." },
              language,
            )}
          </p>
          <Badge variant={state.convergence?.convergence === "strong" ? "default" : "secondary"} dir="auto">
            {state.convergence?.convergence === "strong"
              ? tx({ he: "אות חזק", en: "Strong signal" }, language)
              : tx({ he: "אות חלש", en: "Weak signal" }, language)}
          </Badge>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {sorted.map((out) => {
            const def = PRINCIPLES.find((p) => p.code === out.principleCode);
            const approved = state.approvedCodes.has(out.principleCode);
            const scoreColor =
              out.relevanceScore >= 8 ? "text-emerald-600"
              : out.relevanceScore >= 6 ? "text-amber-600"
              : "text-muted-foreground";

            return (
              <button
                key={out.principleCode}
                type="button"
                onClick={() => toggleCode(out.principleCode)}
                className={`w-full text-start rounded-lg border p-3 transition-colors ${
                  approved
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                    : "border-border opacity-60 hover:opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{out.principleCode}</span>
                      <span className="text-sm font-medium" dir="auto">
                        {def?.name[language] ?? out.principleName}
                      </span>
                    </div>
                    {out.summaryObservation && (
                      <p className="text-xs text-muted-foreground" dir="auto">
                        {out.summaryObservation}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
                    {out.relevanceScore.toFixed(1)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground" dir="auto">
          {tx(
            {
              he: `${state.approvedCodes.size} עקרונות נבחרו`,
              en: `${state.approvedCodes.size} principles selected`,
            },
            language,
          )}
        </p>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" dir="auto">
          {tx({ he: "משפט בידול אחד *", en: "One differentiation sentence *" }, language)}
        </label>
        <Textarea
          value={state.draft.oneSentence}
          onChange={(e) => update({ draft: { ...state.draft, oneSentence: e.target.value } })}
          className="min-h-[72px]"
          dir="auto"
          placeholder={tx({ he: "המשפט שמגדיר את הבידול שלך...", en: "The sentence that defines your differentiation..." }, language)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" dir="auto">
          {tx({ he: "פסקת הרחבה", en: "Expanding paragraph" }, language)}
        </label>
        <Textarea
          value={state.draft.paragraph}
          onChange={(e) => update({ draft: { ...state.draft, paragraph: e.target.value } })}
          className="min-h-[120px]"
          dir="auto"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" dir="auto">
          {tx({ he: "בדיקת שוק", en: "Market check" }, language)}
        </label>
        <Textarea
          value={state.draft.marketCheck}
          onChange={(e) => update({ draft: { ...state.draft, marketCheck: e.target.value } })}
          className="min-h-[72px]"
          dir="auto"
        />
      </div>

      <p className="text-xs text-muted-foreground" dir="auto">
        {tx(
          {
            he: "הטקסט נוצר אוטומטית מהעקרונות שאישרת. ערוך לפי הצורך",
            en: "Text generated from approved principles. Edit as needed",
          },
          language,
        )}
      </p>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium" dir="auto">
            {tx({ he: "סיכום הסריקה", en: "Scan summary" }, language)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground" dir="auto">
          {tx(
            {
              he: `${state.approvedCodes.size} עקרונות מאושרים · ${state.convergence?.convergence === "strong" ? "אות חזק" : "אות חלש"}`,
              en: `${state.approvedCodes.size} approved principles · ${state.convergence?.convergence === "strong" ? "strong signal" : "weak signal"}`,
            },
            language,
          )}
        </p>
        {state.draft.oneSentence && (
          <p className="text-xs italic border-l-2 border-amber-400 pl-3 mt-2" dir="auto">
            {state.draft.oneSentence}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium" dir="auto">
          {tx(
            {
              he: "שמור את הקבצים לתוך ה-vault של Obsidian שלך:",
              en: "Save these files into your Obsidian vault:",
            },
            language,
          )}
        </p>
        <div className="text-xs text-muted-foreground font-mono space-y-1" dir="ltr">
          <p>Obsidian Clients/{state.intake.clientName || "Client"}/Differentiation.md</p>
          <p>Obsidian Clients/{state.intake.clientName || "Client"}/Plan-Stage1.md</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant="default"
          className="gap-2"
          onClick={() => handleExport("differentiation")}
        >
          <Download className="h-4 w-4" />
          <span dir="auto">{tx({ he: "Differentiation.md", en: "Differentiation.md" }, language)}</span>
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => handleExport("plan")}
        >
          <FileText className="h-4 w-4" />
          <span dir="auto">{tx({ he: "Plan Stage-1.md", en: "Plan Stage-1.md" }, language)}</span>
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (state.step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
    }
  };

  // ───────────────────────────────────────────────
  // Shell
  // ───────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicators */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-1">
          {STEP_LABELS.map((label, i) => {
            const num = (i + 1) as StepId;
            const done = num < state.step;
            const current = num === state.step;
            return (
              <div key={num} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    done ? "bg-amber-500 text-white"
                    : current ? "bg-amber-500/20 text-amber-700 border border-amber-400"
                    : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : num}
                </div>
                <span className="text-[10px] text-muted-foreground text-center hidden sm:block leading-tight" dir="auto">
                  {label[language]}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Step header */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-amber-700">
          {STEP_LABELS[state.step - 1][language]}
        </h2>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={state.step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: "easeInOut" }}
        >
          <Card>
            <CardContent className="p-6">
              {renderCurrentStep()}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handlePrev} className="gap-1">
          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {tx({ he: "חזרה", en: "Back" }, language)}
        </Button>

        {state.step < 6 && (
          <Button
            onClick={handleNext}
            disabled={!canProceed || scanning || fileLoading}
            className="gap-1"
          >
            {(scanning || fileLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
            {state.step === 3 && state.scanOutputs.length === 0
              ? tx({ he: "הפעל סריקה", en: "Run scan" }, language)
              : tx({ he: "המשך", en: "Continue" }, language)}
            {!scanning && !fileLoading && (isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DifferentiationTranscriptWizard;
