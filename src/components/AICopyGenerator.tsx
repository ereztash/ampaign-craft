import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAICopy } from "@/hooks/useAICopy";
import type { FunnelResult } from "@/types/funnel";
import type { CopyTask } from "@/services/llmRouter";

interface AICopyGeneratorProps {
  funnelResult: FunnelResult;
  stylomePrompt?: string;
}

const TASK_OPTIONS: { value: CopyTask; label: { he: string; en: string } }[] = [
  { value: "ad-copy", label: { he: "מודעה ממומנת", en: "Paid Ad" } },
  { value: "email-sequence", label: { he: "רצף אימיילים", en: "Email Sequence" } },
  { value: "landing-page", label: { he: "עמוד נחיתה", en: "Landing Page" } },
  { value: "whatsapp-message", label: { he: "הודעת וואטסאפ", en: "WhatsApp Message" } },
  { value: "social-post", label: { he: "פוסט", en: "Social Post" } },
  { value: "headline", label: { he: "כותרות", en: "Headlines" } },
];

const VERDICT_CONFIG: Record<string, { color: string; label: { he: string; en: string } }> = {
  human: { color: "bg-green-500", label: { he: "אנושי", en: "Human" } },
  "likely-human": { color: "bg-green-400", label: { he: "סביר אנושי", en: "Likely Human" } },
  uncertain: { color: "bg-yellow-500", label: { he: "לא ברור", en: "Uncertain" } },
  "likely-ai": { color: "bg-orange-500", label: { he: "סביר AI", en: "Likely AI" } },
  ai: { color: "bg-red-500", label: { he: "AI", en: "AI" } },
};

export function AICopyGenerator({ funnelResult, stylomePrompt }: AICopyGeneratorProps) {
  const { language } = useLanguage();
  const { generate, isGenerating, result, error, reset } = useAICopy();
  const [selectedTask, setSelectedTask] = useState<CopyTask>("ad-copy");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleGenerate = () => {
    generate({
      task: selectedTask,
      prompt: customPrompt || (language === "he"
        ? `כתוב ${TASK_OPTIONS.find((t) => t.value === selectedTask)?.label.he || selectedTask} עבור ${funnelResult.formData.productDescription || "העסק שלי"}`
        : `Write ${TASK_OPTIONS.find((t) => t.value === selectedTask)?.label.en || selectedTask} for ${funnelResult.formData.productDescription || "my business"}`),
      funnelResult,
      formData: funnelResult.formData,
      stylomePrompt,
      language,
    });
  };

  const verdictConfig = result ? VERDICT_CONFIG[result.humanVerdict] || VERDICT_CONFIG.uncertain : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {language === "he" ? "מחולל קופי AI" : "AI Copy Generator"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Selection */}
        <div className="flex flex-wrap gap-2">
          {TASK_OPTIONS.map((task) => (
            <Button
              key={task.value}
              variant={selectedTask === task.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTask(task.value)}
            >
              {task.label[language]}
            </Button>
          ))}
        </div>

        {/* Custom Prompt */}
        <Textarea
          dir="auto"
          placeholder={language === "he" ? "הוסף הנחיות ספציפיות (אופציונלי)..." : "Add specific instructions (optional)..."}
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={2}
        />

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating
            ? (language === "he" ? "מייצר..." : "Generating...")
            : (language === "he" ? "צור קופי" : "Generate Copy")}
        </Button>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive p-2 rounded-md bg-destructive/10">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            {/* P&B Badge */}
            <div className="flex items-center gap-2">
              <Badge className={`${verdictConfig?.color || ""} text-white`}>
                {verdictConfig?.label[language] || result.humanVerdict}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {language === "he" ? `ציון אנושיות: ${result.humanScore}/100` : `Humanness: ${result.humanScore}/100`}
              </span>
              <span className="text-xs text-muted-foreground">
                ({result.modelSelection.tier})
              </span>
            </div>

            {/* Generated Text */}
            <div className="rounded-md border p-4 bg-muted/30 whitespace-pre-wrap text-sm" dir="auto">
              {result.text}
            </div>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="rounded-md border p-3 bg-yellow-50">
                <p className="text-sm font-medium mb-1">
                  {language === "he" ? "הצעות לשיפור:" : "Suggestions:"}
                </p>
                <ul className="text-xs space-y-1">
                  {result.suggestions.map((s, i) => (
                    <li key={i} dir="auto">{"• "}{s[language]}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={reset}>
              {language === "he" ? "נקה ונסה שוב" : "Clear & retry"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
