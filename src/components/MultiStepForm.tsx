import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { radioCard, radioGroup, checkboxCard, progressBar } from "@/lib/a11y";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIsMobile } from "@/hooks/use-mobile";
import { FormData, initialFormData, Channel } from "@/types/funnel";
import { getVisibleSteps, canProceed, getStepValidationError, shouldShowAgeRange, shouldShowAveragePrice, getDifferentiationPreFill } from "@/lib/adaptiveFormRules";
import { getProgressColor } from "@/lib/colorSemantics";
import { safeStorage } from "@/lib/safeStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Sparkles, AlertCircle,
  ShoppingBag, Monitor, UtensilsCrossed, Briefcase,
  GraduationCap, Heart, Building, Plane, MoreHorizontal,
  Users, Building2, UsersRound, Megaphone, UserPlus, ShoppingCart, Award, User,
} from "lucide-react";
import { toast } from "sonner";
import { validateFormData, formatZodErrors } from "@/schemas/formData";

interface MultiStepFormProps {
  onComplete: (data: FormData) => void;
  onBack: () => void;
  embeddedInShell?: boolean;
}

const MultiStepForm = ({ onComplete, onBack, embeddedInShell }: MultiStepFormProps) => {
  const { t, language, isRTL } = useLanguage();
  const { profile, updateFormData } = useUserProfile();
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>(() => {
    // Pre-fill from last form data if returning user
    if (profile.isReturningUser && profile.lastFormData) {
      return { ...profile.lastFormData };
    }
    // Pre-fill from differentiation data (Path B)
    const diffPreFill = getDifferentiationPreFill();
    if (diffPreFill) {
      return { ...initialFormData, ...diffPreFill };
    }
    return initialFormData;
  });
  const [hasDiffPreFill] = useState(() => !!getDifferentiationPreFill());
  const [direction, setDirection] = useState(1);
  const [showPrefill, setShowPrefill] = useState(profile.isReturningUser && !!profile.lastFormData);

  const update = (partial: Partial<FormData>) => {
    const newData = { ...formData, ...partial };
    setFormData(newData);
    updateFormData(newData);

    // Auto-set audience type for personal brand
    if (partial.businessField === "personalBrand" && newData.audienceType === "b2b") {
      setFormData((prev) => ({ ...prev, ...partial, audienceType: "b2c" }));
    }
  };

  // Dynamic steps based on form data. We deliberately depend on the four
  // fields that drive step visibility instead of the whole formData object —
  // re-computing on every keystroke (e.g. productDescription) would be wasteful
  // and could re-render skipped steps mid-typing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visibleSteps = useMemo(() => getVisibleSteps(formData), [
    formData.businessField,
    formData.budgetRange,
    formData.experienceLevel,
    formData.audienceType,
  ]);

  const totalSteps = visibleSteps.length;
  const currentStep = visibleSteps[stepIndex];
  const progressPercent = ((stepIndex + 1) / totalSteps) * 100;
  const progressColor = getProgressColor(stepIndex + 1, totalSteps);

  const next = () => {
    setDirection(1);
    setStepIndex((s) => {
      const next = Math.min(s + 1, totalSteps - 1);
      safeStorage.setString("funnelforge-form-step", String(next));
      return next;
    });
  };
  const prev = () => {
    setDirection(-1);
    setStepIndex((s) => {
      const prev = Math.max(s - 1, 0);
      safeStorage.setString("funnelforge-form-step", String(prev));
      return prev;
    });
  };

  const isLastStep = stepIndex === totalSteps - 1;
  const canGoNext = currentStep ? canProceed(currentStep.id, formData) : false;
  const [attemptedNext, setAttemptedNext] = useState(false);
  const validationError = currentStep ? getStepValidationError(currentStep.id, formData) : null;
  const showValidationError = attemptedNext && !canGoNext && validationError !== null;

  const handleNextAttempt = () => {
    if (!canGoNext) {
      setAttemptedNext(true);
      return;
    }
    setAttemptedNext(false);
    next();
  };

  const handleSubmitAttempt = () => {
    if (!canGoNext) {
      setAttemptedNext(true);
      return;
    }
    const validation = validateFormData(formData);
    if (!validation.ok) {
      setAttemptedNext(true);
      toast.error(formatZodErrors(validation.errors, language === "he" ? "he" : "en"));
      return;
    }
    setAttemptedNext(false);
    onComplete(validation.data);
  };

  const stepTimeEstimates: Record<string, number> = {
    businessField: 15, experienceLevel: 10, audience: 20,
    product: 25, budget: 10, goal: 15, channels: 20,
  };
  const remainingSeconds = visibleSteps
    .slice(stepIndex)
    .reduce((sum, s) => sum + (stepTimeEstimates[s.id] || 15), 0);
  const remainingMinutes = Math.max(1, Math.round(remainingSeconds / 60));

  // Legacy handler kept for compatibility; prefer handleSubmitAttempt.
  const handleSubmit = handleSubmitAttempt;

  const handlePrefill = () => {
    if (profile.lastFormData) {
      setFormData({ ...profile.lastFormData });
      updateFormData(profile.lastFormData);
    }
    setShowPrefill(false);
  };

  const variants = reducedMotion
    ? { enter: {}, center: {}, exit: {} }
    : {
        enter: (d: number) => ({ x: d > 0 ? (isRTL ? -200 : 200) : (isRTL ? 200 : -200), opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? (isRTL ? 200 : -200) : (isRTL ? -200 : 200), opacity: 0 }),
      };

  const OptionCard = ({
    selected, onClick, icon, label, description,
  }: {
    selected: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    label: string;
    description?: string;
  }) => (
    <button
      onClick={onClick}
      {...radioCard(selected, label)}
      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-start transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/30 hover:bg-muted/50"
      }`}
    >
      {icon && <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`} aria-hidden="true">{icon}</div>}
      <div>
        <div className="font-semibold text-foreground">{label}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
    </button>
  );

  const renderStep = () => {
    if (!currentStep) return null;

    switch (currentStep.id) {
      case "businessField": {
        const fields = [
          { key: "fashion", icon: <ShoppingBag className="h-5 w-5" /> },
          { key: "tech", icon: <Monitor className="h-5 w-5" /> },
          { key: "food", icon: <UtensilsCrossed className="h-5 w-5" /> },
          { key: "services", icon: <Briefcase className="h-5 w-5" /> },
          { key: "education", icon: <GraduationCap className="h-5 w-5" /> },
          { key: "health", icon: <Heart className="h-5 w-5" /> },
          { key: "realEstate", icon: <Building className="h-5 w-5" /> },
          { key: "tourism", icon: <Plane className="h-5 w-5" /> },
          { key: "personalBrand", icon: <User className="h-5 w-5" /> },
          { key: "other", icon: <MoreHorizontal className="h-5 w-5" /> },
        ] as const;
        const fieldLabels: Record<string, string> = {
          fashion: t("fieldFashion"), tech: t("fieldTech"), food: t("fieldFood"),
          services: t("fieldServices"), education: t("fieldEducation"), health: t("fieldHealth"),
          realEstate: t("fieldRealEstate"), tourism: t("fieldTourism"), personalBrand: t("fieldPersonalBrand"), other: t("fieldOther"),
        };
        return (
          <div
            {...radioGroup("step-title")}
            className={`grid gap-3 ${isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}
          >
            {fields.map((f) => (
              <OptionCard
                key={f.key}
                selected={formData.businessField === f.key}
                onClick={() => update({ businessField: f.key })}
                icon={f.icon}
                label={fieldLabels[f.key]}
              />
            ))}
          </div>
        );
      }

      case "experienceLevel":
        return (
          <div {...radioGroup("step-title")} className="grid gap-4">
            {([
              { key: "beginner" as const, label: t("expBeginner"), desc: t("expBeginnerDesc") },
              { key: "intermediate" as const, label: t("expIntermediate"), desc: t("expIntermediateDesc") },
              { key: "advanced" as const, label: t("expAdvanced"), desc: t("expAdvancedDesc") },
            ]).map((e) => (
              <OptionCard
                key={e.key}
                selected={formData.experienceLevel === e.key}
                onClick={() => update({ experienceLevel: e.key })}
                label={e.label}
                description={e.desc}
              />
            ))}
          </div>
        );

      case "audience": {
        const types = [
          { key: "b2c" as const, label: t("b2c"), icon: <Users className="h-5 w-5" /> },
          { key: "b2b" as const, label: t("b2b"), icon: <Building2 className="h-5 w-5" /> },
          { key: "both" as const, label: t("both"), icon: <UsersRound className="h-5 w-5" /> },
        ];
        const showAge = shouldShowAgeRange(formData);
        return (
          <div className="space-y-6">
            <div {...radioGroup("step-title")} className="grid gap-3 sm:grid-cols-3">
              {types.map((a) => (
                <OptionCard
                  key={a.key}
                  selected={formData.audienceType === a.key}
                  onClick={() => update({ audienceType: a.key })}
                  icon={a.icon}
                  label={a.label}
                />
              ))}
            </div>
            {showAge && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">{t("ageRange")}: {formData.ageRange[0]} – {formData.ageRange[1]}</label>
                <div className="flex items-center gap-4">
                  <Input
                    id="age-min"
                    aria-label={isRTL ? "גיל מינימלי" : "Minimum age"}
                    type="number" min={13} max={80}
                    value={formData.ageRange[0]}
                    onChange={(e) => update({ ageRange: [Number(e.target.value), formData.ageRange[1]] })}
                    className="w-20 sm:w-24"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    id="age-max"
                    aria-label={isRTL ? "גיל מקסימלי" : "Maximum age"}
                    type="number" min={13} max={80}
                    value={formData.ageRange[1]}
                    onChange={(e) => update({ ageRange: [formData.ageRange[0], Number(e.target.value)] })}
                    className="w-20 sm:w-24"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="interests" className="text-sm font-medium text-foreground">{t("interests")}</label>
              <Input
                id="interests"
                placeholder={t("interestsPlaceholder")}
                value={formData.interests}
                onChange={(e) => update({ interests: e.target.value })}
              />
            </div>
          </div>
        );
      }

      case "product": {
        const showPrice = shouldShowAveragePrice(formData);
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="product-description" className="text-sm font-medium text-foreground">{t("productDescription")}</label>
              <Textarea
                id="product-description"
                placeholder={t("productDescPlaceholder")}
                value={formData.productDescription}
                onChange={(e) => update({ productDescription: e.target.value })}
              />
            </div>
            {showPrice && (
              <div className="space-y-2">
                <label htmlFor="avg-price" className="text-sm font-medium text-foreground">{t("averagePrice")}</label>
                <Input
                  id="avg-price"
                  type="number" min={0}
                  value={formData.averagePrice || ""}
                  onChange={(e) => update({ averagePrice: Number(e.target.value) })}
                  placeholder="₪"
                  aria-label={isRTL ? "מחיר ממוצע בשקלים" : "Average price in ILS (₪)"}
                />
              </div>
            )}
            <div className="space-y-3">
              <p id="sales-model-label" className="text-sm font-medium text-foreground">{t("salesModel")}</p>
              <div {...radioGroup("sales-model-label")} className="grid gap-3 sm:grid-cols-3">
                {([
                  { key: "oneTime" as const, label: t("oneTime") },
                  { key: "subscription" as const, label: t("subscription") },
                  { key: "leads" as const, label: t("leads") },
                ]).map((m) => (
                  <OptionCard
                    key={m.key}
                    selected={formData.salesModel === m.key}
                    onClick={() => update({ salesModel: m.key })}
                    label={m.label}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      }

      case "budget":
        return (
          <div {...radioGroup("step-title")} className="grid gap-3 sm:grid-cols-2">
            {([
              { key: "low" as const, label: t("budgetLow") },
              { key: "medium" as const, label: t("budgetMedium") },
              { key: "high" as const, label: t("budgetHigh") },
              { key: "veryHigh" as const, label: t("budgetVeryHigh") },
            ]).map((b) => (
              <OptionCard
                key={b.key}
                selected={formData.budgetRange === b.key}
                onClick={() => update({ budgetRange: b.key })}
                label={b.label}
              />
            ))}
          </div>
        );

      case "goal": {
        const goals = [
          { key: "awareness" as const, label: t("goalAwareness"), icon: <Megaphone className="h-5 w-5" /> },
          { key: "leads" as const, label: t("goalLeads"), icon: <UserPlus className="h-5 w-5" /> },
          { key: "sales" as const, label: t("goalSales"), icon: <ShoppingCart className="h-5 w-5" /> },
          { key: "loyalty" as const, label: t("goalLoyalty"), icon: <Award className="h-5 w-5" /> },
        ];
        return (
          <div {...radioGroup("step-title")} className="grid gap-3 sm:grid-cols-2">
            {goals.map((g) => (
              <OptionCard
                key={g.key}
                selected={formData.mainGoal === g.key}
                onClick={() => update({ mainGoal: g.key })}
                icon={g.icon}
                label={g.label}
              />
            ))}
          </div>
        );
      }

      case "channels": {
        const channelList: { key: Channel; label: string }[] = [
          { key: "facebook", label: t("channelFacebook") },
          { key: "instagram", label: t("channelInstagram") },
          { key: "google", label: t("channelGoogle") },
          { key: "content", label: t("channelContent") },
          { key: "email", label: t("channelEmail") },
          { key: "tikTok", label: t("channelTikTok") },
          { key: "linkedIn", label: t("channelLinkedIn") },
          { key: "whatsapp", label: t("channelWhatsApp") },
          { key: "other", label: t("channelOther") },
        ];
        const toggle = (ch: Channel) => {
          const exists = formData.existingChannels.includes(ch);
          update({
            existingChannels: exists
              ? formData.existingChannels.filter((c) => c !== ch)
              : [...formData.existingChannels, ch],
          });
        };
        return (
          <div role="group" aria-labelledby="step-title" className="grid gap-3 sm:grid-cols-2">
            {channelList.map((ch) => (
              <button
                key={ch.key}
                onClick={() => toggle(ch.key)}
                {...checkboxCard(formData.existingChannels.includes(ch.key), ch.label)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  formData.existingChannels.includes(ch.key)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Checkbox checked={formData.existingChannels.includes(ch.key)} aria-hidden="true" tabIndex={-1} />
                <span className="font-medium text-foreground">{ch.label}</span>
              </button>
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Step titles mapped by step ID
  const stepTitles: Record<string, { title: string; subtitle: string }> = {
    businessField: { title: t("step1Title"), subtitle: t("step1Subtitle") },
    experienceLevel: { title: t("step7Title"), subtitle: t("step7Subtitle") },
    audience: { title: t("step2Title"), subtitle: t("step2Subtitle") },
    product: { title: t("step3Title"), subtitle: t("step3Subtitle") },
    budget: { title: t("step4Title"), subtitle: t("step4Subtitle") },
    goal: { title: t("step5Title"), subtitle: t("step5Subtitle") },
    channels: { title: t("step6Title"), subtitle: t("step6Subtitle") },
  };

  return (
    <div className={`min-h-screen px-4 pb-12 ${embeddedInShell ? "pt-4" : "pt-24"}`}>
      <div className="mx-auto max-w-2xl">
        {/* Returning user pre-fill banner */}
        {showPrefill && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
            <span className="text-sm font-medium text-foreground">
              {language === "he" ? "ברוך שובך! להשתמש בתשובות הקודמות?" : "Welcome back! Use your previous answers?"}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowPrefill(false)}>
                {language === "he" ? "לא" : "No"}
              </Button>
              <Button size="sm" onClick={handlePrefill}>
                {language === "he" ? "כן" : "Yes"}
              </Button>
            </div>
          </div>
        )}

        {/* Differentiation pre-fill banner (Path B) */}
        {hasDiffPreFill && !showPrefill && (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-3" dir="auto">
            <span className="text-lg" role="img" aria-hidden="true">🎯</span>
            <p className="text-sm text-foreground">
              {isRTL
                ? "הבידול שלך מזין את הטופס. כמה שדות כבר מלאים מראש"
                : "Your differentiation is feeding the form. Some fields are pre-filled"}
            </p>
          </div>
        )}

        {/* Progress with neuro-spectrum color */}
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span aria-live="polite" aria-atomic="true">
            {t("step")} {stepIndex + 1} {t("of")} {totalSteps}
          </span>
          <span className="text-xs">
            {isLastStep
              ? (isRTL ? "סיימנו!" : "Done!")
              : stepIndex === totalSteps - 2
                ? (isRTL ? "צעד אחרון!" : "Last step!")
                : (isRTL ? `~${remainingMinutes} דק׳ נותרו` : `~${remainingMinutes} min left`)}
          </span>
        </div>
        <div
          className="mb-8 h-2 overflow-hidden rounded-full bg-muted"
          {...progressBar(Math.round(progressPercent), 0, 100,
            isRTL
              ? `שלב ${stepIndex + 1} מתוך ${totalSteps}`
              : `Step ${stepIndex + 1} of ${totalSteps}`
          )}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep?.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }}
          >
            <h2 id="step-title" className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
              {currentStep ? stepTitles[currentStep.id]?.title : ""}
            </h2>
            <p className="mb-8 text-muted-foreground">
              {currentStep ? stepTitles[currentStep.id]?.subtitle : ""}
            </p>
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Inline validation error surface */}
        <div
          aria-live="polite"
          role={showValidationError ? "alert" : undefined}
          className="mt-8 min-h-[1.5rem]"
        >
          {showValidationError && validationError && (
            <div
              id="form-validation-error"
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span dir="auto">{validationError[language]}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={stepIndex === 0 ? onBack : prev}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t("back")}
          </Button>

          <div className="flex gap-3">
            {currentStep?.skippable && (
              <Button variant="ghost" onClick={next}>
                {t("skip")}
              </Button>
            )}
            {!isLastStep ? (
              // Button stays enabled so users can click and see the reason —
              // disabling silently is a worse UX than explaining the block.
              <Button
                onClick={handleNextAttempt}
                className="gap-2"
                aria-invalid={showValidationError || undefined}
                aria-describedby={showValidationError ? "form-validation-error" : undefined}
              >
                {t("next")}
                <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitAttempt}
                className="gap-2 funnel-gradient border-0 text-accent-foreground"
                aria-invalid={showValidationError || undefined}
                aria-describedby={showValidationError ? "form-validation-error" : undefined}
              >
                <Sparkles className="h-4 w-4" />
                {t("generateFunnel")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiStepForm;
