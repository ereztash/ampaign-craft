import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import BackToHub from "@/components/BackToHub";

interface Subprocessor {
  name: string;
  purpose: { he: string; en: string };
  region: string;
  dataCategory: { he: string; en: string };
  transferMechanism: { he: string; en: string };
  dpa: string;
}

const SUBPROCESSORS: Subprocessor[] = [
  {
    name: "Supabase Inc.",
    purpose: { he: "מסד נתונים, אימות, Edge Functions", en: "Database, auth, Edge Functions" },
    region: "US (AWS us-east-1)",
    dataCategory: { he: "כל נתוני המוצר והחשבון", en: "All product and account data" },
    transferMechanism: { he: "EU SCCs (Module 2)", en: "EU SCCs (Module 2)" },
    dpa: "https://supabase.com/legal/dpa",
  },
  {
    name: "Anthropic PBC",
    purpose: { he: "מודלי Claude עבור AI Coach וסוכני research", en: "Claude models for AI Coach and research agents" },
    region: "US",
    dataCategory: { he: "תוכן פרומפט (טקסט עסקי שהמשתמש מזין)", en: "Prompt content (business text user enters)" },
    transferMechanism: { he: "EU SCCs + zero-retention API flag", en: "EU SCCs + zero-retention API flag" },
    dpa: "https://www.anthropic.com/legal/dpa",
  },
  {
    name: "OpenAI, L.L.C.",
    purpose: { he: "Embeddings (text-embedding-3-small)", en: "Embeddings (text-embedding-3-small)" },
    region: "US",
    dataCategory: { he: "טקסט מוצר/דומיין לוקטוריזציה", en: "Product/domain text for vectorization" },
    transferMechanism: { he: "EU SCCs + zero-retention enterprise tier", en: "EU SCCs + zero-retention enterprise tier" },
    dpa: "https://openai.com/policies/data-processing-addendum/",
  },
  {
    name: "Stripe Payments Europe Ltd.",
    purpose: { he: "עיבוד תשלומים, customer portal", en: "Payment processing, customer portal" },
    region: "EU + US",
    dataCategory: { he: "אימייל, מזהה לקוח, פרטי חיוב (לא מספרי כרטיס)", en: "Email, customer ID, billing details (not card numbers)" },
    transferMechanism: { he: "EU SCCs", en: "EU SCCs" },
    dpa: "https://stripe.com/legal/dpa",
  },
  {
    name: "Meta Platforms Ireland Ltd.",
    purpose: { he: "Meta Graph API, scope ads_read בלבד", en: "Meta Graph API, scope ads_read only" },
    region: "EU + US",
    dataCategory: { he: "מזהה חשבון מודעות, מטריקות ביצוע", en: "Ad account ID, performance metrics" },
    transferMechanism: { he: "EU SCCs (פלטפורמה אירופית)", en: "EU SCCs (EU-controlled entity)" },
    dpa: "https://www.facebook.com/legal/terms/dataprocessingterms",
  },
  {
    name: "Resend (Sendlayer Inc.)",
    purpose: { he: "דוא\"ל transactional ו-digest", en: "Transactional and digest emails" },
    region: "US",
    dataCategory: { he: "כתובת אימייל, תוכן הודעה", en: "Email address, message content" },
    transferMechanism: { he: "EU SCCs", en: "EU SCCs" },
    dpa: "https://resend.com/legal/dpa",
  },
  {
    name: "Vercel Inc.",
    purpose: { he: "אירוח Frontend, CDN, deployments", en: "Frontend hosting, CDN, deployments" },
    region: "US (Edge Network global)",
    dataCategory: { he: "logs בקשות, IP זמני (no PII storage)", en: "Request logs, ephemeral IP (no PII storage)" },
    transferMechanism: { he: "EU SCCs", en: "EU SCCs" },
    dpa: "https://vercel.com/legal/dpa",
  },
  {
    name: "Functional Software, Inc. (Sentry)",
    purpose: { he: "דיווח שגיאות פרודקשן (PII redacted)", en: "Production error reporting (PII redacted)" },
    region: "US",
    dataCategory: { he: "stack traces, route, browser, version (PII מסונן)", en: "Stack traces, route, browser, version (PII filtered)" },
    transferMechanism: { he: "EU SCCs", en: "EU SCCs" },
    dpa: "https://sentry.io/legal/dpa/",
  },
  {
    name: "Google Ireland Ltd. (Google Analytics 4)",
    purpose: { he: "סטטיסטיקות שימוש אנונימיות (אופציונלי, opt-in)", en: "Anonymous usage statistics (optional, opt-in)" },
    region: "EU + US",
    dataCategory: { he: "client ID אנונימי, route, אירועי AARRR", en: "Anonymous client ID, route, AARRR events" },
    transferMechanism: { he: "EU SCCs + Google EU-US Data Privacy Framework", en: "EU SCCs + Google EU-US Data Privacy Framework" },
    dpa: "https://business.safety.google/processorterms/",
  },
];

