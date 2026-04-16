// ═══════════════════════════════════════════════
// WeeklyChallenge — Schelling Point coordination game
// Ref9: Weekly coordinated action = social proof loop.
// Behavioral: Schelling Points (Schelling 1960) —
// arbitrary but salient focal points coordinate behavior.
// Resets every Sunday (salient = creates urgency).
// ═══════════════════════════════════════════════
import { useMemo, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/i18n/tx";
import BackToHub from "@/components/BackToHub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Users, Zap, Target, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CHALLENGE_KEY = "funnelforge-weekly-challenge";

interface ChallengeProgress {
  weekNumber: number;
  completedTasks: string[];
  joinedAt: string;
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function getDaysUntilSunday(): number {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  return day === 0 ? 7 : 7 - day;
}

const WEEKLY_TASKS = [
  {
    id: "update-plan",
    label: { he: "עדכן תוכנית שיווק אחת", en: "Update one marketing plan" },
    desc: { he: "פתח תוכנית קיימת ועדכן לפחות פרמטר אחד", en: "Open an existing plan and update at least one parameter" },
    route: "/plans",
    icon: Target,
    points: 10,
  },
  {
    id: "share-archetype",
    label: { he: "שתף את הארכיטיפ שלך", en: "Share your archetype" },
    desc: { he: "שלח לינק לחבר ועזור לו לגלות את הארכיטיפ שלו", en: "Send a link to a friend and help them discover their archetype" },
    route: "/archetype",
    icon: Users,
    points: 20,
  },
  {
    id: "run-pricing",
    label: { he: "הרץ אשף תמחור", en: "Run pricing wizard" },
    desc: { he: "השלם את אשף התמחור עבור המוצר הראשי שלך", en: "Complete the pricing wizard for your main product" },
    route: "/pricing",
    icon: Zap,
    points: 15,
  },
  {
    id: "differentiate",
    label: { he: "עדכן בידול", en: "Update differentiation" },
    desc: { he: "הוסף לפחות נקודת בידול חדשה אחת", en: "Add at least one new differentiation point" },
    route: "/differentiate",
    icon: Target,
    points: 15,
  },
];

const WEEKLY_PARTICIPANTS = 312; // mock: would be live from Supabase

export default function WeeklyChallenge() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHe = language === "he";
  const weekNumber = getWeekNumber();
  const daysLeft = getDaysUntilSunday();

  const [progress, setProgress] = useState<ChallengeProgress>(() => {
    try {
      const raw = localStorage.getItem(CHALLENGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as ChallengeProgress;
        if (p.weekNumber === weekNumber) return p;
      }
    } catch { /* ignore */ }
    return { weekNumber, completedTasks: [], joinedAt: new Date().toISOString() };
  });

  const completedCount = progress.completedTasks.length;
  const totalTasks = WEEKLY_TASKS.length;
  const totalPoints = progress.completedTasks.reduce((sum, id) => {
    const task = WEEKLY_TASKS.find((t) => t.id === id);
    return sum + (task?.points ?? 0);
  }, 0);
  const progressPct = Math.round((completedCount / totalTasks) * 100);

  function markComplete(taskId: string, route: string) {
    const updated = {
      ...progress,
      completedTasks: progress.completedTasks.includes(taskId)
        ? progress.completedTasks
        : [...progress.completedTasks, taskId],
    };
    setProgress(updated);
    try { localStorage.setItem(CHALLENGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    navigate(route);
  }

  const isComplete = completedCount >= totalTasks;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-2xl">
        <BackToHub currentPage={tx({ he: "אתגר שבועי", en: "Weekly Challenge" }, language)} />

        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-4xl">🎯</div>
            <h1 className="text-2xl font-bold text-foreground" dir="auto">
              {tx({ he: `אתגר שבוע #${weekNumber}`, en: `Week #${weekNumber} Challenge` }, language)}
            </h1>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {daysLeft} {tx({ he: "ימים נותרו", en: "days left" }, language)}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {WEEKLY_PARTICIPANTS.toLocaleString()} {tx({ he: "משתתפים", en: "participants" }, language)}
              </Badge>
            </div>
          </div>

          {/* Progress Card */}
          <Card className={isComplete ? "border-accent/30 bg-accent/5" : "border-primary/20 bg-primary/5"}>
            <CardContent className="p-4 space-y-3">
              {isComplete ? (
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="font-bold text-foreground" dir="auto">
                      {tx({ he: "🎉 השלמת את האתגר השבועי!", en: "🎉 You completed the weekly challenge!" }, language)}
                    </p>
                    <p className="text-sm text-muted-foreground" dir="auto">
                      {totalPoints} {tx({ he: "נקודות הושגו", en: "points earned" }, language)}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground" dir="auto">
                      {completedCount}/{totalTasks} {tx({ he: "משימות", en: "tasks" }, language)}
                    </span>
                    <span className="text-primary font-bold">{totalPoints} {tx({ he: "נק'", en: "pts" }, language)}</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                  <p className="text-xs text-muted-foreground" dir="auto">
                    {isHe
                      ? `${100 - totalPoints} נקודות נותרו לסיום האתגר`
                      : `${100 - totalPoints} points remaining to complete challenge`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Task List */}
          <div className="space-y-3">
            {WEEKLY_TASKS.map((task) => {
              const isTaskDone = progress.completedTasks.includes(task.id);
              const Icon = task.icon;
              return (
                <Card key={task.id} className={`${isTaskDone ? "opacity-60" : ""} transition-opacity`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isTaskDone ? "bg-accent/20" : "bg-primary/10"}`}>
                      {isTaskDone
                        ? <CheckCircle className="h-4 w-4 text-accent" />
                        : <Icon className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground" dir="auto">{task.label[language]}</p>
                        <Badge variant="secondary" className="text-xs">+{task.points} {tx({ he: "נק'", en: "pts" }, language)}</Badge>
                        {isTaskDone && <Badge variant="outline" className="text-xs text-accent border-accent/30">{tx({ he: "הושלם", en: "Done" }, language)}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground" dir="auto">{task.desc[language]}</p>
                    </div>
                    {!isTaskDone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => markComplete(task.id, task.route)}
                      >
                        {tx({ he: "בצע", en: "Go" }, language)}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Leaderboard CTA */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground" dir="auto">
                  {tx({ he: "ראה מי מוביל השבוע", en: "See who's leading this week" }, language)}
                </p>
                <p className="text-xs text-muted-foreground" dir="auto">
                  {tx({ he: "לוח מובילים מתאפס כל ראשון", en: "Leaderboard resets every Sunday" }, language)}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => navigate("/leaderboard")}>
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                {tx({ he: "לדירוג", en: "Rankings" }, language)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
