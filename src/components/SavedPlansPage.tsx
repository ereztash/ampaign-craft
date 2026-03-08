import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SavedPlan, FunnelResult } from "@/types/funnel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Eye, ArrowLeft, GitCompare, Calendar, DollarSign, Target, X } from "lucide-react";
import { toast } from "sonner";

interface SavedPlansPageProps {
  onBack: () => void;
  onLoadPlan: (result: FunnelResult) => void;
}

const STORAGE_KEY = "funnelforge-plans";

const SavedPlansPage = ({ onBack, onLoadPlan }: SavedPlansPageProps) => {
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setPlans(stored);
  }, []);

  const deletePlan = (id: string) => {
    const updated = plans.filter((p) => p.id !== id);
    setPlans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setCompareIds((prev) => prev.filter((cid) => cid !== id));
    toast.success(t("planDeleted"));
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((cid) => cid !== id)
        : prev.length < 2
          ? [...prev, id]
          : [prev[1], id]
    );
  };

  const comparePlans = compareIds.length === 2
    ? plans.filter((p) => compareIds.includes(p.id))
    : [];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === "he" ? "he-IL" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  return (
    <div className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold text-foreground">{t("savedPlans")}</h1>
              <p className="text-muted-foreground">
                {plans.length} {language === "he" ? "תוכניות" : "plans"}
              </p>
            </div>
          </div>
          {compareIds.length === 2 && (
            <Button
              onClick={() => setShowCompare(true)}
              className="gap-2 funnel-gradient border-0 text-accent-foreground"
            >
              <GitCompare className="h-4 w-4" />
              {t("comparePlans")}
            </Button>
          )}
        </div>

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold text-muted-foreground">{t("noSavedPlans")}</p>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`relative transition-all ${
                      compareIds.includes(plan.id)
                        ? "ring-2 ring-primary shadow-md"
                        : "hover:shadow-md"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg leading-tight">
                        {plan.result.funnelName[language]}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(plan.savedAt)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Budget */}
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-foreground font-medium">
                          ₪{plan.result.totalBudget.min.toLocaleString()} – ₪{plan.result.totalBudget.max.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">{t("perMonth")}</span>
                      </div>

                      {/* Stages mini-bar */}
                      <div className="mb-4 flex gap-0.5 overflow-hidden rounded-full">
                        {plan.result.stages.map((stage, si) => (
                          <div
                            key={stage.id}
                            className="h-2"
                            style={{
                              width: `${stage.budgetPercent}%`,
                              background: [
                                "hsl(213, 56%, 24%)",
                                "hsl(152, 60%, 45%)",
                                "hsl(32, 95%, 55%)",
                                "hsl(280, 60%, 55%)",
                                "hsl(0, 84%, 60%)",
                              ][si % 5],
                            }}
                          />
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => onLoadPlan(plan.result)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {language === "he" ? "טען" : "Load"}
                        </Button>
                        <Button
                          variant={compareIds.includes(plan.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleCompare(plan.id)}
                          className="gap-1"
                        >
                          <GitCompare className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {language === "he" ? "מחק תוכנית?" : "Delete plan?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {language === "he"
                                  ? "פעולה זו לא ניתנת לביטול. התוכנית תימחק לצמיתות."
                                  : "This action cannot be undone. The plan will be permanently deleted."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{language === "he" ? "ביטול" : "Cancel"}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePlan(plan.id)}>
                                {language === "he" ? "מחק" : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Compare Modal */}
        {showCompare && comparePlans.length === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">{t("comparePlans")}</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCompare(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {comparePlans.map((plan) => (
                  <div key={plan.id} className="space-y-4">
                    <div className="rounded-xl bg-primary/5 p-4">
                      <h3 className="text-lg font-bold text-foreground">
                        {plan.result.funnelName[language]}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ₪{plan.result.totalBudget.min.toLocaleString()} – ₪{plan.result.totalBudget.max.toLocaleString()} {t("perMonth")}
                      </p>
                    </div>

                    {/* Stages */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {language === "he" ? "שלבי המשפך" : "Funnel Stages"}
                      </h4>
                      {plan.result.stages.map((stage, si) => (
                        <div
                          key={stage.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm"
                        >
                          <span className="text-foreground">{stage.name[language]}</span>
                          <span className="font-semibold text-primary">{stage.budgetPercent}%</span>
                        </div>
                      ))}
                    </div>

                    {/* KPIs */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">{t("keyMetrics")}</h4>
                      {plan.result.kpis.map((kpi, ki) => (
                        <div
                          key={ki}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm"
                        >
                          <span className="text-foreground">{kpi.name[language]}</span>
                          <span className="font-semibold text-primary">{kpi.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SavedPlansPage;
