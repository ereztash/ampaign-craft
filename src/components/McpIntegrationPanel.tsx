// ═══════════════════════════════════════════════
// McpIntegrationPanel — Connect Claude Desktop via MCP
//
// Shows the user how to connect their Claude Desktop
// (or Claude Code) to FunnelForge via the MCP server.
// ═══════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Copy,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plug,
  Key,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const MCP_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/mcp-server`
  : null;

// Available MCP tools to display to the user
const MCP_TOOLS = [
  {
    name: "list_plans",
    he: "רשימת כל התוכניות השמורות",
    en: "List all saved plans",
  },
  {
    name: "get_plan",
    he: "קבלת תוכנית מלאה לפי ID",
    en: "Get full plan by ID",
  },
  {
    name: "get_profile",
    he: "פרטי פרופיל המשתמש",
    en: "User profile details",
  },
  {
    name: "get_blackboard",
    he: "נתוני Blackboard לתוכנית",
    en: "Blackboard data for a plan",
  },
  {
    name: "ask_coach",
    he: "שאל את מאמן ה-AI שאלה עסקית",
    en: "Ask the AI coach a business question",
  },
  {
    name: "generate_copy",
    he: "צור תוכן שיווקי (מודעה / אימייל / פוסט)",
    en: "Generate marketing copy (ad / email / post)",
  },
  {
    name: "get_agent_tasks",
    he: "היסטוריית משימות סוכני AI",
    en: "AI agent task history",
  },
  {
    name: "get_health_score",
    he: "ציון הבריאות השיווקית",
    en: "Marketing health score",
  },
];

export function McpIntegrationPanel() {
  const { language } = useLanguage();
  const { isLocalAuth } = useAuth();
  const { toast } = useToast();
  const isHe = language === "he";

  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoadingToken(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setToken(session?.access_token ?? null);
    } catch {
      setToken(null);
    } finally {
      setLoadingToken(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocalAuth) {
      fetchToken();
    }
  }, [isLocalAuth, fetchToken]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({
        title: tx({ he: "הועתק ללוח", en: "Copied to clipboard" }, language),
      });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({
        title: tx({ he: "שגיאה בהעתקה", en: "Copy failed" }, language),
        variant: "destructive",
      });
    }
  };

  const configJson = MCP_ENDPOINT
    ? JSON.stringify(
        {
          mcpServers: {
            funnelforge: {
              type: "http",
              url: MCP_ENDPOINT,
              headers: {
                Authorization: `Bearer ${token ?? "YOUR_SUPABASE_JWT_TOKEN"}`,
              },
            },
          },
        },
        null,
        2
      )
    : null;

  // Not available for local auth (no Supabase JWT)
  if (isLocalAuth) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" />
            {tx({ he: "חיבור Claude MCP", en: "Claude MCP Connection" }, language)}
          </CardTitle>
          <CardDescription>
            {isHe
              ? "אפשרות זו זמינה רק עם חשבון Supabase מחובר."
              : "This option requires a connected Supabase account."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {tx({ he: "חיבור Claude Desktop / Code", en: "Claude Desktop / Code" }, language)}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-normal gap-1">
            <Plug className="h-3 w-3" />
            MCP
          </Badge>
        </div>
        <CardDescription dir="auto">
          {isHe
            ? "חבר את Claude שלך ל-FunnelForge דרך MCP. Claude יוכל לקרוא תוכניות, לשאול את המאמן ולצור תוכן שיווקי ישירות."
            : "Connect your Claude to FunnelForge via MCP. Claude can read plans, ask the coach, and generate marketing copy directly."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* MCP Endpoint */}
        {MCP_ENDPOINT ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {tx({ he: "כתובת שרת MCP", en: "MCP Server URL" }, language)}
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <code className="flex-1 text-xs break-all text-foreground">
                {MCP_ENDPOINT}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => copyText(MCP_ENDPOINT, "url")}
              >
                {copied === "url" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-destructive">
            {isHe
              ? "VITE_SUPABASE_URL לא מוגדר ב-.env"
              : "VITE_SUPABASE_URL not set in .env"}
          </p>
        )}

        {/* Token */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Key className="h-3 w-3" />
              {tx({ he: "טוקן הזדהות (JWT)", en: "Auth Token (JWT)" }, language)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={fetchToken}
              disabled={loadingToken}
            >
              <RefreshCw
                className={`h-3 w-3 ${loadingToken ? "animate-spin" : ""}`}
              />
              {tx({ he: "רענן", en: "Refresh" }, language)}
            </Button>
          </div>

          {token ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <code className="flex-1 text-xs truncate text-foreground" dir="ltr">
                {token.slice(0, 40)}…
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => copyText(token, "token")}
              >
                {copied === "token" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {loadingToken
                ? isHe
                  ? "טוען…"
                  : "Loading…"
                : isHe
                  ? "טוקן לא נמצא. נסה להתנתק ולהתחבר מחדש."
                  : "Token not found. Try signing out and back in."}
            </p>
          )}

          <p className="text-xs text-muted-foreground" dir="auto">
            {isHe
              ? "הטוקן פג תוקף כל שעה. רענן אותו מדי פעם ועדכן את ההגדרה ב-Claude."
              : "Token expires every hour. Refresh periodically and update the Claude config."}
          </p>
        </div>

        {/* Config snippet */}
        {configJson && (
          <div className="space-y-1">
            <button
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
              onClick={() => setShowConfig((p) => !p)}
            >
              <span>
                {isHe
                  ? "הגדרת Claude Desktop (claude_desktop_config.json)"
                  : "Claude Desktop config (claude_desktop_config.json)"}
              </span>
              {showConfig ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showConfig && (
              <div className="relative rounded-md border bg-muted/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 end-2 h-6 w-6"
                  onClick={() => copyText(configJson, "config")}
                >
                  {copied === "config" ? (
                    <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <pre className="overflow-x-auto p-3 text-xs leading-relaxed" dir="ltr">
                  {configJson}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Available tools */}
        <div className="space-y-1">
          <button
            className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            onClick={() => setShowTools((p) => !p)}
          >
            <span>
              {isHe
                ? `כלים זמינים ל-Claude (${MCP_TOOLS.length})`
                : `Available tools for Claude (${MCP_TOOLS.length})`}
            </span>
            {showTools ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showTools && (
            <ul className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-3">
              {MCP_TOOLS.map((tool) => (
                <li key={tool.name} className="flex items-start gap-2 text-xs">
                  <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-foreground">
                    {tool.name}
                  </code>
                  <span className="text-muted-foreground" dir="auto">
                    {tx(tool, language)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Instructions link */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs" dir="auto">
          <p className="font-medium text-foreground mb-1">
            {tx({ he: "איך מחברים?", en: "How to connect?" }, language)}
          </p>
          <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
            {isHe ? (
              <>
                <li>
                  הורד והתקן{" "}
                  <span className="font-medium text-foreground">
                    Claude Desktop
                  </span>
                </li>
                <li>פתח את קובץ ההגדרות: <code>claude_desktop_config.json</code></li>
                <li>הדבק את הקוד מלמעלה עם הטוקן שלך</li>
                <li>שמור וטען מחדש את Claude Desktop</li>
                <li>
                  בשיחה עם Claude, כתוב:{" "}
                  <em>
                    &quot;השתמש ב-FunnelForge — הצג לי את התוכניות שלי&quot;
                  </em>
                </li>
              </>
            ) : (
              <>
                <li>
                  Download and install{" "}
                  <span className="font-medium text-foreground">
                    Claude Desktop
                  </span>
                </li>
                <li>
                  Open settings file: <code>claude_desktop_config.json</code>
                </li>
                <li>Paste the config snippet above with your token</li>
                <li>Save and restart Claude Desktop</li>
                <li>
                  In Claude, type:{" "}
                  <em>
                    &quot;Use FunnelForge — show me my saved plans&quot;
                  </em>
                </li>
              </>
            )}
          </ol>

          <a
            href="https://modelcontextprotocol.io/quickstart/user"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {tx({ he: "מדריך MCP מלא", en: "Full MCP guide" }, language)}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
