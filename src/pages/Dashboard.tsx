import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAchievements } from "@/hooks/useAchievements";
import { generateWeeklyPulse } from "@/engine/pulseEngine";
import { SavedPlan } from "@/types/funnel";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Rocket, FileText, Flame, Clock, Plus, BarChart3, TrendingUp, DollarSign, Heart } from "lucide-react";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { streak, mastery } = useAchievements(language);

  const savedPlans = useMemo<SavedPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem("funnelforge-plans") || "[]"); } catch { return []; }
  }, [profile.savedPlanCount]);

  const pulse = useMemo(() => generateWeeklyPulse(savedPlans), [savedPlans]);
  const lastPlan = savedPlans.length > 0 ? [...savedPlans].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0] : null;
  const hasDiff = !!localStorage.getItem("funnelforge-differentiation-result");

  return (
    <div className="min-h-screen bg-background">
      <Header onSavedPlans={() => navigate("/plans")} />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">

        {/* Welcome + Streak */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground" dir="auto">
              {isHe ? "ברוך שובך!" : "Welcome Back!"}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">
              {isHe ? "הנה מה שחדש מאז הביקור האחרון שלך" : "Here's what's new since your last visit"}
            </p>
          </div>
          {streak.currentStreak > 0 && (
            <Badge className="gap-1 text-sm"><Flame className="h-4 w-4" /> {streak.currentStreak} {isHe ? "שבועות" : "weeks"}</Badge>
          )}
        </div>

        {/* Weekly Pulse */}
        {pulse && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground" dir="auto">{pulse.title[language]}</p>
              {pulse.lossFramedMessages[0] && (
                <p className="text-xs text-muted-foreground mt-1" dir="auto">{pulse.lossFramedMessages[0][language]}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dual Path CTAs */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-amber-500/30 hover:border-amber-500" onClick={() => navigate("/differentiate")}>
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                <Crosshair className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground" dir="auto">{isHe ? "בידול → שיווק" : "Differentiation → Marketing"}</h3>
                <p className="text-xs text-muted-foreground" dir="auto">
                  {hasDiff
                    ? (isHe ? "יש לך בידול — רוצה לעדכן?" : "You have differentiation — want to update?")
                    : (isHe ? "~12 דקות. תוצאות מדויקות ×3" : "~12 min. 3× more precise results")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/wizard")}>
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground" dir="auto">{isHe ? "התחלה מהירה" : "Quick Start"}</h3>
                <p className="text-xs text-muted-foreground" dir="auto">{isHe ? "~2 דקות. תוכנית שיווק מיידית" : "~2 min. Instant marketing plan"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Plan */}
        {lastPlan && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {isHe ? "התוכנית האחרונה שלך" : "Your Last Plan"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{lastPlan.name}</p>
                <p className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline me-1" />
                  {new Date(lastPlan.savedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}
                </p>
              </div>
              <Button size="sm" onClick={() => navigate(`/plans/${lastPlan.id}`)}>
                {isHe ? "המשך →" : "Continue →"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Module Progress */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isHe ? "מודולים" : "Modules"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              {[
                { icon: Crosshair, label: isHe ? "בידול" : "Diff", done: hasDiff, color: "text-amber-500" },
                { icon: BarChart3, label: isHe ? "שיווק" : "Mktg", done: savedPlans.length > 0, color: "text-primary" },
                { icon: TrendingUp, label: isHe ? "מכירות" : "Sales", done: savedPlans.length > 0, color: "text-accent" },
                { icon: DollarSign, label: isHe ? "תמחור" : "Price", done: savedPlans.length > 0, color: "text-emerald-500" },
                { icon: Heart, label: isHe ? "שימור" : "Retain", done: false, color: "text-pink-500" },
              ].map((mod, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mod.done ? "bg-accent/20" : "bg-muted"}`}>
                    <mod.icon className={`h-5 w-5 ${mod.done ? mod.color : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{mod.label}</span>
                  {i < 4 && <span className="text-muted-foreground text-[10px] absolute" style={{ marginLeft: "3rem" }}>→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Saved Plans */}
        {savedPlans.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">{isHe ? "תוכניות שמורות" : "Saved Plans"} ({savedPlans.length})</h2>
            <Button size="sm" variant="ghost" onClick={() => navigate("/plans")}>{isHe ? "הצג הכל" : "View All"}</Button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {savedPlans.slice(0, 4).map((plan) => (
            <Card key={plan.id} className="cursor-pointer hover:shadow transition-shadow" onClick={() => navigate(`/plans/${plan.id}`)}>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{plan.name}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(plan.savedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* New Plan FAB */}
        <div className="fixed bottom-20 end-4 z-30">
          <Button size="lg" className="rounded-full h-14 w-14 shadow-lg funnel-gradient border-0" onClick={() => navigate("/wizard")}>
            <Plus className="h-6 w-6 text-accent-foreground" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
