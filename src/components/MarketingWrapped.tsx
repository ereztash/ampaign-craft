import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAchievements } from "@/hooks/useAchievements";
import { SavedPlan } from "@/types/funnel";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, TrendingUp, Award, Fingerprint, Target } from "lucide-react";
import { toast } from "sonner";

interface MarketingWrappedProps {
  plans: SavedPlan[];
}

const MarketingWrapped = ({ plans }: MarketingWrappedProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { unlockedCount, totalCount, streak } = useAchievements(language);
  const [copied, setCopied] = useState(false);

  if (plans.length === 0) return null;

  // Calculate stats
  const latestPlan = plans[0];
  const healthScore = calculateHealthScore(latestPlan.result);

  // Most used industry
  const industryCounts = new Map<string, number>();
  plans.forEach((p) => {
    const field = p.result.formData.businessField || "other";
    industryCounts.set(field, (industryCounts.get(field) || 0) + 1);
  });
  const topIndustry = [...industryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "other";

  // Most used hooks
  const hookCounts = new Map<string, number>();
  plans.forEach((p) => {
    p.result.hookTips.forEach((h) => {
      hookCounts.set(h.lawName[language], (hookCounts.get(h.lawName[language]) || 0) + 1);
    });
  });
  const topHook = [...hookCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  // Total channels recommended
  const allChannels = new Set<string>();
  plans.forEach((p) => {
    p.result.stages.forEach((s) => {
      s.channels.forEach((c) => allChannels.add(c.channel));
    });
  });

  const wrappedText = isHe
    ? `🎯 Marketing Wrapped שלי ב-FunnelForge

📊 ${plans.length} משפכים שיווקיים
💯 ציון בריאות: ${healthScore.total}/100
🔥 Streak: ${streak.currentStreak} שבועות
🏆 ${unlockedCount}/${totalCount} הישגים
📢 ${allChannels.size} ערוצים שונים
🧠 ההוק המוביל: ${topHook}

#FunnelForge #MarketingWrapped`
    : `🎯 My FunnelForge Marketing Wrapped

📊 ${plans.length} marketing funnels
💯 Health Score: ${healthScore.total}/100
🔥 Streak: ${streak.currentStreak} weeks
🏆 ${unlockedCount}/${totalCount} achievements
📢 ${allChannels.size} channels
🧠 Top hook: ${topHook}

#FunnelForge #MarketingWrapped`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Marketing Wrapped", text: wrappedText });
    } else {
      handleCopy();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(wrappedText);
    setCopied(true);
    toast.success(isHe ? "הועתק!" : "Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-accent" />
          {isHe ? "Marketing Wrapped שלך" : "Your Marketing Wrapped"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-center">
            <Target className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold text-foreground">{plans.length}</div>
            <div className="text-[10px] text-muted-foreground">{isHe ? "משפכים" : "Funnels"}</div>
          </div>
          <div className="rounded-xl bg-accent/10 p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-accent mb-1" />
            <div className="text-2xl font-bold text-foreground">{healthScore.total}</div>
            <div className="text-[10px] text-muted-foreground">{isHe ? "ציון בריאות" : "Health Score"}</div>
          </div>
          <div className="rounded-xl bg-destructive/10 p-3 text-center">
            <div className="text-xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-foreground">{streak.currentStreak}</div>
            <div className="text-[10px] text-muted-foreground">{isHe ? "שבועות streak" : "Week streak"}</div>
          </div>
          <div className="rounded-xl bg-primary/10 p-3 text-center">
            <Fingerprint className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold text-foreground">{unlockedCount}/{totalCount}</div>
            <div className="text-[10px] text-muted-foreground">{isHe ? "הישגים" : "Achievements"}</div>
          </div>
        </div>

        {topHook && (
          <div className="mt-3 rounded-lg bg-muted/50 p-2 text-center">
            <span className="text-xs text-muted-foreground">{isHe ? "ההוק ההתנהגותי המוביל שלך:" : "Your top behavioral hook:"}</span>
            <div className="text-sm font-semibold text-foreground">{topHook}</div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={handleShare} className="flex-1 gap-1.5 funnel-gradient border-0 text-accent-foreground">
            <Share2 className="h-3.5 w-3.5" />
            {isHe ? "שתף" : "Share"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? (isHe ? "הועתק" : "Copied") : (isHe ? "העתק" : "Copy")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketingWrapped;
