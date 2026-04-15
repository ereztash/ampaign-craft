// ═══════════════════════════════════════════════
// Referral Dashboard — Phase 5 AARRR
//
// Surfaces the referral engine to users:
//   - Unique referral link
//   - Stats (invited, converted, K-factor)
//   - Reward tiers and progress
//   - WhatsApp/Email share CTA
// ═══════════════════════════════════════════════

import { useMemo, useState } from "react";
import { Copy, Share2, Gift, Users, TrendingUp, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  getReferralData,
  getReferralStats,
  getReferralLink,
  REFERRAL_REWARDS,
} from "@/engine/referralEngine";
import { trackShareCreated } from "@/services/eventQueue";

// ─── Reward tiers config ─────────────────────────

interface RewardTier {
  conversions: number;
  labelHe: string;
  labelEn: string;
  rewardHe: string;
  rewardEn: string;
  color: string;
}

const REWARD_TIERS: RewardTier[] = [
  {
    conversions: 1,
    labelHe: "הזמן ראשון",
    labelEn: "First Invite",
    rewardHe: "14 ימי Pro חינם לחבר שלך",
    rewardEn: "14 days Pro free for your friend",
    color: "#10b981",
  },
  {
    conversions: 3,
    labelHe: "מגייס פעיל",
    labelEn: "Active Recruiter",
    rewardHe: "30 ימי Pro חינם בשבילך",
    rewardEn: "30 days Pro free for you",
    color: "#3b82f6",
  },
  {
    conversions: 5,
    labelHe: "שגריר",
    labelEn: "Ambassador",
    rewardHe: "3 חודשי Pro חינם",
    rewardEn: "3 months Pro free",
    color: "#f59e0b",
  },
  {
    conversions: 10,
    labelHe: "MVP",
    labelEn: "MVP",
    rewardHe: "20% הנחה לכל החיים",
    rewardEn: "20% lifetime discount",
    color: "#8b5cf6",
  },
];

// ─── Component ───────────────────────────────────

