// PipelinePulseCard — A CRM Signal in CommandCenter.
//
// Surfaces the orthogonal data the rest of the system can't infer:
//   1. Stale leads (open, no interaction in 7+ days) — calls to action
//   2. Real close rate vs predicted (when ≥10 decided leads exist)
//   3. Top objection or win theme (when meaningful)
//
// Returns null when the user has no leads — the card hides itself
// instead of showing a "0 leads" placeholder.

import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmInsights } from "@/hooks/useCrmInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { Activity, AlertCircle, ArrowRight, Target, TrendingUp } from "lucide-react";

const MAX_STALE_TO_SHOW = 3;

export function PipelinePulseCard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { insights, loading } = useCrmInsights(user?.id);

  if (loading || !insights || insights.totalLeads === 0) return null;

  const showStale = insights.staleLeads.length > 0;
  const showCloseRate = insights.meaningful;
  const topWin = insights.winThemes[0];
  const topObjection = insights.objectionThemes[0];
  const showTheme = insights.meaningful && (topWin || topObjection);

  if (!showStale && !showCloseRate && !showTheme) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2" dir="auto">
          <Activity className="h-4 w-4 text-primary" />
          {tx({ he: "Pipeline Pulse", en: "Pipeline Pulse" }, language)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {showStale && (
          <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-foreground leading-tight" dir="auto">
                    {tx({
                      he: `${insights.staleLeads.length} לידים תקועים מעל שבוע`,
                      en: `${insights.staleLeads.length} leads stuck >7 days`,
                    }, language)}
                  </p>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {insights.staleLeads.length}
                  </Badge>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {insights.staleLeads.slice(0, MAX_STALE_TO_SHOW).map((s) => (
                    <li key={s.leadId} className="text-[11px] text-muted-foreground flex items-center gap-1" dir="auto">
                      <span className="truncate">{s.name}</span>
                      <span className="opacity-70">·</span>
                      <span className="opacity-70 shrink-0">
                        {tx({ he: `${s.daysSinceLastTouch} ימים`, en: `${s.daysSinceLastTouch}d` }, language)}
                      </span>
                      <Link to={`/crm/${s.leadId}`} className="ms-auto text-primary hover:underline shrink-0">
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {showCloseRate && (
          <div className="rounded-lg p-2.5 bg-primary/5">
            <div className="flex items-start gap-2">
              <Target className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight" dir="auto">
                  {tx({
                    he: `שיעור סגירה אמיתי: ${(insights.closeRate * 100).toFixed(0)}%`,
                    en: `Actual close rate: ${(insights.closeRate * 100).toFixed(0)}%`,
                  }, language)}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5" dir="auto">
                  {tx({
                    he: `${insights.closedCount} סגורים מתוך ${insights.closedCount + insights.lostCount} שהוכרעו`,
                    en: `${insights.closedCount} won out of ${insights.closedCount + insights.lostCount} decided`,
                  }, language)}
                </p>
              </div>
            </div>
          </div>
        )}

        {showTheme && topWin && (
          <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-900/20">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight" dir="auto">
                  {tx({
                    he: `מוטיב מנצח: "${topWin.label}"`,
                    en: `Winning theme: "${topWin.label}"`,
                  }, language)}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5" dir="auto">
                  {tx({
                    he: `הופיע ב-${topWin.count} עסקאות סגורות. תדגיש את זה במסר הבא.`,
                    en: `Appeared in ${topWin.count} won deals. Lead with this in your next pitch.`,
                  }, language)}
                </p>
              </div>
            </div>
          </div>
        )}

        {showTheme && topObjection && (
          <div className="rounded-lg p-2.5 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-600" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight" dir="auto">
                  {tx({
                    he: `התנגדות חוזרת: "${topObjection.label}"`,
                    en: `Recurring objection: "${topObjection.label}"`,
                  }, language)}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5" dir="auto">
                  {tx({
                    he: `נשמעה ב-${topObjection.count} הפסדים. הכן תשובה לפני הפגישה הבאה.`,
                    en: `Surfaced in ${topObjection.count} losses. Have a counter ready before next meeting.`,
                  }, language)}
                </p>
              </div>
            </div>
          </div>
        )}

        <Link to="/crm" className="block">
          <Button variant="ghost" size="sm" className="w-full text-xs gap-1 h-7">
            {tx({ he: "פתח CRM", en: "Open CRM" }, language)}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
