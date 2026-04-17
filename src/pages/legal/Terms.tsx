import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import BackToHub from "@/components/BackToHub";

const Terms = () => {
  const { language } = useLanguage();
  const lastUpdated = "2026-04-17";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 pt-4 pb-16">
        <BackToHub currentPage={tx({ he: "תנאי שימוש", en: "Terms" }, language)} />
        <article dir="auto" className="prose prose-sm dark:prose-invert mt-6 max-w-none">
          <h1>{tx({ he: "תנאי שימוש", en: "Terms of Service" }, language)}</h1>
          <p className="text-xs text-muted-foreground">
            {tx({ he: "עודכן לאחרונה", en: "Last updated" }, language)}: {lastUpdated}
          </p>

          <p>
            {tx(
              {
                he: "המערכת ניתנת AS-IS, במצב Beta, ללא התחייבות לזמינות רציפה או לדיוק התחזיות.",
                en: "The service is provided AS-IS, in Beta, without any guarantee of uptime or forecast accuracy.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "שימוש מותר", en: "Permitted use" }, language)}</h2>
          <ul>
            <li>{tx({ he: "שימוש פנימי לצרכי תכנון שיווקי.", en: "Internal use for marketing planning." }, language)}</li>
            <li>{tx({ he: "שיתוף תוצאות עם שותפי צוות.", en: "Sharing outputs with team members." }, language)}</li>
          </ul>

          <h2>{tx({ he: "שימוש אסור", en: "Prohibited use" }, language)}</h2>
          <ul>
            <li>{tx({ he: "Scraping, reverse engineering, ניסיון לעקיפת הגבלות.", en: "Scraping, reverse engineering, or bypassing limits." }, language)}</li>
            <li>{tx({ he: "התחברות לחשבונות Meta שאינם בבעלותך.", en: "Connecting Meta accounts you do not own." }, language)}</li>
            <li>{tx({ he: "הפצת תוכן חסוי של צדדים שלישיים.", en: "Distributing third parties' confidential data." }, language)}</li>
          </ul>

          <h2>{tx({ he: "אחריות", en: "Liability" }, language)}</h2>
          <p>
            {tx(
              {
                he: "אחריותנו מוגבלת לדמי מנוי ששילמת בששת החודשים האחרונים. אין אחריות לנזק עקיף, אבדן הכנסה או החלטות עסקיות שהתבססו על פלטים מהמערכת.",
                en: "Our liability is capped at fees paid in the last six months. No liability for indirect damages, lost revenue, or business decisions based on system outputs.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "סיום שירות", en: "Termination" }, language)}</h2>
          <p>
            {tx(
              {
                he: "באפשרותך לסגור את חשבונך בכל עת. אנו רשאים לסיים את השירות עם הודעה של 30 יום מראש, למעט מקרי הפרה — אשר יכולים להוביל להשעיה מיידית.",
                en: "You may close your account at any time. We may terminate with 30 days' notice, except in cases of breach where immediate suspension may apply.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "דין ושיפוט", en: "Governing law" }, language)}</h2>
          <p>
            {tx(
              {
                he: "דיני מדינת ישראל חלים; סמכות שיפוט ייחודית לבתי המשפט בתל אביב.",
                en: "The laws of the State of Israel apply; exclusive jurisdiction: Tel Aviv courts.",
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

export default Terms;
