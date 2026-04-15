// ═══════════════════════════════════════════════
// Email Template Gallery
// 5 bilingual email sequences with preview timeline,
// copy-to-clipboard, and CRM export.
// ═══════════════════════════════════════════════

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Clock, Mail } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { downloadExport } from "@/engine/exportEngine";
import type { ExportResult } from "@/engine/exportEngine";
import * as XLSX from "xlsx";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

type TemplateCategory = "welcome" | "cart_abandonment" | "re_engagement" | "upsell" | "win_back";

interface EmailStep {
  dayOffset: number;
  subject: { he: string; en: string };
  preheader: { he: string; en: string };
  body: { he: string; en: string };
  cta: { he: string; en: string };
}

interface EmailTemplate {
  id: TemplateCategory;
  title: { he: string; en: string };
  description: { he: string; en: string };
  steps: EmailStep[];
}

// ───────────────────────────────────────────────
// Templates
// ───────────────────────────────────────────────

const TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome",
    title: { he: "סדרת ברוכים הבאים", en: "Welcome Series" },
    description: { he: "4 מיילים שהופכים נרשמים ללקוחות תוך 14 ימים", en: "4 emails converting signups to customers in 14 days" },
    steps: [
      {
        dayOffset: 0,
        subject: { he: "ברוך הבא, [שם] 👋", en: "Welcome aboard, [name] 👋" },
        preheader: { he: "הנה מה שיעניין אותך בשבועות הקרובים", en: "Here's what to expect in the coming weeks" },
        body: {
          he: "היי [שם],\n\nשמחים שהצטרפת ל-[Brand]. הנה מה שיקרה עכשיו:\n\n1. נשלח לך טיפ מעשי אחד בשבוע\n2. תקבל גישה לקהילה הסגורה שלנו\n3. 20% הנחה על הקנייה הראשונה (קוד: WELCOME20)\n\nיש לך שאלה? פשוט תענה למייל הזה.",
          en: "Hi [name],\n\nGlad you joined [Brand]. Here's what happens next:\n\n1. One actionable tip per week\n2. Access to our private community\n3. 20% off your first purchase (code: WELCOME20)\n\nHave a question? Just reply to this email.",
        },
        cta: { he: "קבל את ההנחה", en: "Claim your discount" },
      },
      {
        dayOffset: 3,
        subject: { he: "הסיפור שמאחורי [Brand]", en: "The story behind [Brand]" },
        preheader: { he: "למה התחלנו ולמה זה חשוב לך", en: "Why we started and why it matters to you" },
        body: {
          he: "לפני 3 שנים, נתקלתי בבעיה ש-[industry pain]...",
          en: "Three years ago, I hit a problem that [industry pain]...",
        },
        cta: { he: "גלה עוד", en: "Discover more" },
      },
      {
        dayOffset: 7,
        subject: { he: "[שם], ראית את המדריך הזה?", en: "[name], did you see this guide?" },
        preheader: { he: "המדריך שגרם ל-2,400 לקוחות להצליח", en: "The guide that helped 2,400 customers succeed" },
        body: {
          he: "הורד את המדריך חינם ותגלה את 5 הטעויות הכי נפוצות...",
          en: "Download the free guide and discover the 5 most common mistakes...",
        },
        cta: { he: "הורד עכשיו", en: "Download now" },
      },
      {
        dayOffset: 14,
        subject: { he: "ההנחה שלך נגמרת היום", en: "Your discount expires today" },
        preheader: { he: "20% הנחה אחרונה — לא נחזור על זה", en: "Last 20% off — won't repeat" },
        body: {
          he: "[שם], היום האחרון להשתמש בקוד WELCOME20. אחרי זה, ההנחה נעלמת.",
          en: "[name], today is the last day to use code WELCOME20. After that, the discount is gone.",
        },
        cta: { he: "קנה עכשיו", en: "Buy now" },
      },
    ],
  },
  {
    id: "cart_abandonment",
    title: { he: "עגלה נטושה", en: "Cart Abandonment" },
    description: { he: "3 מיילים שמחזירים 18% מעגלות נטושות", en: "3 emails that recover 18% of abandoned carts" },
    steps: [
      {
        dayOffset: 0,
        subject: { he: "שכחת משהו? 🛒", en: "Forgot something? 🛒" },
        preheader: { he: "המוצרים שלך ממתינים לך", en: "Your items are waiting for you" },
        body: {
          he: "היי [שם],\n\nשמרנו לך את העגלה. רק לחץ כדי לחזור.",
          en: "Hi [name],\n\nWe saved your cart. Just click to return.",
        },
        cta: { he: "חזור לעגלה", en: "Return to cart" },
      },
      {
        dayOffset: 1,
        subject: { he: "יש לנו 10% הנחה עבורך", en: "We have 10% off for you" },
        preheader: { he: "בלעדי לך — 24 שעות בלבד", en: "Exclusively for you — 24 hours only" },
        body: {
          he: "קוד: SAVE10 — תקף 24 שעות.",
          en: "Code: SAVE10 — valid for 24 hours.",
        },
        cta: { he: "השתמש בקוד", en: "Use the code" },
      },
      {
        dayOffset: 3,
        subject: { he: "הזדמנות אחרונה — 15% הנחה", en: "Last chance — 15% off" },
        preheader: { he: "אחרי זה המחיר חוזר", en: "After that, the price returns" },
        body: {
          he: "קוד: FINAL15. זה האחרון.",
          en: "Code: FINAL15. This is the last one.",
        },
        cta: { he: "קנה עכשיו", en: "Buy now" },
      },
    ],
  },
  {
    id: "re_engagement",
    title: { he: "מעורבות מחדש", en: "Re-Engagement" },
    description: { he: "החזר לקוחות רדומים בתוך 30 ימים", en: "Re-activate dormant customers within 30 days" },
    steps: [
      {
        dayOffset: 0,
        subject: { he: "התגעגענו אליך, [שם]", en: "We miss you, [name]" },
        preheader: { he: "הנה מה שחדש מאז שהיית כאן", en: "Here's what's new since you were here" },
        body: {
          he: "לא ראינו אותך הרבה זמן. הנה מה שהחמצת:\n\n• 3 פיצ'רים חדשים\n• 2 מקרי מבחן מרשימים\n• מחיר חדש למנוי",
          en: "We haven't seen you in a while. Here's what you missed:\n\n• 3 new features\n• 2 impressive case studies\n• New subscription pricing",
        },
        cta: { he: "ראה מה חדש", en: "See what's new" },
      },
      {
        dayOffset: 7,
        subject: { he: "[שם], הצעה מיוחדת רק לך", en: "[name], special offer just for you" },
        preheader: { he: "25% הנחה — בלעדי לחברי קהילה ותיקים", en: "25% off — exclusive to long-standing members" },
        body: {
          he: "קוד: COMEBACK25 — תקף 7 ימים.",
          en: "Code: COMEBACK25 — valid for 7 days.",
        },
        cta: { he: "קבל 25% הנחה", en: "Claim 25% off" },
      },
    ],
  },
  {
    id: "upsell",
    title: { he: "שדרוג / Upsell", en: "Upsell" },
    description: { he: "הגדלת ערך לקוח קיים ב-40%", en: "Grow existing customer value by 40%" },
    steps: [
      {
        dayOffset: 0,
        subject: { he: "[שם], מוכן לשלב הבא?", en: "[name], ready for the next level?" },
        preheader: { he: "הכלים המתקדמים שלנו ממתינים", en: "Our advanced tools are waiting" },
        body: {
          he: "ראינו שאתה מנצל את [Plan X] לחלוטין. זה הזמן לשדרג ל-[Plan Y] ולקבל:\n\n• פי 5 יכולת\n• תמיכה מועדפת\n• גישה לפיצ'רים חדשים",
          en: "We see you're maxing out [Plan X]. Time to upgrade to [Plan Y] and get:\n\n• 5x capacity\n• Priority support\n• Early access to new features",
        },
        cta: { he: "שדרג עכשיו", en: "Upgrade now" },
      },
    ],
  },
  {
    id: "win_back",
    title: { he: "החזרת לקוח", en: "Win-Back" },
    description: { he: "החזרת לקוחות שנטשו — אחוזי הצלחה של 12-20%", en: "Recover churned customers — 12-20% win rate" },
    steps: [
      {
        dayOffset: 0,
        subject: { he: "נתת לנו הזדמנות שנייה?", en: "Will you give us a second chance?" },
        preheader: { he: "תקנו את מה שלא עבד", en: "We fixed what wasn't working" },
        body: {
          he: "היי [שם],\n\nראינו שעזבת לפני 3 חודשים. אנחנו רוצים להבין למה — ואולי להראות לך מה השתנה מאז.",
          en: "Hi [name],\n\nWe noticed you left 3 months ago. We'd love to understand why — and maybe show you what's changed.",
        },
        cta: { he: "תן לנו הזדמנות", en: "Give us a chance" },
      },
      {
        dayOffset: 7,
        subject: { he: "[שם], 50% הנחה כדי לחזור", en: "[name], 50% off to come back" },
        preheader: { he: "הצעה חד-פעמית — נגמרת בסוף השבוע", en: "One-time offer — expires this weekend" },
        body: {
          he: "קוד: WELCOMEBACK50. זה ההנחה הכי גדולה שנתנו.",
          en: "Code: WELCOMEBACK50. This is the biggest discount we've ever offered.",
        },
        cta: { he: "חזור עם 50% הנחה", en: "Return with 50% off" },
      },
    ],
  },
];

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

