// ═══════════════════════════════════════════════
// Output Feedback Widget
// Droppable into any engine output card — captures
// positive/negative ratings + optional freeform text,
// feeding the training-data flywheel.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { updateFeedback, type FeedbackRating } from "@/engine/trainingDataEngine";

interface OutputFeedbackProps {
  pairId: string | null;
  compact?: boolean;
  onFeedbackSubmitted?: (rating: FeedbackRating) => void;
}

export function OutputFeedback({ pairId, compact = false, onFeedbackSubmitted }: OutputFeedbackProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState<FeedbackRating | null>(null);
  const [showNegativeForm, setShowNegativeForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [saving, setSaving] = useState(false);

  const t = (he: string, en: string) => (language === "he" ? he : en);

  async function submit(rating: FeedbackRating, text?: string) {
    if (!pairId) {
      // Pair was never persisted (no auth / offline buffer). Still give UX feedback.
      setSubmitted(rating);
      onFeedbackSubmitted?.(rating);
      return;
    }
    setSaving(true);
    const ok = await updateFeedback(pairId, rating, text);
    setSaving(false);
    if (ok) {
      setSubmitted(rating);
      toast({
        title: t("תודה על המשוב!", "Thanks for the feedback!"),
        description: t("המשוב שלך עוזר לנו לשפר את המנועים", "Your feedback helps us tune our engines"),
      });
      onFeedbackSubmitted?.(rating);
    } else {
      toast({
        title: t("שגיאה בשמירה", "Save error"),
        description: t("לא הצלחנו לשמור את המשוב", "Could not save your feedback"),
        variant: "destructive",
      });
    }
  }

  if (submitted) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${compact ? "" : "mt-2"}`}>
        <Check className="h-3.5 w-3.5 text-green-600" />
        <span>{t("תודה על המשוב!", "Thanks for the feedback!")}</span>
      </div>
    );
  }

  if (showNegativeForm) {
    return (
      <div className={`space-y-2 ${compact ? "" : "mt-2"}`}>
        <Textarea
          placeholder={t("מה היה חסר? (אופציונלי)", "What was missing? (optional)")}
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          className="min-h-[60px] text-sm"
          disabled={saving}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => submit("negative", feedbackText)}
            disabled={saving}
          >
            {t("שלח משוב", "Submit")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowNegativeForm(false);
              setFeedbackText("");
            }}
            disabled={saving}
          >
            {t("ביטול", "Cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mt-2"}`}>
      <span className="text-xs text-muted-foreground">
        {t("שימושי?", "Helpful?")}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 min-h-[44px] min-w-[44px]"
        onClick={() => submit("positive")}
        disabled={saving}
        aria-label={t("משוב חיובי", "Positive feedback")}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 min-h-[44px] min-w-[44px]"
        onClick={() => setShowNegativeForm(true)}
        disabled={saving}
        aria-label={t("משוב שלילי", "Negative feedback")}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default OutputFeedback;
