// ═══════════════════════════════════════════════════════════════
// src/pages/FunnelGenesis.tsx
//
// Five-step business profiling wizard — the "first win" for new users.
//
// Applies Genesis Mode from lessons/saas/spec/02b-genesis-mode.md:
//   elicitation → BusinessSpec IR → moatScorer → persist → reveal score
//
// Design rules:
// 1. No back navigation between steps (resetting means starting over).
// 2. All steps: one screen, large tap targets, minimal free-text.
// 3. The moat score reveal is the first win — makes the 5 minutes feel earned.
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Building2, Layers, Swords, Target, Shield,
  ArrowRight, Plus, X, Loader2, Sparkles, AlertCircle,
} from "lucide-react";
import type {
  BusinessSpec,
  Competitor,
  TeamSize,
  SalesMotion,
  Bottleneck,
  Fear,
  MoatScore,
} from "@/viewmodels/funnel-genesis.vm";
import { computeMoatScore } from "@/viewmodels/funnel-genesis.vm";

type Step = 1 | 2 | 3 | 4 | 5 | "result";
const TOTAL_STEPS = 5;

const MOAT_LABEL_CONFIG = {
  weak:       { he: "חלש",    en: "Weak",       cls: "bg-red-100 text-red-700 border-red-200" },
  developing: { he: "מתפתח",   en: "Developing", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  strong:     { he: "חזק",    en: "Strong",     cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  fortress:   { he: "מבצר",   en: "Fortress",   cls: "bg-violet-100 text-violet-700 border-violet-200" },
} as const;

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {children}
    </motion.div>
  );
}