export function EmailTemplateGallery() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [activeTemplate, setActiveTemplate] = useState<TemplateCategory>("welcome");
  const t = (he: string, en: string) => (language === "he" ? he : en);

  const template = TEMPLATES.find((tpl) => tpl.id === activeTemplate)!;

  function copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: t("הועתק!", "Copied!"),
          description: t("הטקסט הועתק ללוח", "Text copied to clipboard"),
        });
      })
      .catch(() => {
        toast({
          title: t("שגיאה", "Error"),
          description: t("לא ניתן להעתיק ללוח", "Could not copy to clipboard"),
          variant: "destructive",
        });
      });
  }

  function copyAllSteps() {
    const allText = template.steps
      .map(
        (step) =>
          `DAY ${step.dayOffset}\nSubject: ${step.subject[language]}\nPreheader: ${step.preheader[language]}\n\n${step.body[language]}\n\nCTA: ${step.cta[language]}\n\n---\n`,
      )
      .join("\n");
    copyToClipboard(allText);
  }

  function exportTemplate(format: "mailchimp" | "hubspot") {
    const rows = template.steps.map((step) => ({
      "Day Offset": step.dayOffset,
      Subject: step.subject[language],
      Preheader: step.preheader[language],
      Body: step.body[language],
      CTA: step.cta[language],
      "Campaign Name": `${template.title.en} — Day ${step.dayOffset}`,
      "From Name": "Campaign Craft",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, format === "mailchimp" ? "Mailchimp" : "HubSpot");
    const csv = XLSX.utils.sheet_to_csv(ws);
    const buffer = new TextEncoder().encode(csv).buffer;

    const result: ExportResult = {
      data: buffer,
      filename: `${template.id}-${format}-${new Date().toISOString().split("T")[0]}.csv`,
      mimeType: "text/csv",
    };
    downloadExport(result);

    toast({
      title: t("הורד בהצלחה!", "Downloaded!"),
      description: t(`תבנית יוצאה ל-${format}`, `Template exported to ${format}`),
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t("גלריית תבניות Email", "Email Template Gallery")}
        </CardTitle>
        <CardDescription>
          {t("5 תבניות מוכנות לשימוש — דו-לשוניות, עם ייצוא ל-CRM", "5 ready-to-use templates — bilingual, with CRM export")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTemplate} onValueChange={(v) => setActiveTemplate(v as TemplateCategory)}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-4">
            {TEMPLATES.map((tpl) => (
              <TabsTrigger key={tpl.id} value={tpl.id} className="text-xs">
                {tpl.title[language]}
              </TabsTrigger>
            ))}
          </TabsList>

          {TEMPLATES.map((tpl) => (
            <TabsContent key={tpl.id} value={tpl.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{tpl.title[language]}</h3>
                  <p className="text-sm text-muted-foreground">{tpl.description[language]}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyAllSteps}>
                    <Copy className="h-4 w-4 me-1" />
                    {t("העתק הכל", "Copy all")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportTemplate("mailchimp")}>
                    <Download className="h-4 w-4 me-1" />
                    Mailchimp
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportTemplate("hubspot")}>
                    <Download className="h-4 w-4 me-1" />
                    HubSpot
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {tpl.steps.map((step, idx) => (
                  <Card key={idx} className="border-s-4 border-s-primary/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {t(`יום ${step.dayOffset}`, `Day ${step.dayOffset}`)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(
                              `Subject: ${step.subject[language]}\n\n${step.body[language]}\n\nCTA: ${step.cta[language]}`,
                            )
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <CardTitle className="text-sm">{step.subject[language]}</CardTitle>
                      <CardDescription className="text-xs">{step.preheader[language]}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <pre className="whitespace-pre-wrap text-xs font-sans text-muted-foreground mb-2">
                        {step.body[language]}
                      </pre>
                      <Badge className="text-xs">{step.cta[language]}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default EmailTemplateGallery;
