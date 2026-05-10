import { useMemo, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import {
  analyzeIsraeliPricing,
  SEGMENT_PROFILES,
  type CulturalSegment,
  type IsraeliPricingAnalysis,
} from "@/viewmodels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Receipt, AlertTriangle, Handshake, Coins, ChevronDown, Sparkles } from "lucide-react";

interface Props {
  basePrice: number;
  isB2B: boolean;
  position: "premium" | "value" | "parity";
}

const SEGMENT_LABELS: Record<CulturalSegment, { he: string; en: string }> = {
  mainstream: { he: "חילוני / מסורתי", en: "Mainstream" },
  chareidi: { he: "חרדי", en: "Chareidi" },
  dati_leumi: { he: "דתי-לאומי", en: "Dati Leumi" },
  arab: { he: "ערבי", en: "Arab" },
  russian: { he: "עולים מבריה\"מ", en: "Russian-speaking" },
  tech_b2b: { he: "היי-טק / B2B", en: "Tech / B2B" },
};

const TimingBadge = ({ window, language, isHe }: { window: IsraeliPricingAnalysis["calendarTiming"]["window"]; language: "he" | "en"; isHe: boolean }) => {
  const variants: Record<typeof window, { variant: "default" | "secondary" | "destructive"; label: { he: string; en: string } }> = {
    ideal: { variant: "default", label: { he: "חלון מיטבי", en: "Ideal window" } },
    acceptable: { variant: "secondary", label: { he: "חלון תקין", en: "Acceptable" } },
    avoid: { variant: "destructive", label: { he: "להמתין", en: "Avoid now" } },
  };
  const v = variants[window];
  return <Badge variant={v.variant}>{v.label[language]}</Badge>;
};

const IsraeliPricingPsychologyCard = ({ basePrice, isB2B, position }: Props) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [segment, setSegment] = useState<CulturalSegment>("mainstream");

  const analysis = useMemo(
    () => analyzeIsraeliPricing({ basePrice, segment, isB2B, position }),
    [basePrice, segment, isB2B, position],
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {tx({ he: "פסיכולוגיית תמחור ישראלית", en: "Israeli Pricing Psychology" }, language)}
          <Badge variant="outline" className="text-xs">
            {tx({ he: "ייחודי לעברית", en: "Hebrew-native" }, language)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">
            {tx({ he: "פלח קהל:", en: "Audience segment:" }, language)}
          </span>
          <Select value={segment} onValueChange={(v) => setSegment(v as CulturalSegment)}>
            <SelectTrigger className="h-8 text-sm w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEGMENT_PROFILES.map((p) => (
                <SelectItem key={p.segment} value={p.segment}>
                  {SEGMENT_LABELS[p.segment][language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              {tx({ he: "מחיר ממוסגר", en: "Framed Price" }, language)}
            </span>
            <Badge>{analysis.framedPrice.framing.replace(/_/g, " ")}</Badge>
          </div>
          <div className="text-2xl font-bold">{analysis.vatFraming.display[language]}</div>
          <p className="text-xs text-muted-foreground" dir="auto">{analysis.framedPrice.why[language]}</p>
        </div>

        {analysis.tashlumim.length > 0 && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">
                {tx({ he: "פיצול תשלומים מומלץ", en: "Tashlumim split" }, language)}
              </span>
            </div>
            <div className="space-y-1.5">
              {analysis.tashlumim.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span dir="auto">{t.framing[language]}</span>
                  {t.acceptanceLift > 0 && (
                    <Badge variant="outline" className="text-xs">
                      +{Math.round(t.acceptanceLift * 100)}% {tx({ he: "קבלה", en: "acceptance" }, language)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Handshake className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">
                {tx({ he: "אנקור עם buffer מו\"מ", en: "Negotiation-buffer anchor" }, language)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">+{analysis.anchored.bufferPct}%</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-muted/30 p-2">
              <div className="text-muted-foreground">{tx({ he: "מחיר מפורסם", en: "Published" }, language)}</div>
              <div className="font-bold">₪{analysis.anchored.publishedAnchor.toLocaleString(isHe ? "he-IL" : "en-US")}</div>
            </div>
            <div className="rounded bg-primary/5 p-2">
              <div className="text-muted-foreground">{tx({ he: "יעד אמיתי", en: "Real target" }, language)}</div>
              <div className="font-bold">₪{analysis.anchored.realTarget.toLocaleString(isHe ? "he-IL" : "en-US")}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2" dir="auto">{analysis.anchored.scriptForFirstObjection[language]}</p>
        </div>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {tx({ he: "תזמון לוח עברי", en: "Hebrew-calendar timing" }, language)}
                </span>
                <TimingBadge window={analysis.calendarTiming.window} language={language} isHe={isHe} />
              </div>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
              <p dir="auto">{analysis.calendarTiming.reason[language]}</p>
              <p className="text-muted-foreground" dir="auto">
                {tx({ he: "שעות מועדפות:", en: "Preferred hours:" }, language)} {analysis.calendarTiming.preferredHours}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {analysis.trustAnchors.length > 0 && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">
                {tx({ he: "עוגני אמון לפלח זה", en: "Segment-specific trust anchors" }, language)}
              </span>
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {analysis.trustAnchors.map((a, i) => (
                <li key={i} dir="auto">• {a[language]}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.risks.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-medium">
                {tx({ he: "סיכוני תמחור", en: "Pricing risks" }, language)}
              </span>
            </div>
            <ul className="text-xs space-y-2">
              {analysis.risks.map((r, i) => (
                <li key={i} className="space-y-0.5">
                  <div className="flex items-start gap-2">
                    <Badge variant={r.severity === "high" ? "destructive" : "outline"} className="text-xs shrink-0">
                      {r.severity}
                    </Badge>
                    <span dir="auto">{r.flag[language]}</span>
                  </div>
                  <p className="text-muted-foreground ms-12" dir="auto">→ {r.fix[language]}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IsraeliPricingPsychologyCard;
