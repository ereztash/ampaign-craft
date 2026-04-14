import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import type { UVPVariant } from "@/engine/uvpSynthesisEngine";

interface UVPFormatCardProps {
  variant: UVPVariant;
}

const TONE_COLORS = {
  roi: "bg-blue-50 border-blue-200 text-blue-700",
  social: "bg-green-50 border-green-200 text-green-700",
  stability: "bg-amber-50 border-amber-200 text-amber-700",
  precision: "bg-purple-50 border-purple-200 text-purple-700",
} as const;

const TONE_LABELS = {
  roi: { he: "ROI", en: "ROI" },
  social: { he: "חברתי", en: "Social" },
  stability: { he: "יציבות", en: "Stability" },
  precision: { he: "דיוק", en: "Precision" },
} as const;

const STRENGTH_COLOR = (score: number) => {
  if (score >= 70) return "text-green-600";
  if (score >= 45) return "text-amber-600";
  return "text-red-500";
};

export function UVPFormatCard({ variant }: UVPFormatCardProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(variant.text[language]);
    setCopied(true);
    toast.success(isHe ? "הועתק!" : "Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const charCount = variant.charCount[language];
  const toneClass = TONE_COLORS[variant.discTone];
  const toneLabel = TONE_LABELS[variant.discTone][language];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-semibold">
            {variant.label[language]}
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {variant.channelFit.map((ch) => (
              <Badge key={ch} variant="outline" className="text-xs py-0">
                {ch}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold ${STRENGTH_COLOR(variant.strengthScore)}`}>
            {variant.strengthScore}/100
          </span>
          <Badge className={`text-xs border ${toneClass}`} variant="outline">
            {toneLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Text output */}
        <div className="relative rounded-lg bg-muted/40 p-3 pe-10">
          <p className="text-sm leading-relaxed" dir="auto">
            {variant.text[language]}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyText}
            className="absolute top-2 right-2 h-7 w-7 p-0 min-h-0"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Char count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {charCount} {isHe ? "תווים" : "chars"}
          </span>
          {variant.format === "linkedInBio" && (
            <span className={charCount > 150 ? "text-amber-500" : "text-green-500"}>
              {charCount}/160
            </span>
          )}
          {variant.format === "adHeadline" && (
            <span className={charCount > 80 ? "text-amber-500" : "text-green-500"}>
              {charCount}/90
            </span>
          )}
          {variant.format === "emailSubject" && (
            <span className={charCount > 70 ? "text-amber-500" : "text-green-500"}>
              {charCount}/78
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default UVPFormatCard;
