// ═══════════════════════════════════════════════
// Leaderboard — Referral + Streak public scoreboard
// Mechanism Design: public commitment + competition.
// Ref5: "Top Referrers this month" leaderboard.
// Schelling Point: weekly reset = coordination signal.
// ═══════════════════════════════════════════════
import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/i18n/tx";
import { getReferralData } from "@/engine/referralEngine";
import BackToHub from "@/components/BackToHub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Flame, ArrowRight, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock leaderboard entries — in production would be queried from Supabase
const MOCK_ENTRIES = [
  { rank: 1, name: "אורי כ.", referrals: 23, streak: 47, badge: "👑" },
  { rank: 2, name: "מיה ד.", referrals: 18, streak: 31, badge: "🥈" },
  { rank: 3, name: "נועם ש.", referrals: 15, streak: 28, badge: "🥉" },
  { rank: 4, name: "שירה מ.", referrals: 12, streak: 22, badge: "🏅" },
  { rank: 5, name: "אלון ב.", referrals: 9,  streak: 19, badge: "🏅" },
  { rank: 6, name: "דנה ל.", referrals: 7,  streak: 14, badge: "" },
  { rank: 7, name: "יונתן ר.", referrals: 5, streak: 11, badge: "" },
  { rank: 8, name: "אסנת נ.", referrals: 4,  streak: 9,  badge: "" },
  { rank: 9, name: "עמית ג.", referrals: 3,  streak: 7,  badge: "" },
  { rank: 10, name: "רון א.", referrals: 2,  streak: 5,  badge: "" },
];

export default function Leaderboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHe = language === "he";

  const referralData = useMemo(() => user ? getReferralData(user.id) : null, [user]);
  const myReferralCount = referralData?.referrals.length ?? 0;

  // Find if user is in top 10
  const userEntry = useMemo(() => {
    if (!user) return null;
    if (myReferralCount >= 2) {
      return { rank: 10 - Math.min(myReferralCount, 9), referrals: myReferralCount };
    }
    return null;
  }, [user, myReferralCount]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-4 pb-16 max-w-2xl">
        <BackToHub currentPage={tx({ he: "לוח מובילים", en: "Leaderboard" }, language)} />

        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Crown className="h-10 w-10 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground" dir="auto">
              {tx({ he: "לוח מובילים — חודש אפריל", en: "Leaderboard — April" }, language)}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">
              {tx({ he: "מתאפס כל ראשון בחודש. השאר את חותמתך.", en: "Resets monthly. Leave your mark." }, language)}
            </p>
          </div>

          {/* My Stats Card */}
          {user && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground" dir="auto">
                      {tx({ he: "הפניות שלי החודש", en: "My referrals this month" }, language)}
                    </p>
                    <p className="text-xs text-muted-foreground" dir="auto">
                      {myReferralCount === 0
                        ? tx({ he: "עדיין לא הזמנת חברים", en: "You haven't invited friends yet" }, language)
                        : `${myReferralCount} ${tx({ he: "הפניות", en: "referrals" }, language)}`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => navigate("/dashboard")}
                >
                  {tx({ he: "הזמן חברים", en: "Invite friends" }, language)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-amber-500" />
                {tx({ he: "טופ 10 מפנים החודש", en: "Top 10 Referrers This Month" }, language)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {MOCK_ENTRIES.map((entry) => (
                  <div key={entry.rank} className={`flex items-center gap-3 px-4 py-3 ${entry.rank <= 3 ? "bg-amber-500/5" : ""}`}>
                    <div className={`w-7 text-center text-sm font-bold ${entry.rank === 1 ? "text-amber-500" : entry.rank === 2 ? "text-slate-400" : entry.rank === 3 ? "text-amber-700" : "text-muted-foreground"}`}>
                      {entry.badge || entry.rank}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground" dir="auto">{entry.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />{entry.referrals} {tx({ he: "הפניות", en: "refs" }, language)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />{entry.streak} {tx({ he: "ימים", en: "days" }, language)}
                        </span>
                      </div>
                    </div>
                    {entry.rank === 1 && (
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                        {isHe ? "מוביל" : "Leader"}
                      </Badge>
                    )}
                  </div>
                ))}
                {userEntry && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-t-2 border-primary/20">
                    <div className="w-7 text-center text-sm font-bold text-primary">
                      ~{userEntry.rank}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground" dir="auto">
                        {tx({ he: "אתה", en: "You" }, language)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {userEntry.referrals} {tx({ he: "הפניות", en: "refs" }, language)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{isHe ? "הדירוג שלך" : "Your rank"}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* How to earn */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground" dir="auto">
                {tx({ he: "איך עולים בדירוג?", en: "How to climb the ranks?" }, language)}
              </p>
              {[
                { he: "הזמן חברים עם הלינק שלך — כל הרשמה = +1 נקודה", en: "Invite friends with your link — each signup = +1 point" },
                { he: "שמור על סטריק יומי — +5 בונוס לשבוע מלא", en: "Maintain daily streak — +5 bonus for a full week" },
                { he: "הגב על תוכניות של אחרים בקהילה", en: "Engage with others' plans in the community" },
              ].map((item, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-2" dir="auto">
                  <span className="text-primary mt-0.5">•</span>
                  {item[language]}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
