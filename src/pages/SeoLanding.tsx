// ═══════════════════════════════════════════════
// SeoLanding — Programmatic SEO per industry
// Generates static-feeling per-industry landing pages.
// Routes: /seo/:industry (e.g. /seo/realEstate)
// Behavioral: Relevance heuristic — industry-specific
// copy converts 3-5× better than generic.
// ═══════════════════════════════════════════════
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompetitorScanCTA } from "@/components/CompetitorScanCTA";
import { Sparkles, CheckCircle, TrendingUp } from "lucide-react";
import type { BusinessField } from "@/types/funnel";

// Industry metadata: localized title, pain points, proof stat
const INDUSTRY_META: Record<string, {
  title: { he: string; en: string };
  subtitle: { he: string; en: string };
  pains: { he: string; en: string }[];
  stat: { he: string; en: string };
  emoji: string;
}> = {
  realEstate: {
    title: { he: "תוכנית שיווק לנדל\"ן", en: "Real Estate Marketing Plan" },
    subtitle: { he: "מדריך שיווק מותאם לתחום הנדל\"ן הישראלי — לידים, בידול, ותמחור", en: "Marketing guide tailored for Israeli real estate — leads, differentiation, and pricing" },
    pains: [
      { he: "לידים יקרים שלא מתקדמים לסגירה", en: "Expensive leads that don't convert to closings" },
      { he: "תחרות קשה בפורטלים (יד2, מדלן)", en: "Heavy competition on portals (Yad2, Madlan)" },
      { he: "לא יודע כמה לגבות עמלה ובאיזה מיצוב", en: "Unclear commission positioning vs competitors" },
    ],
    stat: { he: "סוכנים שבנו תוכנית דיגיטלית ראו 3× יותר לידים אורגניים", en: "Agents with a digital plan saw 3× more organic leads" },
    emoji: "🏠",
  },
  tech: {
    title: { he: "תוכנית שיווק לסטארטאפ טכנולוגי", en: "Tech Startup Marketing Plan" },
    subtitle: { he: "GTM strategy מותאמת לשוק הישראלי — Product-Led Growth, PLG, ו-ABM", en: "GTM strategy for the Israeli market — Product-Led Growth, PLG, and ABM" },
    pains: [
      { he: "Product-Market Fit לא ברור עדיין", en: "Product-Market Fit is still unclear" },
      { he: "Burn rate גבוה בלי ROI על שיווק", en: "High burn rate with no marketing ROI" },
      { he: "קשה לבדל ממוצרים דומים בחו\"ל", en: "Hard to differentiate from similar global products" },
    ],
    stat: { he: "סטארטאפים עם GTM מוגדר סגרו Series A 2× מהר יותר", en: "Startups with defined GTM closed Series A 2× faster" },
    emoji: "🚀",
  },
  food: {
    title: { he: "תוכנית שיווק למסעדות ואוכל", en: "Restaurant & Food Marketing Plan" },
    subtitle: { he: "שיווק לוקאלי, ניהול מוניטין, ואסטרטגיית עונות לתעשיית המסעדנות", en: "Local marketing, reputation management, and seasonal strategy for the food industry" },
    pains: [
      { he: "תפוסה נמוכה בימות שבוע", en: "Low occupancy on weekdays" },
      { he: "מנות שלא נמכרות ומייצרות פחת", en: "Menu items that don't sell and create waste" },
      { he: "ביקורות שליליות בגוגל שפוגעות בהזמנות", en: "Negative Google reviews hurting reservations" },
    ],
    stat: { he: "מסעדות עם תוכנית שיווק מקומי ראו 40% יותר הזמנות חוזרות", en: "Restaurants with local marketing plans saw 40% more repeat bookings" },
    emoji: "🍽️",
  },
  services: {
    title: { he: "תוכנית שיווק לעסקי שירות", en: "Professional Services Marketing Plan" },
    subtitle: { he: "בידול, תמחור ערכי, ורכישת לקוחות לעסקי שירות ב2B ו-B2C", en: "Differentiation, value-based pricing, and client acquisition for B2B and B2C service businesses" },
    pains: [
      { he: "מחיר לא מוצדק מול מתחרים זולים יותר", en: "Price hard to justify against cheaper competitors" },
      { he: "לקוחות מתלוננים על אותן בעיות שוב ושוב", en: "Clients complaining about the same issues repeatedly" },
      { he: "לא יודע איך לשווק מוניטין", en: "Unclear how to market reputation and expertise" },
    ],
    stat: { he: "נותני שירות עם תוכנית בידול גבו 35% יותר על אותה עבודה", en: "Service providers with differentiation plans charged 35% more for the same work" },
    emoji: "💼",
  },
  education: {
    title: { he: "תוכנית שיווק לחינוך והדרכה", en: "Education & Training Marketing Plan" },
    subtitle: { he: "הרשמות, שיעורי השלמה, ורכישת תלמידים לפלטפורמות ועסקי חינוך", en: "Enrollment, completion rates, and student acquisition for education platforms and businesses" },
    pains: [
      { he: "שיעורי נשירה גבוהים מקורסים", en: "High course dropout rates" },
      { he: "עלות רכישת תלמיד גבוהה מדי", en: "Customer acquisition cost per student is too high" },
      { he: "קשה לתמחר קורסים מול יוטיוב ו-Udemy חינמיים", en: "Hard to price against free YouTube and Udemy alternatives" },
    ],
    stat: { he: "פלטפורמות עם תוכנית הרשמה אסטרטגית ראו 60% יותר גמר קורסים", en: "Platforms with strategic enrollment plans saw 60% higher course completion" },
    emoji: "📚",
  },
  health: {
    title: { he: "תוכנית שיווק לבריאות וספא", en: "Health & Wellness Marketing Plan" },
    subtitle: { he: "בניית אמון, הפנייה מפה לאוזן, ושימור מטופלים בתחום הבריאות", en: "Building trust, word-of-mouth referrals, and patient retention in healthcare" },
    pains: [
      { he: "מטופלים חד-פעמיים שלא חוזרים", en: "One-time patients who don't return" },
      { he: "קושי לשווק שירותי בריאות בלי לפגוע באמינות", en: "Difficulty marketing health services without hurting credibility" },
      { he: "תחרות מקליניקות גדולות עם תקציב גדול", en: "Competition from large clinics with big budgets" },
    ],
    stat: { he: "מרפאות עם תוכנית שימור ראו 45% עלייה בפגישות חוזרות", en: "Clinics with retention plans saw 45% increase in return appointments" },
    emoji: "🏥",
  },
  tourism: {
    title: { he: "תוכנית שיווק לתיירות", en: "Tourism Marketing Plan" },
    subtitle: { he: "הזמנות ישירות, בידול מ-Booking ו-Airbnb, ושיווק עונתי לתיירות", en: "Direct bookings, differentiation from Booking and Airbnb, and seasonal marketing for tourism" },
    pains: [
      { he: "עמלות גבוהות לפלטפורמות הזמנה", en: "High commission fees to booking platforms" },
      { he: "עונתיות חזקה עם עונות שפל קשות", en: "Strong seasonality with difficult off-season periods" },
      { he: "ביקורות שולטות בנפשות — קשה להגיב נכון", en: "Reviews dominate perceptions — hard to respond correctly" },
    ],
    stat: { he: "מלונות עם אסטרטגיית הזמנות ישירות חסכו 28% בעמלות", en: "Hotels with direct booking strategy saved 28% in commissions" },
    emoji: "✈️",
  },
  personalBrand: {
    title: { he: "תוכנית שיווק למותג אישי", en: "Personal Brand Marketing Plan" },
    subtitle: { he: "בניית סמכות, תוכן ויראלי, ומינוף LinkedIn ו-Instagram לעצמאים ומומחים", en: "Authority building, viral content, and leveraging LinkedIn and Instagram for freelancers and experts" },
    pains: [
      { he: "מרגיש שמתחרים פחות מקצועיים ממני ויותר מוכרים", en: "Less experienced competitors seem to sell more" },
      { he: "לא יודע איך לתמחר את עצמי", en: "Unclear how to price yourself" },
      { he: "פוסטים לא מייצרים לידים", en: "Posts don't generate leads" },
    ],
    stat: { he: "עצמאים עם תוכנית תוכן מובנית הכפילו הכנסה תוך 6 חודשים", en: "Freelancers with structured content plans doubled income within 6 months" },
    emoji: "🌟",
  },
  other: {
    title: { he: "תוכנית שיווק לעסק שלך", en: "Custom Business Marketing Plan" },
    subtitle: { he: "תוכנית אסטרטגית מותאמת אישית לעסק ייחודי — לא קיים תבנית אחת לכולם", en: "Custom strategic plan for a unique business — no one-size-fits-all template" },
    pains: [
      { he: "לא ברור מהיכן מגיעה מרבית ההכנסה", en: "Unclear where most revenue actually comes from" },
      { he: "שיווק בוטה שלא מביא לקוחות איכותיים", en: "Spray-and-pray marketing that doesn't bring quality clients" },
      { he: "חסרה תוכנית עבודה ברורה לחודשים הקרובים", en: "Missing a clear action plan for the coming months" },
    ],
    stat: { he: "עסקים עם תוכנית מותאמת ראו 50% פחות בזבוז תקציב שיווקי", en: "Businesses with custom plans saw 50% less wasted marketing budget" },
    emoji: "💡",
  },
};

