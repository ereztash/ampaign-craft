import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { isAdminRole } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Activity, Coins, Hash, RefreshCw, Trash2 } from "lucide-react";
import {
  getMonthlyUsage,
  getUsageByAgent,
  getUsageByLoop,
  getUsageByTask,
  getUsageHistory,
  type MonthlyUsage,
  type UsageBreakdown,
} from "@/services/llmRouter";
import { safeStorage } from "@/lib/safeStorage";

const STORAGE_KEY = "funnelforge-llm-usage";

export default function AdminLLMCost() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const isHe = language === "he";

  const [monthly, setMonthly] = useState<MonthlyUsage | null>(null);
  const [byAgent, setByAgent] = useState<UsageBreakdown[]>([]);
  const [byLoop, setByLoop] = useState<UsageBreakdown[]>([]);
  const [byTask, setByTask] = useState<UsageBreakdown[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    setMonthly(getMonthlyUsage());
    setByAgent(getUsageByAgent());
    setByLoop(getUsageByLoop());
    setByTask(getUsageByTask());
    setHistoryCount(getUsageHistory().length);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const clearHistory = () => {
    const confirmMsg = isHe
      ? "למחוק את כל היסטוריית השימוש המקומית? פעולה זו אינה הפיכה."
      : "Clear all local LLM usage history? This cannot be undone.";
    if (!window.confirm(confirmMsg)) return;
    safeStorage.setJSON(STORAGE_KEY, []);
    refresh();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">…</div>;
  if (!isAdminRole(user?.role)) return <Navigate to="/" replace />;

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6" dir={isHe ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Coins className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-semibold">
            {tx({ he: "עלות LLM לפי סוכן ולולאה", en: "LLM Cost by Agent & Loop" }, language)}
          </h1>
          <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">Admin Only</Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              {tx({ he: "עודכן", en: "Refreshed" }, language)}: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {tx({ he: "רענן", en: "Refresh" }, language)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            disabled={historyCount === 0}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {tx({ he: "נקה היסטוריה", en: "Clear" }, language)}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {tx({
          he: `נתונים מקומיים בלבד (localStorage, עד 500 קריאות אחרונות). לא נתוני שרת.`,
          en: `Local browser data only (localStorage, last 500 calls). Not server-side telemetry.`,
        }, language)}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Activity className="h-4 w-4" />}
          label={tx({ he: "קריאות החודש", en: "Calls this month" }, language)}
          value={monthly?.callCount ?? 0}
        />
        <SummaryCard
          icon={<Hash className="h-4 w-4" />}
          label={tx({ he: "טוקנים החודש", en: "Tokens this month" }, language)}
          value={(monthly?.totalTokens ?? 0).toLocaleString()}
        />
        <SummaryCard
          icon={<Coins className="h-4 w-4" />}
          label={tx({ he: "עלות החודש (₪)", en: "Cost this month (NIS)" }, language)}
          value={(monthly?.totalCostNIS ?? 0).toFixed(2)}
        />
        <SummaryCard
          icon={<Activity className="h-4 w-4" />}
          label={tx({ he: "רשומות בהיסטוריה", en: "Records in history" }, language)}
          value={historyCount}
        />
      </div>

      <BreakdownCard
        title={tx({ he: "לפי סוכן", en: "By Agent" }, language)}
        keyHeader={tx({ he: "סוכן", en: "Agent" }, language)}
        rows={byAgent}
        language={language}
        empty={tx({
          he: "אין עדיין קריאות מתויגות לסוכן. הפעל את המערכת ותחזור לכאן.",
          en: "No agent-tagged calls yet. Use the app and come back.",
        }, language)}
      />

      <BreakdownCard
        title={tx({ he: "לפי לולאת משוב", en: "By Feedback Loop" }, language)}
        keyHeader={tx({ he: "לולאה", en: "Loop" }, language)}
        rows={byLoop}
        language={language}
        empty={tx({
          he: "אין עדיין קריאות מתויגות ללולאה.",
          en: "No loop-tagged calls yet.",
        }, language)}
      />

      <BreakdownCard
        title={tx({ he: "לפי משימה", en: "By Task" }, language)}
        keyHeader={tx({ he: "משימה", en: "Task" }, language)}
        rows={byTask}
        language={language}
        empty={tx({ he: "אין עדיין נתונים.", en: "No data yet." }, language)}
      />
    </main>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title, keyHeader, rows, language, empty,
}: {
  title: string;
  keyHeader: string;
  rows: UsageBreakdown[];
  language: "he" | "en";
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{keyHeader}</TableHead>
                <TableHead className="text-right">{tx({ he: "קריאות", en: "Calls" }, language)}</TableHead>
                <TableHead className="text-right">{tx({ he: "סך טוקנים", en: "Total Tokens" }, language)}</TableHead>
                <TableHead className="text-right">{tx({ he: "ממוצע / קריאה", en: "Avg / Call" }, language)}</TableHead>
                <TableHead className="text-right">{tx({ he: "עלות (₪)", en: "Cost (NIS)" }, language)}</TableHead>
                <TableHead className="text-right">{tx({ he: "ממוצע עלות (₪)", en: "Avg Cost (NIS)" }, language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-mono text-xs">{r.key}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.callCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avgTokensPerCall.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalCostNIS.toFixed(4)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avgCostNIS.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
