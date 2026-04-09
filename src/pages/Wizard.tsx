import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { FormData, FunnelResult } from "@/types/funnel";
import { generateFunnel, personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { useUserProfile } from "@/contexts/UserProfileContext";
import BackToHub from "@/components/BackToHub";
import MultiStepForm from "@/components/MultiStepForm";
import ExpressWizard from "@/components/ExpressWizard";
import ProcessingScreen from "@/components/ProcessingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Compass, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

type WizardState = "trackSelect" | "express" | "form" | "processing";

const Wizard = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { profile, persistFormData } = useUserProfile();
  const isReturning = profile.isReturningUser && !!profile.lastFormData;

  const [state, setState] = useState<WizardState>("trackSelect");
  const [formDataCache, setFormDataCache] = useState<FormData | null>(null);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const navigate = useNavigate();

  const handleFormComplete = useCallback((data: FormData) => {
    setFormDataCache(data);
    persistFormData(data);
    const rawResult = generateFunnel(data);
    const graph = buildUserKnowledgeGraph(data);
    const personalized = personalizeResult(rawResult, graph);
    setResult(personalized);
    setState("processing");
  }, [persistFormData]);

  const handleProcessingComplete = useCallback(() => {
    if (!result) return;
    try {
      const plans = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
      const plan = { id: result.id, name: result.funnelName.he || result.funnelName.en, result, savedAt: new Date().toISOString() };
      plans.push(plan);
      localStorage.setItem("funnelforge-plans", JSON.stringify(plans));
    } catch { /* ignore */ }
    navigate(`/strategy/${result.id}`);
  }, [result, navigate]);

  const handleRegenerate = useCallback(() => {
    if (!profile.lastFormData) return;
    handleFormComplete(profile.lastFormData);
  }, [profile.lastFormData, handleFormComplete]);

  return (
    <div className="min-h-screen bg-background">
      {state === "trackSelect" && (
        <>
          <div className="container mx-auto px-4 pt-4">
            <BackToHub />
          </div>
          <div className="container mx-auto px-4 pb-16 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" dir="auto">
                {isHe ? "איך תרצה להתחיל?" : "How would you like to start?"}
              </h1>
              <p className="text-muted-foreground" dir="auto">
                {isHe ? "בחר את המסלול שמתאים לך" : "Choose the track that fits you"}
              </p>
            </motion.div>

            <div className={`grid gap-4 ${isReturning ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {/* Track A: Express */}
              <Card
                role="button"
                tabIndex={0}
                className="cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setState("express")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setState("express"); }}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 mx-auto mb-3">
                    <Zap className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1" dir="auto">
                    {isHe ? "מהיר" : "Express"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2" dir="auto">
                    {isHe ? "2 שאלות בלבד → תוכנית מיידית" : "2 questions only → instant plan"}
                  </p>
                  <span className="text-xs font-medium text-amber-600">
                    {isHe ? "~30 שניות" : "~30 seconds"}
                  </span>
                </CardContent>
              </Card>

              {/* Track B: Guided */}
              <Card
                role="button"
                tabIndex={0}
                className="cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setState("form")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setState("form"); }}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-3">
                    <Compass className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1" dir="auto">
                    {isHe ? "מודרך" : "Guided"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2" dir="auto">
                    {isHe ? "שאלון מלא → תוכנית מותאמת אישית" : "Full questionnaire → personalized plan"}
                  </p>
                  <span className="text-xs font-medium text-primary">
                    {isHe ? "~2 דקות" : "~2 minutes"}
                  </span>
                </CardContent>
              </Card>

              {/* Track C: Regenerate (returning users only) */}
              {isReturning && (
                <Card
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer border-2 border-accent/30 bg-accent/5 hover:border-accent/50 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                  onClick={handleRegenerate}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleRegenerate(); }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mx-auto mb-3">
                      <RefreshCw className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1" dir="auto">
                      {isHe ? "צור מחדש" : "Regenerate"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2" dir="auto">
                      {isHe ? "אותן הגדרות → תוצאות חדשות" : "Same settings → fresh results"}
                    </p>
                    <span className="text-xs font-medium text-accent">
                      {isHe ? "~10 שניות" : "~10 seconds"}
                    </span>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {state === "express" && (
        <>
          <div className="container mx-auto px-4 pt-4">
            <BackToHub />
            <Button variant="ghost" size="sm" onClick={() => setState("trackSelect")} className="text-muted-foreground mb-4">
              {isHe ? "← חזרה לבחירת מסלול" : "← Back to track selection"}
            </Button>
          </div>
          <ExpressWizard onComplete={handleFormComplete} />
        </>
      )}

      {state === "form" && (
        <>
          <div className="container mx-auto px-4 pt-4">
            <BackToHub />
            <Button variant="ghost" size="sm" onClick={() => setState("trackSelect")} className="text-muted-foreground mb-2">
              {isHe ? "← חזרה לבחירת מסלול" : "← Back to track selection"}
            </Button>
          </div>
          <MultiStepForm onComplete={handleFormComplete} onBack={() => setState("trackSelect")} embeddedInShell />
        </>
      )}

      {state === "processing" && (
        <ProcessingScreen onComplete={handleProcessingComplete} formData={formDataCache || undefined} />
      )}
    </div>
  );
};

export default Wizard;
