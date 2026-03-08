import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FormData, initialFormData, Channel } from "@/types/funnel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Sparkles,
  ShoppingBag, Monitor, UtensilsCrossed, Briefcase,
  GraduationCap, Heart, Building, Plane, MoreHorizontal,
  Users, Building2, UsersRound, Megaphone, UserPlus, ShoppingCart, Award,
} from "lucide-react";

interface MultiStepFormProps {
  onComplete: (data: FormData) => void;
  onBack: () => void;
}

const TOTAL_STEPS = 7;

const MultiStepForm = ({ onComplete, onBack }: MultiStepFormProps) => {
  const { t, language, isRTL } = useLanguage();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [direction, setDirection] = useState(1);

  const update = (partial: Partial<FormData>) =>
    setFormData((prev) => ({ ...prev, ...partial }));

  const next = () => { setDirection(1); setStep((s) => Math.min(s + 1, TOTAL_STEPS)); };
  const prev = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 1)); };

  const canNext = (): boolean => {
    switch (step) {
      case 1: return formData.businessField !== "";
      case 2: return formData.audienceType !== "";
      case 3: return formData.productDescription !== "" && formData.salesModel !== "";
      case 4: return formData.budgetRange !== "";
      case 5: return formData.mainGoal !== "";
      case 6: return true; // optional
      case 7: return formData.experienceLevel !== "";
      default: return false;
    }
  };

  const handleSubmit = () => {
    if (canNext()) onComplete(formData);
  };

  const variants = {
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
      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-start transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/30 hover:bg-muted/50"
      }`}
    >
      {icon && <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>{icon}</div>}
      <div>
        <div className="font-semibold text-foreground">{label}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
    </button>
  );

  const renderStep = () => {
    switch (step) {
      case 1: {
        const fields = [
          { key: "fashion", icon: <ShoppingBag className="h-5 w-5" /> },
          { key: "tech", icon: <Monitor className="h-5 w-5" /> },
          { key: "food", icon: <UtensilsCrossed className="h-5 w-5" /> },
          { key: "services", icon: <Briefcase className="h-5 w-5" /> },
          { key: "education", icon: <GraduationCap className="h-5 w-5" /> },
          { key: "health", icon: <Heart className="h-5 w-5" /> },
          { key: "realEstate", icon: <Building className="h-5 w-5" /> },
          { key: "tourism", icon: <Plane className="h-5 w-5" /> },
          { key: "other", icon: <MoreHorizontal className="h-5 w-5" /> },
        ] as const;
        const fieldLabels: Record<string, string> = {
          fashion: t("fieldFashion"), tech: t("fieldTech"), food: t("fieldFood"),
          services: t("fieldServices"), education: t("fieldEducation"), health: t("fieldHealth"),
          realEstate: t("fieldRealEstate"), tourism: t("fieldTourism"), other: t("fieldOther"),
        };
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      case 2: {
        const types = [
          { key: "b2c" as const, label: t("b2c"), icon: <Users className="h-5 w-5" /> },
          { key: "b2b" as const, label: t("b2b"), icon: <Building2 className="h-5 w-5" /> },
          { key: "both" as const, label: t("both"), icon: <UsersRound className="h-5 w-5" /> },
        ];
        return (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
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
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">{t("ageRange")}: {formData.ageRange[0]} – {formData.ageRange[1]}</label>
              <div className="flex items-center gap-4">
                <Input
                  type="number" min={13} max={80}
                  value={formData.ageRange[0]}
                  onChange={(e) => update({ ageRange: [Number(e.target.value), formData.ageRange[1]] })}
                  className="w-24"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number" min={13} max={80}
                  value={formData.ageRange[1]}
                  onChange={(e) => update({ ageRange: [formData.ageRange[0], Number(e.target.value)] })}
                  className="w-24"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("interests")}</label>
              <Input
                placeholder={t("interestsPlaceholder")}
                value={formData.interests}
                onChange={(e) => update({ interests: e.target.value })}
              />
            </div>
          </div>
        );
      }

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("productDescription")}</label>
              <Textarea
                placeholder={t("productDescPlaceholder")}
                value={formData.productDescription}
                onChange={(e) => update({ productDescription: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("averagePrice")}</label>
              <Input
                type="number" min={0}
                value={formData.averagePrice || ""}
                onChange={(e) => update({ averagePrice: Number(e.target.value) })}
                placeholder="₪"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">{t("salesModel")}</label>
              <div className="grid gap-3 sm:grid-cols-3">
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

      case 4:
        return (
          <div className="grid gap-3 sm:grid-cols-2">
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

      case 5: {
        const goals = [
          { key: "awareness" as const, label: t("goalAwareness"), icon: <Megaphone className="h-5 w-5" /> },
          { key: "leads" as const, label: t("goalLeads"), icon: <UserPlus className="h-5 w-5" /> },
          { key: "sales" as const, label: t("goalSales"), icon: <ShoppingCart className="h-5 w-5" /> },
          { key: "loyalty" as const, label: t("goalLoyalty"), icon: <Award className="h-5 w-5" /> },
        ];
        return (
          <div className="grid gap-3 sm:grid-cols-2">
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

      case 6: {
        const channelList: { key: Channel; label: string }[] = [
          { key: "facebook", label: t("channelFacebook") },
          { key: "instagram", label: t("channelInstagram") },
          { key: "google", label: t("channelGoogle") },
          { key: "content", label: t("channelContent") },
          { key: "email", label: t("channelEmail") },
          { key: "tikTok", label: t("channelTikTok") },
          { key: "linkedIn", label: t("channelLinkedIn") },
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
          <div className="grid gap-3 sm:grid-cols-2">
            {channelList.map((ch) => (
              <button
                key={ch.key}
                onClick={() => toggle(ch.key)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  formData.existingChannels.includes(ch.key)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Checkbox checked={formData.existingChannels.includes(ch.key)} />
                <span className="font-medium text-foreground">{ch.label}</span>
              </button>
            ))}
          </div>
        );
      }

      case 7:
        return (
          <div className="grid gap-4">
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

      default: return null;
    }
  };

  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    1: { title: t("step1Title"), subtitle: t("step1Subtitle") },
    2: { title: t("step2Title"), subtitle: t("step2Subtitle") },
    3: { title: t("step3Title"), subtitle: t("step3Subtitle") },
    4: { title: t("step4Title"), subtitle: t("step4Subtitle") },
    5: { title: t("step5Title"), subtitle: t("step5Subtitle") },
    6: { title: t("step6Title"), subtitle: t("step6Subtitle") },
    7: { title: t("step7Title"), subtitle: t("step7Subtitle") },
  };

  return (
    <div className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-2xl">
        {/* Progress */}
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("step")} {step} {t("of")} {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mb-8 h-2" />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
              {stepTitles[step]?.title}
            </h2>
            <p className="mb-8 text-muted-foreground">{stepTitles[step]?.subtitle}</p>
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={step === 1 ? onBack : prev}
            className="gap-2"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {step === 1 ? t("back") : t("back")}
          </Button>

          <div className="flex gap-3">
            {step === 6 && (
              <Button variant="ghost" onClick={next}>
                {t("skip")}
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <Button onClick={next} disabled={!canNext()} className="gap-2">
                {t("next")}
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canNext()} className="gap-2 funnel-gradient border-0 text-accent-foreground">
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
