import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShoppingCart, Cpu, GraduationCap, Briefcase, Rss, MapPin } from "lucide-react";

interface UseCase {
  id: string;
  icon: React.ReactNode;
  industry: { he: string; en: string };
  title: { he: string; en: string };
  challenge: { he: string; en: string };
  result: { he: string; en: string };
  tags: { he: string; en: string }[];
  route: string;
}

const USE_CASES: UseCase[] = [
  {
    id: "ecommerce",
    icon: <ShoppingCart className="h-6 w-6" />,
    industry: { he: "מסחר אלקטרוני", en: "E-commerce" },
    title: { he: "הגדלת יחס המרה בחנות Shopify", en: "Boosting Shopify Conversion Rate" },
    challenge: { he: "גולשים נכנסים אך לא קונים — יחס המרה של 0.8% בלבד", en: "High traffic, low conversion — stuck at 0.8% CVR" },
    result: { he: "אסטרטגיית ריטרגטינג + הצעה עם urgency העלתה CVR ל-2.1% תוך 30 יום", en: "Retargeting strategy + urgency offer raised CVR to 2.1% in 30 days" },
    tags: [{ he: "ריטרגטינג", en: "Retargeting" }, { he: "המרה", en: "Conversion" }, { he: "Meta Ads", en: "Meta Ads" }],
    route: "/wizard",
  },
  {
    id: "saas",
    icon: <Cpu className="h-6 w-6" />,
    industry: { he: "SaaS", en: "SaaS" },
    title: { he: "הפחתת Churn ב-B2B SaaS", en: "Reducing B2B SaaS Churn" },
    challenge: { he: "לקוחות מגיעים לחודש 3 ונוטשים — onboarding חלש ו-value gap", en: "Customers churn at month 3 — weak onboarding and value gap" },
    result: { he: "ריצה של 4-שלבי onboarding אוטומטי הפחיתה churn ב-40% תוך Q1", en: "4-step automated onboarding reduced churn by 40% in Q1" },
    tags: [{ he: "Churn", en: "Churn" }, { he: "Retention", en: "Retention" }, { he: "Email", en: "Email" }],
    route: "/retention",
  },
  {
    id: "education",
    icon: <GraduationCap className="h-6 w-6" />,
    industry: { he: "חינוך / Online Courses", en: "Education / Online Courses" },
    title: { he: "מכירת קורס דיגיטלי ראשון", en: "Selling Your First Digital Course" },
    challenge: { he: "קהל קיים ב-Instagram אך אין מנגנון מכירה — השקה ידנית", en: "Existing Instagram audience, no sales mechanism — manual launch" },
    result: { he: "Funnel מבוסס webinar + downsell הניב 200K ₪ בשבוע הפתיחה", en: "Webinar-based funnel + downsell generated ₪200K in launch week" },
    tags: [{ he: "Launch", en: "Launch" }, { he: "Webinar", en: "Webinar" }, { he: "Email", en: "Email" }],
    route: "/sales",
  },
  {
    id: "services",
    icon: <Briefcase className="h-6 w-6" />,
    industry: { he: "שירותים מקצועיים", en: "Professional Services" },
    title: { he: "ייצור לידים לעורך דין / יועץ", en: "Lead Gen for Lawyer / Consultant" },
    challenge: { he: "תלות בהמלצות בלבד — אין ערוץ נכנס צפוי", en: "Dependent on referrals only — no predictable inbound channel" },
    result: { he: "Google Search + landing page + consultation funnel → 25 לידים חמים/חודש", en: "Google Search + landing page + consultation funnel → 25 warm leads/month" },
    tags: [{ he: "Lead Gen", en: "Lead Gen" }, { he: "Google Ads", en: "Google Ads" }, { he: "B2B", en: "B2B" }],
    route: "/differentiate",
  },
  {
    id: "content",
    icon: <Rss className="h-6 w-6" />,
    industry: { he: "תוכן / Creator", en: "Content / Creator" },
    title: { he: "מניטיזציה של ערוץ יוטיוב", en: "Monetising a YouTube Channel" },
    challenge: { he: "50K מנויים אך הכנסה מפרסום בלבד — תנודתי ונמוך", en: "50K subscribers but ad revenue only — volatile and low" },
    result: { he: "Membership + digital product + brand deals → הכפלת הכנסה תוך 6 חודשים", en: "Membership + digital product + brand deals → doubled revenue in 6 months" },
    tags: [{ he: "Creator", en: "Creator" }, { he: "Membership", en: "Membership" }, { he: "Sponsorship", en: "Sponsorship" }],
    route: "/pricing",
  },
  {
    id: "local",
    icon: <MapPin className="h-6 w-6" />,
    industry: { he: "עסק מקומי", en: "Local Business" },
    title: { he: "מילוי יומן ספא / קליניקה", en: "Filling the Calendar for Spa / Clinic" },
    challenge: { he: "40% מהמקומות ריקים — ביטולים ללא החלפה", en: "40% empty slots — cancellations without replacements" },
    result: { he: "WhatsApp re-engagement + loyalty program → 95% תפוסה תוך חודש", en: "WhatsApp re-engagement + loyalty program → 95% occupancy in one month" },
    tags: [{ he: "Local", en: "Local" }, { he: "Retention", en: "Retention" }, { he: "WhatsApp", en: "WhatsApp" }],
    route: "/retention",
  },
];

export default function UseCases() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHe = language === "he";

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl" dir={isHe ? "rtl" : "ltr"}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {tx({ he: "סיפורי הצלחה — מה שאחרים בנו", en: "Success Stories — What Others Built" }, language)}
        </h1>
        <p className="text-muted-foreground">
          {tx(
            {
              he: "דוגמאות אמיתיות לאסטרטגיות שיצרנו לעסקים כמו שלך",
              en: "Real examples of strategies built for businesses like yours",
            },
            language,
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((uc) => (
          <Card key={uc.id} className="flex flex-col group hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  {uc.icon}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {tx(uc.industry, language)}
                </Badge>
              </div>
              <CardTitle className="text-base leading-snug">{tx(uc.title, language)}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {tx(uc.challenge, language)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
                  ✓ {tx(uc.result, language)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {uc.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                    {tx(tag, language)}
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-auto w-full gap-1.5 group-hover:border-primary group-hover:text-primary transition-colors"
                onClick={() => navigate(uc.route)}
              >
                {tx({ he: "בנה אסטרטגיה דומה", en: "Build a similar strategy" }, language)}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
