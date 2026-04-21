import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { authFetch } from "@/lib/authFetch";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, AlertTriangle, Stethoscope } from "lucide-react";

interface SubsystemStatus {
  status: "ok" | "degraded" | "down";
  latencyMs?: number;
  reason?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "down";
  ts: string;
  version: string;
  probe: { mode: "shallow" | "deep" };
  subsystems: {
    database: SubsystemStatus;
    ai: SubsystemStatus;
    meta: SubsystemStatus;
  };
}

const STATUS_VARIANT: Record<SubsystemStatus["status"], "default" | "secondary" | "destructive"> = {
  ok: "default",
  degraded: "secondary",
  down: "destructive",
};

const OVERALL_LABEL: Record<HealthResponse["status"], { he: string; en: string }> = {
  healthy: { he: "תקין", en: "Healthy" },
  degraded: { he: "ירוד", en: "Degraded" },
  down: { he: "נפול", en: "Down" },
};

const SUB_LABEL: Record<SubsystemStatus["status"], { he: string; en: string }> = {
  ok: { he: "תקין", en: "OK" },
  degraded: { he: "ירוד", en: "Degraded" },
  down: { he: "נפול", en: "Down" },
};

// Translate `ai.reason` codes into actionable Hebrew/English hints.
function aiHint(reason: string | undefined, lang: "he" | "en"): string | null {
  if (!reason) return null;
  const code = reason.split(":")[0];
  const map: Record<string, { he: string; en: string }> = {
    missing_api_key: {
      he: "ANTHROPIC_API_KEY לא מוגדר. הוסף אותו ב-Supabase Dashboard → Edge Functions → Secrets.",
      en: "ANTHROPIC_API_KEY not set. Add it in Supabase Dashboard → Edge Functions → Secrets.",
    },
    invalid_api_key: {
      he: "המפתח ANTHROPIC_API_KEY לא תקף או פג תוקף. החלף אותו ב-Supabase Secrets.",
      en: "ANTHROPIC_API_KEY is invalid or expired. Replace it in Supabase Secrets.",
    },
    unauthorized: {
      he: "המפתח חסום מגישה למודל המבוקש. בדוק הרשאות ב-Anthropic Console.",
      en: "Key is blocked from accessing the requested model. Check permissions in Anthropic Console.",
    },
    rate_limited: {
      he: "נחסמת זמנית על ידי Anthropic. המתן דקה ונסה שוב.",
      en: "Temporarily rate-limited by Anthropic. Wait a minute and retry.",
    },
    model_not_found: {
      he: "אחת הפונקציות משתמשת ב-model ID שאינו קיים. בדוק את הקוד.",
      en: "A function uses a model ID that doesn't exist. Check the code.",
    },
    upstream_error: {
      he: "Anthropic מחזיר שגיאה. בדוק את status.anthropic.com.",
      en: "Anthropic is returning errors. Check status.anthropic.com.",
    },
    network_error: {
      he: "בעיית רשת מול Anthropic. בדוק חיבור אינטרנט ו-status.anthropic.com.",
      en: "Network issue reaching Anthropic. Check connection and status.anthropic.com.",
    },
  };
  return map[code] ? map[code][lang] : null;
}