const Subprocessors = () => {
  const { language } = useLanguage();
  const lastUpdated = "2026-04-27";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 pt-4 pb-16">
        <BackToHub currentPage={tx({ he: "ספקי משנה", en: "Subprocessors" }, language)} />
        <article dir="auto" className="prose prose-sm dark:prose-invert mt-6 max-w-none">
          <h1>{tx({ he: "רשימת ספקי משנה", en: "Subprocessor List" }, language)}</h1>
          <p className="text-xs text-muted-foreground">
            {tx({ he: "עודכן לאחרונה", en: "Last updated" }, language)}: {lastUpdated}
          </p>

          <p>
            {tx(
              {
                he: "FunnelForge נעזרת בספקי המשנה הבאים לעיבוד נתונים בשמכם, בהתאם לסעיף 28 של GDPR ולחוק הגנת הפרטיות, התשמ\"א-1981. כל אחד מהם פועל תחת DPA חתום וטרנספרים בינלאומיים מוגנים ב-Standard Contractual Clauses (SCCs) של האיחוד האירופי.",
                en: "FunnelForge engages the following subprocessors to process data on your behalf, in accordance with GDPR Article 28 and the Israeli Privacy Protection Law, 5741-1981. Each operates under a signed DPA, with international transfers protected by EU Standard Contractual Clauses (SCCs).",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "מנגנון התראה על שינויים", en: "Change Notification Mechanism" }, language)}</h2>
          <p>
            {tx(
              {
                he: "נודיע על תוספת או החלפה של ספק משנה לפחות 30 יום מראש בדף זה ובהודעת אימייל לכל לקוח חתום. אי-הסכמה מאפשרת ביטול ההסכם ללא דמי יציאה.",
                en: "We will notify customers of additions or replacements at least 30 days in advance via this page and email to all active customers. Objection rights apply (no exit fees).",
              },
              language,
            )}
          </p>

          <div className="not-prose mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-start border">{tx({ he: "ספק", en: "Provider" }, language)}</th>
                  <th className="p-2 text-start border">{tx({ he: "מטרה", en: "Purpose" }, language)}</th>
                  <th className="p-2 text-start border">{tx({ he: "אזור", en: "Region" }, language)}</th>
                  <th className="p-2 text-start border">{tx({ he: "קטגוריית נתונים", en: "Data category" }, language)}</th>
                  <th className="p-2 text-start border">{tx({ he: "מנגנון העברה", en: "Transfer mechanism" }, language)}</th>
                  <th className="p-2 text-start border">DPA</th>
                </tr>
              </thead>
              <tbody>
                {SUBPROCESSORS.map((sp) => (
                  <tr key={sp.name} className="even:bg-muted/30">
                    <td className="p-2 border font-medium">{sp.name}</td>
                    <td className="p-2 border">{tx(sp.purpose, language)}</td>
                    <td className="p-2 border">{sp.region}</td>
                    <td className="p-2 border">{tx(sp.dataCategory, language)}</td>
                    <td className="p-2 border">{tx(sp.transferMechanism, language)}</td>
                    <td className="p-2 border">
                      <a href={sp.dpa} target="_blank" rel="noopener noreferrer" className="underline">
                        {tx({ he: "קישור", en: "Link" }, language)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>{tx({ he: "אימון מודלים (No-train)", en: "Model Training (No-train)" }, language)}</h2>
          <p>
            {tx(
              {
                he: "Anthropic ו-OpenAI מופעלים ב-API tier שאינו משמש לאימון מודלים על קלטי לקוחותינו. תוכן פרומפט נשמר אצלם לצורך abuse-monitoring בלבד, ל-30 יום, ולאחר מכן נמחק.",
                en: "Anthropic and OpenAI are used on API tiers that do not train models on our customers' inputs. Prompt content is retained by them solely for abuse-monitoring for 30 days, then deleted.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "יצירת קשר", en: "Contact" }, language)}</h2>
          <p>
            {tx(
              {
                he: 'לבקשות DPA, שאלות על subprocessor, או יישום זכויות GDPR/PPL - פנו דרך ',
                en: "For DPA requests, subprocessor questions, or GDPR/PPL rights exercises, contact us via the ",
              },
              language,
            )}
            <a href="/support" className="underline">
              {tx({ he: "עמוד תמיכה", en: "Support page" }, language)}
            </a>
            .
          </p>
        </article>
      </div>
    </main>
  );
};

export default Subprocessors;
