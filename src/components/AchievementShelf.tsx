import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { useAchievements } from "@/hooks/useAchievements";
import { Card, CardContent } from "@/components/ui/card";

export function AchievementShelf() {
  const { language } = useLanguage();
  const { achievements, unlockedCount, totalCount } = useAchievements(language);

  if (unlockedCount === 0) return null;

  return (
    <Card className="border-muted/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {tx({ he: "הישגים", en: "Achievements" }, language)}
          </h3>
          <span className="text-xs text-muted-foreground">
            {unlockedCount}/{totalCount}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              title={a.unlockedAt ? `${a.name[language]} — ${a.description[language]}` : undefined}
              className={`flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-opacity ${
                a.unlockedAt
                  ? "opacity-100 bg-primary/8"
                  : "opacity-25 grayscale"
              }`}
            >
              <span className="text-xl leading-none">{a.emoji}</span>
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2" dir="auto">
                {a.name[language]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
