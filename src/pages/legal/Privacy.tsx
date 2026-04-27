import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import BackToHub from "@/components/BackToHub";

const Privacy = () => {
  const { language } = useLanguage();

  const lastUpdated = "2026-04-17";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 pt-4 pb-16">
        <BackToHub currentPage={tx({ he: "פרטיות", en: "Privacy" }, language)} />
        <article dir="auto" className="prose prose-sm dark:prose-invert mt-6 max-w-none">
          <h1>{tx({ he: "מדיניות פרטיות", en: "Privacy Policy" }, language)}</h1>
          <p className="text-xs text-muted-foreground">
            {tx({ he: "עודכן לאחרונה", en: "Last updated" }, language)}: {lastUpdated}
          </p>

          <h2>{tx({ he: "איזה מידע אנו אוספים", en: "What we collect" }, language)}</h2>
          <ul>
            <li>
              {tx(
                {
                  he: "נתוני טופס שיווקי: תחום, קהל יעד, תקציב, מטרה, תיאור מוצר, טווח מחיר.",
                  en: "Marketing form data: business field, audience, budget, goal, product description, price range.",
                },
                language,
              )}
            </li>
            <li>
              {tx(
                {
                  he: "נתוני חשבון: אימייל, שם תצוגה.",
                  en: "Account data: email, display name.",
                },
                language,
              )}
            </li>
            <li>
              {tx(
                {
                  he: "במידה וחיברת חשבון Meta Ads: מזהה חשבון, שם חשבון, מדדי ביצוע (clicks, impressions, spend).",
                  en: "If Meta Ads is connected: account id, account name, performance metrics (clicks, impressions, spend).",
                },
                language,
              )}
            </li>
            <li>
              {tx(
                {
                  he: "שימוש אנליטי אנונימי: עמוד שנצפה, זמן טעינה, אירועי שגיאה.",
                  en: "Anonymous analytics: pages viewed, load time, error events.",
                },
                language,
              )}
            </li>
          </ul>

          <h2>{tx({ he: "איפה זה נשמר", en: "Where it is stored" }, language)}</h2>
          <ul>
            <li>
              {tx(
                {
                  he: "Supabase (ספק מסד נתונים, ארה\"ב): חשבונות, תוכניות שמורות, פידבק.",
                  en: 'Supabase (database provider, US region): accounts, saved plans, feedback.',
                },
                language,
              )}
            </li>
            <li>
              {tx(
                {
                  he: "localStorage בדפדפן שלך: טיוטות, טופס אחרון, העדפות שפה.",
                  en: "Browser localStorage: drafts, last form data, language preference.",
                },
                language,
              )}
            </li>
            <li>
              {tx(
                {
                  he: "sessionStorage: token חיבור ל-Meta Ads. נמחק בסגירת הדפדפן.",
                  en: "sessionStorage: Meta Ads connection token. Cleared when browser closes.",
                },
                language,
              )}
            </li>
          </ul>

          <h2>{tx({ he: "שיתוף עם צדדים שלישיים", en: "Third-party sharing" }, language)}</h2>
          <p>
            {tx(
              {
                he: "רשימה מלאה של ספקי משנה (subprocessors), כולל מטרת עיבוד, אזור גיאוגרפי, מנגנון העברה בינלאומי (SCCs) וקישור ל-DPA, מתפרסמת בדף ",
                en: "A full list of subprocessors - purpose, region, transfer mechanism (SCCs), and DPA links - is published on our ",
              },
              language,
            )}
            <a href="/subprocessors" className="underline">
              {tx({ he: "ספקי המשנה", en: "Subprocessors" }, language)}
            </a>
            {tx({ he: ".", en: " page." }, language)}
          </p>
          <ul>
            <li>
              Meta (Facebook) Graph API: {tx({ he: "לצורך קריאת נתוני פרסום בלבד (scope: ads_read).", en: "for reading ad performance only (scope: ads_read)." }, language)}
            </li>
            <li>
              Google Analytics 4: {tx({ he: "שימוש אנונימי באתר (בכפוף להסכמתך).", en: "anonymous site usage (subject to your consent)." }, language)}
            </li>
            <li>
              Sentry: {tx({ he: "דיווח שגיאות בפרודקשן. מידע אישי מסוטר לפני שליחה.", en: "production error reporting. PII is stripped before transmission." }, language)}
            </li>
          </ul>

          <h2>{tx({ he: "AI ועיבוד אוטומטי", en: "AI and Automated Processing" }, language)}</h2>
          <p>
            {tx(
              {
                he: "השירות מספק המלצות באמצעות מודלי AI (Claude של Anthropic, embeddings של OpenAI). על-פי סעיף 22 של GDPR, יש לך זכות לקבל הסבר על ההיגיון מאחורי המלצה אוטומטית, להשיג עליה ולקבל החלטה אנושית. לחיצה על אייקון \"Glass-Box\" בכל המלצה חושפת את המתודולוגיה והקלט שהובילו לתוצאה. הספקים פועלים ב-tier ללא אימון מודלים על נתוני לקוחותינו.",
                en: "The service provides recommendations via AI models (Anthropic Claude, OpenAI embeddings). Under GDPR Article 22, you have the right to receive an explanation of the logic behind any automated recommendation, to contest it, and to request human review. Clicking the \"Glass-Box\" icon on any recommendation reveals the methodology and inputs that produced it. Providers operate on tiers that do not train models on our customers' data.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "הזכויות שלך (GDPR)", en: "Your rights (GDPR)" }, language)}</h2>
          <ul>
            <li>{tx({ he: "גישה, תיקון, מחיקה ועיבוד המידע שלך.", en: "Access, rectification, erasure and portability." }, language)}</li>
            <li>{tx({ he: "משיכת הסכמה בכל עת.", en: "Withdrawal of consent at any time." }, language)}</li>
            <li>
              {tx(
                {
                  he: "בקשות יש להפנות לעמוד ",
                  en: "Requests should be submitted via the ",
                },
                language,
              )}
              <a href="/support">{tx({ he: "תמיכה", en: "Support" }, language)}</a>
              {tx(
                { he: ". זמן תגובה: עד 7 ימי עבודה.", en: ". Response SLA: up to 7 business days." },
                language,
              )}
            </li>
          </ul>

          <h2>{tx({ he: "שמירת מידע", en: "Retention" }, language)}</h2>
          <p>
            {tx(
              {
                he: "מידע פעיל נשמר 60 יום. לאחר סגירת חשבון המידע נמחק תוך 30 יום, למעט רשומות שנדרשות על פי חוק.",
                en: "Active data is retained for 60 days. Upon account closure, data is deleted within 30 days except where retention is legally required.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "יצירת קשר", en: "Contact" }, language)}</h2>
          <p>
            <a href="/support">{tx({ he: "עמוד תמיכה", en: "Support page" }, language)}</a>
          </p>
        </article>
      </div>
    </main>
  );
};

export default Privacy;
