import { useState, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { analyzeSamples, StylomeProfile, StylomeSample, INTERVIEW_QUESTIONS } from "@/engine/stylomeEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeStorage } from "@/lib/safeStorage";
import { tx } from "@/i18n/tx";
import { Copy, Plus, Trash2, Fingerprint, Sparkles, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";

type WizardStep = "collect" | "analyze" | "profile";

const CONTEXT_LABELS: Record<string, { he: string; en: string }> = {
  formal: { he: "רשמי (מייל, דוח)", en: "Formal (email, report)" },
  informal: { he: "לא-רשמי (וואטסאפ, צ'אט)", en: "Informal (WhatsApp, chat)" },
  marketing: { he: "שיווקי (פוסט, מודעה)", en: "Marketing (post, ad)" },
  general: { he: "כללי", en: "General" },
};

const REGISTER_LABELS: Record<string, { he: string; en: string }> = {
  formal: { he: "רשמי", en: "Formal" },
  casual: { he: "לא-פורמלי", en: "Casual" },
  mixed: { he: "מעורב", en: "Mixed" },
};

const COGNITIVE_LABELS: Record<string, { he: string; en: string }> = {
  concrete: { he: "קונקרטי", en: "Concrete" },
  abstract: { he: "מופשט", en: "Abstract" },
  balanced: { he: "מאוזן", en: "Balanced" },
};

const EMOTION_LABELS: Record<string, { he: string; en: string }> = {
  low: { he: "נמוכה", en: "Low" },
  medium: { he: "בינונית", en: "Medium" },
  high: { he: "גבוהה", en: "High" },
};

const StylomeExtractor = () => {
  const { language } = useLanguage();
  const isHe = language === "he";

  const [step, setStep] = useState<WizardStep>("collect");
  const [samples, setSamples] = useState<StylomeSample[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [currentContext, setCurrentContext] = useState<StylomeSample["context"]>("general");
  const [profile, setProfile] = useState<StylomeProfile | null>(null);
  const [copied, setCopied] = useState(false);

  const addSample = useCallback(() => {
    if (!currentText.trim() || currentText.trim().split(/\s+/).length < 10) {
      toast.error(tx({ he: "נדרשות לפחות 10 מילים לדגימה", en: "At least 10 words required per sample" }, language));
      return;
    }
    const words = currentText.trim().split(/\s+/);
    setSamples((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: currentText.trim(),
        context: currentContext,
        wordCount: words.length,
      },
    ]);
    setCurrentText("");
    toast.success(tx({ he: "דגימה נוספה!", en: "Sample added!" }, language));
  }, [currentText, currentContext, language]);

  const removeSample = (id: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const runAnalysis = () => {
    if (samples.length < 1) {
      toast.error(tx({ he: "נדרשת לפחות דגימה אחת", en: "At least 1 sample required" }, language));
      return;
    }
    const result = analyzeSamples(samples);
    setProfile(result);
    setStep("profile");
    // Persist voice profile for cross-module personalization
    safeStorage.setJSON("funnelforge-stylome-voice", {
      register: result.style.register,
      dugriScore: result.metrics.dugriScore,
      cognitiveStyle: result.style.cognitiveStyle,
      emotionalIntensity: result.style.emotionalIntensity,
      codeMixingIndex: result.metrics.codeMixingIndex,
    });
  };

  const copyPrompt = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.systemPrompt);
    setCopied(true);
    toast.success(tx({ he: "הפרומפט הועתק!", en: "Prompt copied!" }, language));
    setTimeout(() => setCopied(false), 2000);
  };

  const totalWords = samples.reduce((sum, s) => sum + s.wordCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Fingerprint className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {tx({ he: "מחלץ טביעת סגנון", en: "Stylome Extractor" }, language)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isHe
              ? "הדבק דגימות כתיבה → קבל פרופיל סגנוני + System Prompt לשכפול הקול שלך"
              : "Paste writing samples → get a style profile + System Prompt to clone your voice"}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "collect" as WizardStep, label: tx({ he: "איסוף דגימות", en: "Collect Samples" }, language) },
          { key: "analyze" as WizardStep, label: tx({ he: "ניתוח", en: "Analyze" }, language) },
          { key: "profile" as WizardStep, label: tx({ he: "פרופיל סגנוני", en: "Style Profile" }, language) },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <button
              onClick={() => {
                if (s.key === "collect") setStep("collect");
                else if (s.key === "profile" && profile) setStep("profile");
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s.label}
            </button>
          </div>
        ))}
      </div>

      {/* Step 1: Collect Samples */}
      {step === "collect" && (
        <div className="space-y-4">
          {/* Interview prompts */}
          <Card className="border-primary/10 bg-primary/5">
            <CardContent className="p-4">
              <div className="mb-2 text-sm font-medium text-foreground">
                {tx({ he: "שאלות מנחות (אופציונלי):", en: "Guiding questions (optional):" }, language)}
              </div>
              <div className="space-y-1.5">
                {INTERVIEW_QUESTIONS.slice(0, 3).map((q, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {i + 1}. {q[language]}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Input area */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Textarea
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder={isHe
                  ? "הדבק כאן דגימת כתיבה: הודעת וואטסאפ, פוסט, מייל, כל דבר שכתבת..."
                  : "Paste a writing sample: WhatsApp message, post, email, anything you wrote..."}
                className="min-h-[120px] text-sm"
                dir="auto"
              />
              <div className="flex items-center gap-3">
                <Select
                  value={currentContext}
                  onValueChange={(v) => setCurrentContext(v as StylomeSample["context"])}
                >
                  <SelectTrigger className="w-[200px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTEXT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {label[language]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addSample} size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  {tx({ he: "הוסף דגימה", en: "Add Sample" }, language)}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Samples list */}
          {samples.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {samples.length} {tx({ he: "דגימות", en: "samples" }, language)} · {totalWords} {tx({ he: "מילים", en: "words" }, language)}
                </span>
                <Badge variant={totalWords >= 200 ? "default" : "outline"} className="text-xs">
                  {totalWords >= 200
                    ? (tx({ he: "מספיק לניתוח מעמיק", en: "Enough for deep analysis" }, language))
                    : (tx({ he: `נדרשות עוד ${200 - totalWords} מילים`, en: `Need ${200 - totalWords} more words` }, language))}
                </Badge>
              </div>
              {samples.map((sample) => (
                <Card key={sample.id} className="group">
                  <CardContent className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {CONTEXT_LABELS[sample.context][language]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {sample.wordCount} {tx({ he: "מילים", en: "words" }, language)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2" dir="auto">
                        {sample.text}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSample(sample.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <Button
                onClick={runAnalysis}
                className="w-full gap-2 bg-primary text-primary-foreground border-0"
                disabled={samples.length < 1}
              >
                <Sparkles className="h-4 w-4" />
                {tx({ he: "נתח את הסגנון שלי", en: "Analyze My Style" }, language)}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Profile */}
      {step === "profile" && profile && (
        <div className="space-y-4">
          {/* Metrics Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {tx({ he: "מדדים כמותיים", en: "Quantitative Metrics" }, language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{profile.metrics.avgSentenceLength}</div>
                  <div className="text-xs text-muted-foreground">{tx({ he: "אורך משפט ממוצע", en: "Avg sentence length" }, language)}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{Math.round(profile.metrics.dugriScore * 100)}%</div>
                  <div className="text-xs text-muted-foreground">{tx({ he: "ציון דוגרי", en: "Dugri Score" }, language)}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{profile.metrics.codeMixingIndex}%</div>
                  <div className="text-xs text-muted-foreground">{tx({ he: "ערבוב שפות", en: "Code-Mixing" }, language)}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{profile.metrics.lexicalDiversity}</div>
                  <div className="text-xs text-muted-foreground">{tx({ he: "מגוון מילוני", en: "Lexical Diversity" }, language)}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{Math.round(profile.metrics.shortSentenceRatio * 100)}%</div>
                  <div className="text-xs text-muted-foreground">{tx({ he: "משפטים קצרים", en: "Short sentences" }, language)}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{Math.round(profile.metrics.longSentenceRatio * 100)}%</div>
                  <div className="text-xs text-muted-foreground">{tx({ he: "משפטים ארוכים", en: "Long sentences" }, language)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualitative Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {tx({ he: "פרופיל איכותני", en: "Qualitative Profile" }, language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{tx({ he: "רגיסטר", en: "Register" }, language)}</div>
                  <Badge>{REGISTER_LABELS[profile.style.register][language]}</Badge>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{tx({ he: "סגנון קוגניטיבי", en: "Cognitive Style" }, language)}</div>
                  <Badge>{COGNITIVE_LABELS[profile.style.cognitiveStyle][language]}</Badge>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{tx({ he: "עוצמה רגשית", en: "Emotional Intensity" }, language)}</div>
                  <Badge>{EMOTION_LABELS[profile.style.emotionalIntensity][language]}</Badge>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{tx({ he: "הומור", en: "Humor" }, language)}</div>
                  <Badge variant={profile.style.humor ? "default" : "outline"}>
                    {profile.style.humor ? (tx({ he: "כן", en: "Yes" }, language)) : (tx({ he: "לא", en: "No" }, language))}
                  </Badge>
                </div>
              </div>

              {profile.style.metaphorDomains.length > 0 && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{tx({ he: "עולמות מטאפוריים", en: "Metaphor Domains" }, language)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.style.metaphorDomains.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.patterns.pragmaticMarkers.length > 0 && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{tx({ he: "סמנים פרגמטיים", en: "Pragmatic Markers" }, language)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.patterns.pragmaticMarkers.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs">"{m}"</Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.patterns.topPhrases.length > 0 && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{tx({ he: "ביטויים שכיחים", en: "Top Phrases" }, language)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.patterns.topPhrases.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">"{p}"</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Prompt */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {tx({ he: "System Prompt לשכפול הקול שלך", en: "System Prompt to Clone Your Voice" }, language)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isHe
                  ? "העתק את הפרומפט הזה והדבק אותו ב-ChatGPT/Claude כדי שיכתוב בסגנון שלך"
                  : "Copy this prompt and paste it into ChatGPT/Claude to write in your style"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre
                  className="rounded-xl bg-muted/50 p-4 text-xs text-foreground whitespace-pre-wrap overflow-auto max-h-[300px] font-mono"
                  dir="auto"
                >
                  {profile.systemPrompt}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyPrompt}
                  className="absolute top-2 start-2 gap-1.5 text-xs"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? (tx({ he: "הועתק!", en: "Copied!" }, language)) : (tx({ he: "העתק", en: "Copy" }, language))}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>{profile.sampleCount} {tx({ he: "דגימות", en: "samples" }, language)}</span>
            <span>·</span>
            <span>{profile.sampleWordCount} {tx({ he: "מילים", en: "words" }, language)}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("collect")} className="flex-1">
              {tx({ he: "הוסף עוד דגימות", en: "Add More Samples" }, language)}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSamples([]);
                setProfile(null);
                setStep("collect");
              }}
              className="flex-1"
            >
              {tx({ he: "התחל מחדש", en: "Start Over" }, language)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StylomeExtractor;