const ALL_INDUSTRIES = Object.keys(INDUSTRY_META) as BusinessField[];

export default function SeoLanding() {
  const { industry } = useParams<{ industry: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHe = language === "he";

  const meta = (industry && INDUSTRY_META[industry]) ? INDUSTRY_META[industry] : INDUSTRY_META.other;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16 container mx-auto px-4 max-w-3xl">

        {/* Hero */}
        <div className="text-center mb-12 space-y-4">
          <div className="text-5xl mb-4">{meta.emoji}</div>
          <Badge variant="secondary" className="text-xs">
            {isHe ? "מדריך חינמי" : "Free Guide"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground" dir="auto">
            {meta.title[language]}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto" dir="auto">
            {meta.subtitle[language]}
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/wizard")}
            className="gap-2 cta-warm px-8 py-5 text-base rounded-xl"
          >
            <Sparkles className="h-5 w-5" />
            {tx({ he: "בנה את התוכנית שלי — חינם", en: "Build My Free Plan" }, language)}
          </Button>
        </div>

        {/* Pain Points */}
        <Card className="mb-8 border-destructive/20 bg-destructive/5">
          <CardContent className="p-6">
            <p className="font-bold text-destructive mb-4 text-sm" dir="auto">
              🔴 {tx({ he: "הכאבים הנפוצים בתחום", en: "Common pain points in this industry" }, language)}
            </p>
            <ul className="space-y-2">
              {meta.pains.map((pain, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground" dir="auto">
                  <span className="text-destructive mt-0.5">•</span>
                  {pain[language]}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Social Proof Stat */}
        <Card className="mb-8 border-accent/20 bg-accent/5">
          <CardContent className="p-5 flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-foreground font-medium" dir="auto">
              {meta.stat[language]}
            </p>
          </CardContent>
        </Card>

        {/* What You Get */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="font-bold text-foreground mb-4" dir="auto">
              {tx({ he: "מה תקבל בתוכנית שלך", en: "What you get in your plan" }, language)}
            </p>
            <ul className="space-y-2.5">
              {[
                { he: "משפך שיווקי 5 שלבים מותאם לתעשייה שלך", en: "5-stage marketing funnel tailored to your industry" },
                { he: "סקריפטי מכירה מוכנים להעתקה", en: "Copy-paste sales scripts" },
                { he: "תמחור מבוסס נתוני שוק ישראלי", en: "Pricing based on Israeli market data" },
                { he: "אסטרטגיית בידול ממתחרים ספציפיים", en: "Differentiation strategy from specific competitors" },
                { he: "תוכנית שימור + NPS + referral", en: "Retention plan + NPS + referral strategy" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" dir="auto">
                  <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>{item[language]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* A2: Reciprocity Gift — CompetitorScanCTA */}
        <CompetitorScanCTA className="mb-8" />

        {/* Other Industries */}
        <div className="mt-10">
          <p className="text-xs text-muted-foreground mb-3" dir="auto">
            {tx({ he: "תחומים נוספים", en: "Other industries" }, language)}
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_INDUSTRIES.filter((ind) => ind !== industry).map((ind) => {
              const m = INDUSTRY_META[ind];
              return (
                <Button
                  key={ind}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => navigate(`/seo/${ind}`)}
                >
                  {m.emoji} {m.title[language]}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
