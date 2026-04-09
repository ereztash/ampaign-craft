import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { DISCProfile } from "@/engine/discProfileEngine";

interface DISCProfileCardProps {
  profile: DISCProfile;
}

const TYPE_CONFIG = {
  D: { color: "bg-red-500", label: { he: "דומיננטי", en: "Dominant" }, emoji: "🎯" },
  I: { color: "bg-yellow-500", label: { he: "משפיע", en: "Influential" }, emoji: "🌟" },
  S: { color: "bg-green-500", label: { he: "יציב", en: "Steady" }, emoji: "🤝" },
  C: { color: "bg-blue-500", label: { he: "מדויק", en: "Conscientious" }, emoji: "📊" },
} as const;

const DISC_KEYS: ("D" | "I" | "S" | "C")[] = ["D", "I", "S", "C"];

export function DISCProfileCard({ profile }: DISCProfileCardProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const primaryConfig = TYPE_CONFIG[profile.primary];
  const secondaryConfig = TYPE_CONFIG[profile.secondary];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {primaryConfig.emoji} {isHe ? "פרופיל DISC" : "DISC Profile"}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge className={`${primaryConfig.color} text-white`}>
              {primaryConfig.label[language]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {secondaryConfig.label[language]}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground" dir="auto">
          {profile.communicationTone[language]}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Distribution Bars */}
        <div className="space-y-2.5">
          {DISC_KEYS.map((key) => {
            const config = TYPE_CONFIG[key];
            const value = profile.distribution[key];
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    {config.emoji} {config.label[language]} ({key})
                  </span>
                  <span className="text-muted-foreground">{Math.round(value)}%</span>
                </div>
                <Progress value={value} className="h-2" />
              </div>
            );
          })}
        </div>

        {/* Messaging Strategy */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1.5" dir="auto">
              {isHe ? "מה להדגיש:" : "Emphasize:"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.messagingStrategy.emphasize.map((item, i) => (
                <Badge key={i} variant="outline" className="border-green-500/30 bg-green-500/10 text-xs" dir="auto">
                  {item[language]}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1.5" dir="auto">
              {isHe ? "מה להימנע:" : "Avoid:"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.messagingStrategy.avoid.map((item, i) => (
                <Badge key={i} variant="outline" className="border-red-500/30 bg-red-500/10 text-xs" dir="auto">
                  {item[language]}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Style + Funnel Emphasis */}
        <div className="rounded-md border p-3 bg-primary/5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium" dir="auto">
              {isHe ? "סגנון CTA:" : "CTA Style:"}
            </p>
            <Badge variant="outline" className="text-xs">
              {isHe ? "דגש משפך:" : "Funnel focus:"} {profile.funnelEmphasis}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground" dir="auto">
            {profile.ctaStyle[language]}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