export default function ReferralDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isHe = language === "he";
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    if (!user) return null;
    return getReferralStats(user.id);
  }, [user]);

  const referralLink = useMemo(() => {
    if (!user) return "";
    return getReferralLink(user.id);
  }, [user]);

  const kFactor = useMemo(() => {
    if (!stats || stats.totalReferred === 0) return 0;
    return (stats.totalConverted / stats.totalReferred).toFixed(2);
  }, [stats]);

  const nextTier = useMemo(() => {
    if (!stats) return REWARD_TIERS[0];
    return REWARD_TIERS.find((t) => t.conversions > stats.totalConverted) ?? REWARD_TIERS[REWARD_TIERS.length - 1];
  }, [stats]);

  const progressToNext = useMemo(() => {
    if (!stats || !nextTier) return 0;
    const prevConversions = REWARD_TIERS[REWARD_TIERS.findIndex((t) => t.conversions === nextTier.conversions) - 1]?.conversions ?? 0;
    const range = nextTier.conversions - prevConversions;
    const done = stats.totalConverted - prevConversions;
    return Math.round(Math.max(0, Math.min(100, (done / range) * 100)));
  }, [stats, nextTier]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (user) {
        const data = getReferralData(user.id);
        trackShareCreated(user.id, data.code).catch(() => {});
      }
      toast({
        title: isHe ? "הקישור הועתק!" : "Link copied!",
        description: isHe ? "שתף עם חברים ועמיתים" : "Share with friends and colleagues",
      });
    } catch {
      toast({ title: isHe ? "שגיאה בהעתקה" : "Copy failed", variant: "destructive" });
    }
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      isHe
        ? `היי! אני משתמש ב-FunnelForge לבניית אסטרטגיה שיווקית לעסק שלי, וממליץ לך לנסות 🚀\n${referralLink}`
        : `Hey! I use FunnelForge to build my marketing strategy. You should try it 🚀\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
    if (user) {
      const data = getReferralData(user.id);
      trackShareCreated(user.id, data.code).catch(() => {});
    }
  }

  if (!user || !stats) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="py-8 text-center text-zinc-400">
          {isHe ? "יש להתחבר כדי לצפות בנתוני הפניות" : "Sign in to view referral data"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir={isHe ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-purple-500/20">
          <Share2 className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{isHe ? "תוכנית ההפניות" : "Referral Program"}</h2>
          <p className="text-sm text-zinc-400">
            {isHe ? "הזמן חברים וקבל חודשי Pro חינם" : "Invite friends, earn free Pro months"}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Users,
            label: isHe ? "הוזמנו" : "Invited",
            value: stats.totalReferred,
            color: "#3b82f6",
          },
          {
            icon: CheckCircle2,
            label: isHe ? "הצטרפו" : "Converted",
            value: stats.totalConverted,
            color: "#10b981",
          },
          {
            icon: TrendingUp,
            label: "K-Factor",
            value: kFactor,
            color: "#8b5cf6",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-white/10 bg-white/5">
            <CardContent className="p-4 text-center">
              <Icon className="h-5 w-5 mx-auto mb-1" style={{ color }} />
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral link */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-300">
            {isHe ? "הקישור האישי שלך" : "Your personal link"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2">
            <span className="text-xs text-zinc-300 font-mono truncate flex-1">{referralLink}</span>
            <button
              onClick={copyLink}
              className="text-zinc-400 hover:text-white transition shrink-0"
              aria-label={isHe ? "העתק קישור" : "Copy link"}
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={copyLink} variant="outline" size="sm" className="flex-1 gap-1.5 border-white/10">
              <Copy className="h-3.5 w-3.5" />
              {isHe ? "העתק" : "Copy"}
            </Button>
            <Button onClick={shareWhatsApp} size="sm" className="flex-1 gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white border-0">
              <Share2 className="h-3.5 w-3.5" />
              {isHe ? "שלח ב-WhatsApp" : "Share WhatsApp"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Next reward progress */}
      {nextTier && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-4 w-4" style={{ color: nextTier.color }} />
              <span className="text-sm font-semibold" style={{ color: nextTier.color }}>
                {isHe ? nextTier.labelHe : nextTier.labelEn}
              </span>
              <Badge variant="outline" className="ml-auto text-xs border-white/10">
                {stats.totalConverted}/{nextTier.conversions}
              </Badge>
            </div>
            <Progress value={progressToNext} className="h-1.5 mb-2" />
            <p className="text-xs text-zinc-400">
              {isHe ? nextTier.rewardHe : nextTier.rewardEn}
            </p>
          </CardContent>
        </Card>
      )}

      {/* All reward tiers */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-300">
            {isHe ? "כל שלבי הפרס" : "All reward tiers"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {REWARD_TIERS.map((tier) => {
            const achieved = stats.totalConverted >= tier.conversions;
            return (
              <div
                key={tier.conversions}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${achieved ? "bg-white/8" : "opacity-50"}`}
              >
                {achieved ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: tier.color }} />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border border-zinc-600" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {tier.conversions} {isHe ? "הצטרפויות" : "conversions"} → {isHe ? tier.rewardHe : tier.rewardEn}
                  </p>
                </div>
                {achieved && (
                  <Badge className="shrink-0 text-xs" style={{ background: tier.color + "33", color: tier.color, border: "none" }}>
                    {isHe ? "הושג" : "Done"}
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Referrer bonus note */}
      <p className="text-xs text-zinc-600 text-center px-4">
        {isHe
          ? `🎁 חבר שמצטרף דרך הקישור שלך מקבל ${REFERRAL_REWARDS.referee.durationDays} ימי Pro חינם. אתה מרוויח על כל הצטרפות מוצלחת.`
          : `🎁 Friends who join via your link get ${REFERRAL_REWARDS.referee.durationDays} days Pro free. You earn on every successful join.`}
      </p>
    </div>
  );
}