function RadioCard({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all select-none ${
        active
          ? "border-primary ring-1 ring-primary bg-primary/5"
          : "hover:border-primary/40"
      }`}
    >
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

const FunnelGenesis = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry]       = useState("");
  const [teamSize, setTeamSize]       = useState<TeamSize | "">("" as TeamSize | "");

  // Step 2
  const [offer, setOffer]           = useState("");
  const [icp, setIcp]               = useState("");
  const [pricePoint, setPricePoint] = useState("");
  const [salesMotion, setSalesMotion] = useState<SalesMotion | "">("" as SalesMotion | "");

  // Step 3
  const [competitors, setCompetitors]     = useState<Competitor[]>([{ name: "", weakness: "" }]);
  const [differentiator, setDifferentiator] = useState("");

  // Step 4
  const [bottleneck, setBottleneck] = useState<Bottleneck | "">("" as Bottleneck | "");

  // Step 5
  const [winCondition, setWinCondition] = useState("");
  const [fear, setFear]                 = useState<Fear | "">("" as Fear | "");

  const [moatResult, setMoatResult] = useState<MoatScore | null>(null);

  const buildSpec = (): BusinessSpec => ({
    companyName,
    industry,
    teamSize: teamSize as TeamSize,
    foundedYear: null,
    offer,
    icp,
    pricePoint,
    salesMotion: salesMotion as SalesMotion,
    competitors: competitors.filter((c) => c.name.trim()),
    differentiator,
    bottleneck: bottleneck as Bottleneck,
    winCondition,
    fear: fear as Fear,
  });

  const saveMutation = useMutation({
    mutationFn: async (spec: BusinessSpec) => {
      const score = computeMoatScore(spec);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("business_profiles").upsert(
        {
          user_id:       user!.id,
          company_name:  spec.companyName,
          industry:      spec.industry,
          team_size:     spec.teamSize,
          offer:         spec.offer,
          icp:           spec.icp,
          price_point:   spec.pricePoint,
          sales_motion:  spec.salesMotion,
          competitors:   spec.competitors,
          differentiator: spec.differentiator,
          bottleneck:    spec.bottleneck,
          win_condition: spec.winCondition,
          fear:          spec.fear,
          moat_score:    score.total,
          updated_at:    new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw new Error(error.message);
      return score;
    },
    onSuccess: (score) => {
      // Optimistically update the GenesisGuard cache so navigating to /home
      // after this screen doesn't re-trigger the redirect.
      queryClient.setQueryData(["genesis-check", user?.id], 1);
      setMoatResult(score);
      setStep("result");
    },
  });

  const progressPct = step === "result" ? 100 : ((step as number) / TOTAL_STEPS) * 100;

  const step1Ok = companyName.trim().length >= 2 && industry.trim().length >= 2 && !!teamSize;
  const step2Ok = offer.trim().length >= 15 && icp.trim().length >= 10 && pricePoint.trim().length >= 2 && !!salesMotion;
  const step3Ok = differentiator.trim().length >= 15;
  const step4Ok = !!bottleneck;
  const step5Ok = winCondition.trim().length >= 15 && !!fear;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Funnel Genesis</span>
        </div>
        {step !== "result" && (
          <div className="space-y-1">
            <Progress value={progressPct} className="h-1.5" />
            <p className="text-xs text-muted-foreground text-center">
              {tx({ he: `שלב ${step} מתוך ${TOTAL_STEPS}`, en: `Step ${step} of ${TOTAL_STEPS}` }, language)}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ── 1: Company DNA ─────────────────────────────────────────────── */}
        {step === 1 && (
          <StepShell key="s1">
            <div className="text-center space-y-1">
              <Building2 className="h-8 w-8 text-primary mx-auto" />
              <h1 className="text-2xl font-bold" dir="auto">
                {tx({ he: "קצת עלייך", en: "Tell us about your company" }, language)}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {tx({ he: "3 שאלות, פחות מדקה.", en: "3 questions, under a minute." }, language)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium" dir="auto">
                  {tx({ he: "שם החברה", en: "Company name" }, language)}
                </label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium" dir="auto">
                  {tx({ he: "תעשייה", en: "Industry" }, language)}
                </label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder={isHe ? "SaaS B2B, אי-קומרס, נדל\"ן..." : "B2B SaaS, e-commerce, real estate..."}
                  className="mt-1"
                  dir="auto"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" dir="auto">
                  {tx({ he: "גודל הצוות", en: "Team size" }, language)}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(["solo", "2-5", "6-20", "21-50", "50+"] as TeamSize[]).map((s) => (
                    <RadioCard key={s} active={teamSize === s} onClick={() => setTeamSize(s)}>
                      <div className="text-center text-sm font-semibold">{s}</div>
                    </RadioCard>
                  ))}
                </div>
              </div>
            </div>

            <Button size="lg" className="w-full gap-2" disabled={!step1Ok} onClick={() => setStep(2)}>
              {tx({ he: "המשך", en: "Continue" }, language)} <ArrowRight className="h-4 w-4" />
            </Button>
          </StepShell>
        )}

        {/* ── 2: The Offer ───────────────────────────────────────────────── */}
        {step === 2 && (
          <StepShell key="s2">
            <div className="text-center space-y-1">
              <Layers className="h-8 w-8 text-primary mx-auto" />
              <h1 className="text-2xl font-bold" dir="auto">
                {tx({ he: "ה-Offer שלך", en: "Your offer" }, language)}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {tx({ he: "מה אתה מוכר ולמי.", en: "What you sell and to whom." }, language)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium" dir="auto">
                  {tx({ he: "מה אתה מוכר? (משפט אחד)", en: "What do you sell? (one sentence)" }, language)}
                </label>
                <Textarea
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder={isHe ? "תוכנה שעוזרת ל..." : "Software that helps..."}
                  rows={2}
                  className="mt-1"
                  dir="auto"
                />
              </div>
              <div>
                <label className="text-sm font-medium" dir="auto">
                  {tx({ he: "הלקוח האידיאלי שלך (ICP)", en: "Your ideal customer (ICP)" }, language)}
                </label>
                <Input
                  value={icp}
                  onChange={(e) => setIcp(e.target.value)}
                  placeholder={isHe ? "מנהלי שיווק בחברות SaaS עם 10-100 עובדים" : "Marketing managers at 10-100 person SaaS companies"}
                  className="mt-1"
                  dir="auto"
                />
              </div>
              <div>
                <label className="text-sm font-medium" dir="auto">
                  {tx({ he: "מה עולה עסקה טיפוסית?", en: "Typical deal price?" }, language)}
                </label>
                <Input
                  value={pricePoint}
                  onChange={(e) => setPricePoint(e.target.value)}
                  placeholder={isHe ? "$500/חודש, $5,000/שנה..." : "$500/month, $5k/year..."}
                  className="mt-1"
                  dir="auto"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" dir="auto">
                  {tx({ he: "מודל מכירה", en: "Sales motion" }, language)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "inbound"  as SalesMotion, he: "Inbound",          en: "Inbound" },
                    { id: "outbound" as SalesMotion, he: "Outbound",         en: "Outbound" },
                    { id: "plg"      as SalesMotion, he: "Product-Led (PLG)", en: "Product-Led (PLG)" },
                    { id: "mixed"    as SalesMotion, he: "משולב",            en: "Mixed" },
                  ]).map(({ id, he, en }) => (
                    <RadioCard key={id} active={salesMotion === id} onClick={() => setSalesMotion(id)}>
                      <div className="text-sm font-semibold text-center" dir="auto">{isHe ? he : en}</div>
                    </RadioCard>
                  ))}
                </div>
              </div>
            </div>

            <Button size="lg" className="w-full gap-2" disabled={!step2Ok} onClick={() => setStep(3)}>
              {tx({ he: "המשך", en: "Continue" }, language)} <ArrowRight className="h-4 w-4" />
            </Button>
          </StepShell>
        )}

        {/* ── 3: Competition ──────────────────────────────────────────────── */}
        {step === 3 && (
          <StepShell key="s3">
            <div className="text-center space-y-1">
              <Swords className="h-8 w-8 text-primary mx-auto" />
              <h1 className="text-2xl font-bold" dir="auto">
                {tx({ he: "המתחרים שלך", en: "Your competition" }, language)}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {tx({ he: "עד 3 מתחרים + מה מבדל אותך.", en: "Up to 3 competitors + your real edge." }, language)}
              </p>
            </div>

            <div className="space-y-2">
              {competitors.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={c.name}
                      onChange={(e) => {
                        const next = [...competitors];
                        next[i] = { ...next[i], name: e.target.value };
                        setCompetitors(next);
                      }}
                      placeholder={isHe ? "שם מתחרה" : "Competitor name"}
                      dir="auto"
                    />
                    <Input
                      value={c.weakness}
                      onChange={(e) => {
                        const next = [...competitors];
                        next[i] = { ...next[i], weakness: e.target.value };
                        setCompetitors(next);
                      }}
                      placeholder={isHe ? "החולשה שלהם" : "Their weakness"}
                      dir="auto"
                    />
                  </div>
                  {competitors.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {competitors.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setCompetitors([...competitors, { name: "", weakness: "" }])}
                >
                  <Plus className="h-4 w-4" />
                  {tx({ he: "הוסף מתחרה", en: "Add competitor" }, language)}
                </Button>
              )}
            </div>

            <div>
              <label className="text-sm font-medium" dir="auto">
                {tx({ he: "מה מבדל אותך לאמיתי? (לא שיווק — המהות)", en: "What truly differentiates you? (not marketing — the real thing)" }, language)}
              </label>
              <Textarea
                value={differentiator}
                onChange={(e) => setDifferentiator(e.target.value)}
                placeholder={isHe ? "אנחנו היחידים ש..." : "We're the only ones who..."}
                rows={3}
                className="mt-1"
                dir="auto"
              />
            </div>

            <Button size="lg" className="w-full gap-2" disabled={!step3Ok} onClick={() => setStep(4)}>
              {tx({ he: "המשך", en: "Continue" }, language)} <ArrowRight className="h-4 w-4" />
            </Button>
          </StepShell>
        )}

        {/* ── 4: Bottleneck ───────────────────────────────────────────────── */}
        {step === 4 && (
          <StepShell key="s4">
            <div className="text-center space-y-1">
              <Target className="h-8 w-8 text-primary mx-auto" />
              <h1 className="text-2xl font-bold" dir="auto">
                {tx({ he: "מה עוצר את הצמיחה?", en: "What's blocking your growth?" }, language)}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {tx({ he: "בחר את החסם הכי משמעותי עכשיו.", en: "Pick your biggest growth blocker right now." }, language)}
              </p>
            </div>

            <div className="space-y-2">
              {([
                { id: "leads"      as Bottleneck, he: "לא מספיק לידים מתאימים",                           en: "Not enough qualified leads" },
                { id: "conversion" as Bottleneck, he: "לידים לא הופכים ללקוחות משלמים",              en: "Leads don't convert to paying customers" },
                { id: "churn"      as Bottleneck, he: "לקוחות עוזבים מהר מדי",                           en: "Customers churn too fast" },
                { id: "delivery"   as Bottleneck, he: "לא יכולים לגדול בלי לאבד איכות",             en: "Can't scale delivery without losing quality" },
                { id: "pricing"    as Bottleneck, he: "נקודת המחיר לא נכונה — משאירים כסף על השולחן", en: "Wrong price point — leaving money on the table" },
              ]).map(({ id, he, en }) => (
                <RadioCard key={id} active={bottleneck === id} onClick={() => setBottleneck(id)}>
                  <span className="text-sm font-medium" dir="auto">{isHe ? he : en}</span>
                </RadioCard>
              ))}
            </div>

            <Button size="lg" className="w-full gap-2" disabled={!step4Ok} onClick={() => setStep(5)}>
              {tx({ he: "המשך", en: "Continue" }, language)} <ArrowRight className="h-4 w-4" />
            </Button>
          </StepShell>
        )}

        {/* ── 5: Win Condition ────────────────────────────────────────────── */}
        {step === 5 && (
          <StepShell key="s5">
            <div className="text-center space-y-1">
              <Shield className="h-8 w-8 text-primary mx-auto" />
              <h1 className="text-2xl font-bold" dir="auto">
                {tx({ he: "מהי ה-Win שלך ב-90 יום?", en: "What's your 90-day win?" }, language)}
              </h1>
              <p className="text-sm text-muted-foreground" dir="auto">
                {tx({ he: "ספציפי = ניקוד גבוה יותר.", en: "Specific = higher score." }, language)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium" dir="auto">
                  {tx({ he: "הגדר הצלחה — ב-90 יום, מה ישתנה?", en: "Define success — what changes in 90 days?" }, language)}
                </label>
                <Textarea
                  value={winCondition}
                  onChange={(e) => setWinCondition(e.target.value)}
                  placeholder={isHe ? "5 לקוחות משלמים חדשים, MRR של $10K..." : "5 new paying customers, $10K MRR..."}
                  rows={3}
                  className="mt-1"
                  dir="auto"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" dir="auto">
                  {tx({ he: "מה הפחד הכי גדול שלך כרגע?", en: "What's your biggest fear right now?" }, language)}
                </label>
                <div className="space-y-2">
                  {([
                    { id: "too_slow"    as Fear, he: "מתקדמים לאט מדי — המתחרים יקדמו",   en: "Moving too slowly — competitors will get ahead" },
                    { id: "wrong_market" as Fear, he: "פנינו לשוק הלא נכון",                      en: "We're targeting the wrong market" },
                    { id: "competition"  as Fear, he: "מתחרה גדול ישמיד אותנו",               en: "A bigger player will crush us" },
                    { id: "team"         as Fear, he: "הצוות לא מוכן לגדול",                       en: "The team isn't ready to scale" },
                    { id: "capital"      as Fear, he: "ייגמר הכסף לפני שנגיע ל-PMF",             en: "We'll run out of runway before PMF" },
                  ]).map(({ id, he, en }) => (
                    <RadioCard key={id} active={fear === id} onClick={() => setFear(id)}>
                      <span className="text-sm" dir="auto">{isHe ? he : en}</span>
                    </RadioCard>
                  ))}
                </div>
              </div>
            </div>

            {saveMutation.error && (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{(saveMutation.error as Error).message}</span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!step5Ok || saveMutation.isPending}
              onClick={() => { if (step5Ok) saveMutation.mutate(buildSpec()); }}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {tx({ he: "חשב את ה-Moat Score שלי", en: "Calculate my Moat Score" }, language)}
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </Button>
          </StepShell>
        )}

        {/* ── Result: Moat Score reveal ────────────────────────────────────────── */}
        {step === "result" && moatResult && (
          <StepShell key="result">
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" dir="auto">
                {tx({ he: "ה-Moat Score שלך", en: "Your Moat Score" }, language)}
              </p>
              <div className="text-8xl font-black tabular-nums text-primary leading-none">
                {moatResult.total}
                <span className="text-3xl text-muted-foreground font-semibold">/100</span>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${
                  MOAT_LABEL_CONFIG[moatResult.label].cls
                }`}
                dir="auto"
              >
                {isHe ? MOAT_LABEL_CONFIG[moatResult.label].he : MOAT_LABEL_CONFIG[moatResult.label].en}
              </span>
            </div>

            <Card>
              <CardContent className="p-5 space-y-4">
                {([
                  { key: "clarity",        score: moatResult.clarity,        he: "בהירות ה-Offer",   en: "Offer clarity" },
                  { key: "differentiation", score: moatResult.differentiation, he: "בידול",          en: "Differentiation" },
                  { key: "urgency",        score: moatResult.urgency,        he: "דחיפות הבעיה",  en: "Problem urgency" },
                  { key: "conviction",     score: moatResult.conviction,     he: "קונביקציה",    en: "Conviction" },
                ] as { key: string; score: number; he: string; en: string }[]).map(({ key, score, he, en }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium" dir="auto">{isHe ? he : en}</span>
                      <span className="text-muted-foreground tabular-nums">{score}/25</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(score / 25) * 100}%` }}
                        transition={{ duration: 0.9, delay: 0.15 }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center px-4" dir="auto">
              {moatResult.label === "weak" &&
                tx({ he: "ה-FunnelForge יעזור לך לבנות את הבסיס. התחיל בדיפרנציאציה.",          en: "FunnelForge will help you build the foundation. Start with Differentiate." }, language)}
              {moatResult.label === "developing" &&
                tx({ he: "יש לך בסיס טוב. בוא נחדד את ה-positioning וה-conversion.",         en: "Good foundation. Let's sharpen your positioning and conversion." }, language)}
              {moatResult.label === "strong" &&
                tx({ he: "הפוזישנינג שלך חזק. הזמן לאופטימייז מחירים ורפרנסה.",      en: "Strong positioning. Time to optimize pricing and referral." }, language)}
              {moatResult.label === "fortress" &&
                tx({ he: "מבצר. המנועים יעזרו לך לשמר את היתרון ולמדוד אותו.", en: "Fortress. The engines will help you protect the moat and measure it." }, language)}
            </p>

            <Button size="lg" className="w-full gap-2" onClick={() => navigate("/home")}>
              {tx({ he: "כנס ל-FunnelForge", en: "Enter FunnelForge" }, language)}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </StepShell>
        )}

      </AnimatePresence>
    </div>
  );
};

export default FunnelGenesis;