export default function AdminLlmDiagnostics() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();

  const [result, setResult] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  async function runCheck(deep: boolean) {
    setFetching(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health${deep ? "?deep=1" : ""}`;
      const resp = await authFetch(url, { method: "GET" });
      const data = await resp.json();
      // Health endpoint returns 503 for degraded/down but still a valid JSON body.
      setResult(data as HealthResponse);
    } catch (err) {
      logger.warn("AdminLlmDiagnostics.runCheck", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">…</div>;
  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    return <Navigate to="/" replace />;
  }

  const isHe = language === "he";
  const aiReasonCode = result?.subsystems?.ai?.reason?.split(":")[0];
  const aiHintText = aiHint(result?.subsystems?.ai?.reason, language);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6 space-y-6" dir={isHe ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-semibold">
            {tx({ he: "אבחון חיבור AI", en: "LLM Diagnostics" }, language)}
          </h1>
          <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">Owner Only</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runCheck(false)}
            disabled={fetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin" : ""}`} />
            {tx({ he: "בדיקה שטחית", en: "Shallow check" }, language)}
          </Button>
          <Button
            size="sm"
            onClick={() => runCheck(true)}
            disabled={fetching}
            className="gap-1.5"
          >
            <Activity className={`h-3.5 w-3.5 ${fetching ? "animate-spin" : ""}`} />
            {tx({ he: "בדיקה עמוקה (1 טוקן)", en: "Deep check (1 token)" }, language)}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {tx(
          {
            he: "בדיקה שטחית מוודאת רק שהמפתח מוגדר. בדיקה עמוקה שולחת בקשה אמיתית ל-Anthropic (טוקן אחד).",
            en: "Shallow check verifies the key is set. Deep check sends a real 1-token request to Anthropic.",
          },
          language,
        )}
      </p>

      {error && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>{tx({ he: "סטטוס מערכות", en: "Subsystem Status" }, language)}</span>
              <Badge variant={STATUS_VARIANT[result.status === "healthy" ? "ok" : result.status === "degraded" ? "degraded" : "down"]}>
                {OVERALL_LABEL[result.status][language]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b">
                    <th className="text-start pb-2 px-2">{tx({ he: "מערכת", en: "Subsystem" }, language)}</th>
                    <th className="text-start pb-2 px-2">{tx({ he: "סטטוס", en: "Status" }, language)}</th>
                    <th className="text-end pb-2 px-2">{tx({ he: "השהיה", en: "Latency" }, language)}</th>
                    <th className="text-start pb-2 px-2">{tx({ he: "סיבה", en: "Reason" }, language)}</th>
                  </tr>
                </thead>
                <tbody>
                  <SubsystemRow
                    name={tx({ he: "בסיס נתונים", en: "Database" }, language)}
                    sub={result.subsystems.database}
                    lang={language}
                  />
                  <SubsystemRow
                    name={tx({ he: "AI (Anthropic)", en: "AI (Anthropic)" }, language)}
                    sub={result.subsystems.ai}
                    lang={language}
                  />
                  <SubsystemRow
                    name="Meta"
                    sub={result.subsystems.meta}
                    lang={language}
                  />
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-muted-foreground tabular-nums">
              {tx({ he: "מצב פרוב", en: "Probe mode" }, language)}: <span className="font-mono">{result.probe.mode}</span>
              {" · "}
              {tx({ he: "זמן", en: "Time" }, language)}: {new Date(result.ts).toLocaleTimeString()}
              {" · "}
              {tx({ he: "גרסה", en: "Version" }, language)}: <span className="font-mono">{result.version}</span>
            </div>

            {aiHintText && (
              <div className="mt-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium mb-1">
                      {tx({ he: "הצעת פעולה", en: "Suggested Action" }, language)}
                      {aiReasonCode && <span className="font-mono text-xs text-muted-foreground ms-2">[{aiReasonCode}]</span>}
                    </div>
                    <div>{aiHintText}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!result && !error && (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            {tx(
              {
                he: "לחץ על 'בדיקה עמוקה' כדי לאמת שה-LLM עובד בפועל.",
                en: "Click 'Deep check' to verify the LLM actually works.",
              },
              language,
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function SubsystemRow({
  name,
  sub,
  lang,
}: {
  name: string;
  sub: SubsystemStatus;
  lang: "he" | "en";
}) {
  return (
    <tr className="border-b border-border/40">
      <td className="py-2 px-2 font-medium">{name}</td>
      <td className="py-2 px-2">
        <Badge variant={STATUS_VARIANT[sub.status]}>{SUB_LABEL[sub.status][lang]}</Badge>
      </td>
      <td className="py-2 px-2 text-end text-xs text-muted-foreground tabular-nums">
        {typeof sub.latencyMs === "number" ? `${sub.latencyMs} ms` : "—"}
      </td>
      <td className="py-2 px-2 text-xs font-mono text-muted-foreground break-all">
        {sub.reason ?? "—"}
      </td>
    </tr>
  );
}
