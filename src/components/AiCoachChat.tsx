import { useState, useRef, useEffect, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { authFetch } from "@/lib/authFetch";
import { FunnelResult, FormData } from "@/types/funnel";
import { DifferentiationResult } from "@/types/differentiation";
import { buildUserKnowledgeGraph, UserKnowledgeGraph, StylomeVoice, loadImportedDataSignals } from "@/engine/userKnowledgeGraph";
import { safeStorage } from "@/lib/safeStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { tx } from "@/i18n/tx";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";

interface AiCoachChatProps {
  result: FunnelResult | null;
  healthScore?: number;
  stylomePrompt?: string;
}

const EMPTY_FORM_DATA: FormData = {
  businessField: "",
  audienceType: "",
  ageRange: [25, 55],
  interests: "",
  productDescription: "",
  averagePrice: 0,
  salesModel: "",
  budgetRange: "",
  mainGoal: "",
  existingChannels: [],
  experienceLevel: "",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getSmartPrompts(graph: UserKnowledgeGraph, isHe: boolean, language: "he" | "en"): string[] {
  const field = isHe ? graph.derived.identityStatement.he.slice(0, 30) : graph.business.field;
  const pain = tx(graph.derived.topPainPoint, language);
  const channels = graph.business.channels.slice(0, 2).join(" + ");
  const hasDiff = !!graph.differentiation;

  if (isHe) {
    return [
      `תכתוב לי 3 פוסטים ל${channels || "רשתות חברתיות"} עם הוקים מותאמים`,
      `איך מתמודדים עם "${pain}" בתחום שלי?`,
      hasDiff ? "תכתוב לי pitch של 30 שניות מבוסס על הבידול שלי" : "תכתוב לי pitch של 30 שניות",
      `מה 3 הפעולות הכי דחופות לשבוע הקרוב?`,
    ];
  }
  return [
    `Write 3 posts for ${channels || "social media"} with tailored hooks`,
    `How to tackle "${pain}" in my field?`,
    hasDiff ? "Write a 30-second pitch based on my differentiation" : "Write a 30-second pitch",
    "What are the 3 most urgent actions for this week?",
  ];
}

function buildCoachContext(graph: UserKnowledgeGraph, healthScore?: number, stylomePrompt?: string) {
  const ctx: Record<string, string | number | undefined> = {
    businessField: graph.business.field,
    productDescription: graph.business.product,
    averagePrice: graph.business.price,
    audienceType: graph.business.audience,
    budgetRange: graph.business.budget,
    mainGoal: graph.business.goal,
    experienceLevel: graph.business.experience,
    salesModel: graph.business.salesModel,
    existingChannels: graph.business.channels.join(", "),
    healthScore,
    identityStatement: graph.derived.identityStatement.he,
    topPainPoint: graph.derived.topPainPoint.he,
    industryPains: graph.derived.industryPainPoints.map((p) => p.he).join("; "),
    framingPreference: graph.derived.framingPreference,
    complexityLevel: graph.derived.complexityLevel,
    stageOfChange: graph.behavior.stageOfChange,
    buyerPersonality: graph.differentiation ? "detected" : undefined,
  };

  // Differentiation context
  if (graph.differentiation) {
    const d = graph.differentiation;
    if (d.mechanismStatement?.oneLiner?.he) ctx.mechanism = d.mechanismStatement.oneLiner.he;
    if (d.mechanismStatement?.antiStatement) ctx.antiStatement = d.mechanismStatement.antiStatement;
    if (d.competitors.length > 0) ctx.competitors = d.competitors.join(", ");
    if (d.tradeoffs.length > 0) ctx.tradeoffs = d.tradeoffs.map((t) => `${t.weakness} → ${t.reframe}`).join("; ");
    if (d.hiddenValues.length > 0) ctx.topHiddenValues = d.hiddenValues.slice(0, 3).map((v) => `${v.valueId}:${v.score}`).join(", ");
  }

  // Voice context
  if (graph.voice) {
    ctx.voiceRegister = graph.voice.register;
    ctx.dugriScore = graph.voice.dugriScore;
    ctx.codeMixing = graph.voice.codeMixingIndex;
  }

  if (stylomePrompt) ctx.stylomePrompt = stylomePrompt.slice(0, 500);

  // Real metrics from imported CSV/Excel or Meta Ads
  const m = graph.derived.realMetrics;
  if (m.trendDirection) ctx.dataOverallTrend = m.trendDirection;
  if (m.avgCTR != null) ctx.avgCTR = m.avgCTR;
  if (m.avgCPL != null) ctx.avgCPL = m.avgCPL;
  if (m.avgCVR != null) ctx.avgCVR = m.avgCVR;
  ctx.dataConfidence = graph.derived.dataConfidence;

  return ctx;
}

const AiCoachChat = ({ result, healthScore, stylomePrompt }: AiCoachChatProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    safeStorage.getJSON<ChatMessage[]>("funnelforge-coach-messages", []),
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build knowledge graph for rich context (or a minimal graph if no plan yet)
  const diffResult = useMemo<DifferentiationResult | null>(
    () => safeStorage.getJSON<DifferentiationResult | null>("funnelforge-differentiation-result", null),
    [],
  );
  const stylomeVoice = useMemo<StylomeVoice | null>(
    () => safeStorage.getJSON<StylomeVoice | null>("funnelforge-stylome-voice", null),
    [],
  );
  const formData = result?.formData ?? EMPTY_FORM_DATA;
  const graph = useMemo(() => {
    const imported = loadImportedDataSignals();
    return buildUserKnowledgeGraph(formData, diffResult, stylomeVoice, undefined, undefined, { importedData: imported });
  }, [formData, diffResult, stylomeVoice]);
  const quickPrompts = useMemo(() => getSmartPrompts(graph, isHe, language), [graph, isHe, language]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    // Persist messages to localStorage
    if (messages.length > 0) {
      safeStorage.setJSON("funnelforge-coach-messages", messages.slice(-50));
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const _resp = await authFetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          context: buildCoachContext(graph, healthScore, stylomePrompt),
        }),
      });
      const data = await _resp.json();
      const fnError = _resp.ok ? null : (data?.error || _resp.statusText);

      if (fnError) throw new Error(fnError);
      const reply = data?.reply || (tx({ he: "לא הצלחתי לענות. נסה שוב.", en: "Couldn't respond. Try again." }, language));
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const display = msg.includes("ANTHROPIC_API_KEY")
        ? tx({ he: "שירות ה-AI לא מוגדר (חסר ANTHROPIC_API_KEY בסוד Supabase).", en: "AI service not configured (missing ANTHROPIC_API_KEY in Supabase secrets)." }, language)
        : msg.includes("Unauthorized") || msg.includes("401")
          ? tx({ he: "נא להתחבר לחשבון כדי להשתמש במאמן.", en: "Please sign in to use the AI coach." }, language)
          : msg.includes("Origin not allowed") || msg.includes("403")
            ? tx({ he: "שגיאת CORS: הדומיין לא מורשה. הוסף אותו ל-ALLOWED_ORIGINS ב-Supabase.", en: "CORS error: domain not allowed. Add it to ALLOWED_ORIGINS in Supabase." }, language)
            : tx({ he: "שגיאה: ", en: "Error: " }, language) + msg;
      setError(display);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Card className="flex flex-col h-[60vh] sm:h-[500px]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          {tx({ he: "מאמן שיווק AI", en: "AI Marketing Coach" }, language)}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isHe
            ? "מכיר את העסק שלך, הסגנון שלך, והתוכניות שלך. שאל כל שאלה."
            : "Knows your business, style, and plans. Ask anything."}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 gap-3 pb-3">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center mb-4">
                {tx({ he: "שאל אותי כל שאלה על השיווק שלך:", en: "Ask me anything about your marketing:" }, language)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-lg border bg-muted/30 p-2.5 text-xs text-foreground hover:bg-muted/60 transition-colors text-start"
                  >
                    <Sparkles className="h-3 w-3 text-primary inline me-1" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-muted/50 px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive shrink-0">{error}</div>
        )}

        {/* Input */}
        <div className="flex gap-2 shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={tx({ he: "שאל את המאמן שלך...", en: "Ask your coach..." }, language)}
            className="min-h-[40px] max-h-[80px] text-sm resize-none"
            dir="auto"
          />
          <Button
            size="sm"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  );
};

export default AiCoachChat;
