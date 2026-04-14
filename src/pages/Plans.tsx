import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { SavedPlan } from "@/types/funnel";
import BackToHub from "@/components/BackToHub";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { Plus, FileText, Clock, Trash2 } from "lucide-react";

const Plans = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();

  const [refreshKey, setRefreshKey] = useState(0);
  const plans = useMemo<SavedPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]").sort((a: SavedPlan, b: SavedPlan) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()); }
    catch { return []; }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const deletePlan = (id: string) => {
    const updated = plans.filter((p) => p.id !== id);
    localStorage.setItem("funnelforge-plans", JSON.stringify(updated));
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-3xl">
        <BackToHub currentPage={language === "he" ? "תוכניות שמורות" : "Saved Plans"} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground" dir="auto">
            {tx({ he: "התוכניות שלי", en: "My Plans" }, language)} ({plans.length})
          </h1>
          <Button onClick={() => navigate("/wizard")} className="gap-2">
            <Plus className="h-4 w-4" /> {tx({ he: "תוכנית חדשה", en: "New Plan" }, language)}
          </Button>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2" dir="auto">
                {tx({ he: "אין תוכניות עדיין", en: "No plans yet" }, language)}
              </p>
              <p className="text-sm text-muted-foreground mb-4" dir="auto">
                {tx({ he: "צור את התוכנית הראשונה שלך תוך 2 דקות", en: "Create your first plan in 2 minutes" }, language)}
              </p>
              <Button onClick={() => navigate("/wizard")} className="gap-2">
                <Plus className="h-4 w-4" /> {tx({ he: "התחל", en: "Start" }, language)}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="cursor-pointer hover:shadow-md transition-shadow" role="button" tabIndex={0} onClick={() => navigate(`/strategy/${plan.id}`)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/strategy/${plan.id}`); } }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{plan.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(plan.savedAt).toLocaleDateString(tx({ he: "he-IL", en: "en-US" }, language))}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Plans;
