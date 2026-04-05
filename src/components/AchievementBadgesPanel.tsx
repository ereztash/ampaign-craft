import { useLanguage } from "@/i18n/LanguageContext";
import { useAchievements } from "@/hooks/useAchievements";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

interface AchievementBadgesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AchievementBadgesPanel = ({ open, onOpenChange }: AchievementBadgesPanelProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { achievements, unlockedCount, totalCount, streak, mastery } = useAchievements(language);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isHe ? "ההישגים שלך" : "Your Achievements"}
          </DialogTitle>
        </DialogHeader>

        {/* Streak + Mastery Summary */}
        <div className="flex items-center justify-center gap-6 text-sm mb-4">
          <div className="flex items-center gap-1.5 text-accent font-semibold">
            <Flame className="h-4 w-4" />
            {streak.currentStreak} {isHe ? "שבועות" : "weeks"}
          </div>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">
            {unlockedCount}/{totalCount} {isHe ? "הישגים" : "badges"}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">
            {mastery.percentage}% {isHe ? "שליטה" : "mastery"}
          </span>
        </div>

        {/* Mastery Bar */}
        <div className="mb-4">
          <div className="h-2 rounded-full bg-muted/30">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${mastery.percentage}%` }}
            />
          </div>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border p-3 text-center transition-all ${
                a.unlockedAt
                  ? "border-accent/30 bg-accent/5"
                  : "border-muted/30 bg-muted/10 opacity-50"
              }`}
            >
              <div className="text-2xl mb-1">{a.emoji}</div>
              <div className="text-xs font-semibold text-foreground">{a.name[language]}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{a.description[language]}</div>
              {a.unlockedAt && (
                <Badge variant="outline" className="mt-1.5 text-[9px]">
                  {new Date(a.unlockedAt).toLocaleDateString(isHe ? "he-IL" : "en-US")}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementBadgesPanel;
