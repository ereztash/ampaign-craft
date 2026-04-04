import { useState, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { analyzeSamples, StylomeProfile, StylomeSample, INTERVIEW_QUESTIONS } from "@/engine/stylomeEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      toast.error(isHe ? "נדרשות לפחות 10 מילים לדגימה" : "At least 10 words required per sample");
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
    toast.success(isHe ? "דגימה נוספה!" : "Sample added!");
  }, [currentText, currentContext, isHe]);

  const removeSample = (id: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const runAnalysis = () => {
    if (samples.length < 1) {
      toast.error(isHe ? "נדרשת לפחות דגימה אחת" : "At least 1 sample required");
      return;
    }
    const result = analyzeSamples(samples);
    setProfile(result);
    setStep("profile");
  };

  const copyPrompt = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.systemPrompt);
    setCopied(true);
    toast.success(isHe ? "הפרומפט הועתק!" : "Prompt copied!");
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
            {isHe ? "מחלץ טביעת סגנון" : "Stylome Extractor"}
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
          { key: "collect" as WizardStep, label: isHe ? "איסוף דגימות" : "Collect Samples" },
          { key: "analyze" as WizardStep, label: isHe ? "ניתוח" : "Analyze" },
          { key: "profile" as WizardStep, label: isHe ? "פרופיל סגנוני" : "Style Profile" },
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
                {isHe ? "שאלות מנחות (אופציונלי):" : "Guiding questions (optional):"}
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
                  ? "הדבק כאן דגימת כתיבה — הודעת וואטסאפ, פוסט, מייל, כל דבר שכתבת..."
                  : "Paste a writing sample — WhatsApp message, post, email, anything you wrote..."}
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
                  {isHe ? "הוסף דגימה" : "Add Sample"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Samples list */}
          {samples.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {samples.length} {isHe ? "דגימות" : "samples"} · {totalWords} {isHe ? "מילים" : "words"}
                </span>
                <Badge variant={totalWords >= 200 ? "default" : "outline"} className="text-xs">
                  {totalWords >= 200
                    ? (isHe ? "מספיק לניתוח מעמיק" : "Enough for deep analysis")
                    : (isHe ? `נדרשות עוד ${200 - totalWords} מילים` : `Need ${200 - totalWords} more words`)}
                </Badge>
              </div>
              {samples.map((sample) => (
                <Card key={sample.id} className="group">
                  <CardContent className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {CONTEXT_LABELS[sample.context][language]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {sample.wordCount} {isHe ? "מילים" : "words"}
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
                className="w-full gap-2 funnel-gradient border-0 text-accent-foreground"
                disabled={samples.length < 1}
              >
                <Sparkles className="h-4 w-4" />
                {isHe ? "נתח את הסגנון שלי" : "Analyze My Style"}
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
                {isHe ? "מדדים כמותיים" : "Quantitative Metrics"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{profile.metrics.avgSentenceLength}</div>
                  <div className="text-[10px] text-muted-foreground">{isHe ? "אורך משפט ממוצע" : "Avg sentence length"}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{Math.round(profile.metrics.dugriScore * 100)}%</div>
                  <div className="text-[10px] text-muted-foreground">{isHe ? "ציון דוגרי" : "Dugri Score"}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{profile.metrics.codeMixingIndex}%</div>
                  <div className="text-[10px] text-muted-foreground">{isHe ? "ערבוב שפות" : "Code-Mixing"}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{profile.metrics.lexicalDiversity}</div>
                  <div className="text-[10px] text-muted-foreground">{isHe ? "מגוון מילוני" : "Lexical Diversity"}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{Math.round(profile.metrics.shortSentenceRatio * 100)}%</div>
                  <div className="text-[10px] text-muted-foreground">{isHe ? "משפטים קצרים" : "Short sentences"}</div>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <div className="text-lg font-bold text-primary">{Math.round(profile.metrics.longSentenceRatio * 100)}%</div>
                  <div className="text-[10px] text-muted-foreground">{isHe ? "משפטים ארוכים" : "Long sentences"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualitative Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isHe ? "פרופיל איכותני" : "Qualitative Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{isHe ? "רגיסטר" : "Register"}</div>
                  <Badge>{REGISTER_LABELS[profile.style.register][language]}</Badge>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{isHe ? "סגנון קוגניטיבי" : "Cognitive Style"}</div>
                  <Badge>{COGNITIVE_LABELS[profile.style.cognitiveStyle][language]}</Badge>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{isHe ? "עוצמה רגשית" : "Emotional Intensity"}</div>
                  <Badge>{EMOTION_LABELS[profile.style.emotionalIntensity][language]}</Badge>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{isHe ? "הומור" : "Humor"}</div>
                  <Badge variant={profile.style.humor ? "default" : "outline"}>
                    {profile.style.humor ? (isHe ? "כן" : "Yes") : (isHe ? "לא" : "No")}
                  </Badge>
                </div>
              </div>

              {profile.style.metaphorDomains.length > 0 && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{isHe ? "עולמות מטאפוריים" : "Metaphor Domains"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.style.metaphorDomains.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.patterns.pragmaticMarkers.length > 0 && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{isHe ? "סמנים פרגמטיים" : "Pragmatic Markers"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.patterns.pragmaticMarkers.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs">"{m}"</Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.patterns.topPhrases.length > 0 && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{isHe ? "ביטויים שכיחים" : "Top Phrases"}</div>
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
                {isHe ? "System Prompt לשכפול הקול שלך" : "System Prompt to Clone Your Voice"}
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
                  className="absolute top-2 left-2 gap-1.5 text-xs"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? (isHe ? "הועתק!" : "Copied!") : (isHe ? "העתק" : "Copy")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>{profile.sampleCount} {isHe ? "דגימות" : "samples"}</span>
            <span>·</span>
            <span>{profile.sampleWordCount} {isHe ? "מילים" : "words"}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("collect")} className="flex-1">
              {isHe ? "הוסף עוד דגימות" : "Add More Samples"}
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
              {isHe ? "התחל מחדש" : "Start Over"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StylomeExtractor;
