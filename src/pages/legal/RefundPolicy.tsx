import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import BackToHub from "@/components/BackToHub";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

const RefundPolicy = () => {
  const { language } = useLanguage();
  const lastUpdated = "2026-04-18";
  const lang = language as "he" | "en";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 pt-4 pb-16">
        <BackToHub currentPage={tx({ he: "תקנון ביטולים", en: "Refund Policy" }, language)} />

        {/* Contact card on top — required by סולק for cancellation requests */}
        <Card className="mt-6" dir="auto">
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold mb-3 text-foreground">
              {tx({ he: "פנייה לביטול עסקה", en: "Cancellation contact" }, language)}
            </h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground" dir="auto">
                {BUSINESS_INFO.legalName[lang]} · {BUSINESS_INFO.vatIdLabel[lang]} {BUSINESS_INFO.vatId}
              </p>
              <p className="flex items-start gap-2" dir="auto">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {BUSINESS_INFO.address.full[lang]}
              </p>
              <a href={`tel:${BUSINESS_INFO.phone.tel}`} className="flex items-center gap-2 hover:text-foreground" dir="ltr">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {BUSINESS_INFO.phone.display}
              </a>
              <a href={`mailto:${BUSINESS_INFO.email}`} className="flex items-center gap-2 hover:text-foreground break-all" dir="ltr">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {BUSINESS_INFO.email}
              </a>
            </div>
          </CardContent>
        </Card>

        <article dir="auto" className="prose prose-sm dark:prose-invert mt-6 max-w-none">
          <h1>{tx({ he: "תקנון ביטולים והחזרים", en: "Refund & Cancellation Policy" }, language)}</h1>
          <p className="text-xs text-muted-foreground">
            {tx({ he: "עודכן לאחרונה", en: "Last updated" }, language)}: {lastUpdated}
          </p>

          <p>
            {tx(
              {
                he: "תקנון זה מנוסח בהתאם לחוק הגנת הצרכן, התשמ\"א-1981, ולתקנות הגנת הצרכן (ביטול עסקה), התשע\"א-2010. במקרה של סתירה בין התקנון להוראות הדין, יגברו הוראות הדין.",
                en: "This policy is based on the Israeli Consumer Protection Law, 1981 and the Consumer Protection (Cancellation of Transaction) Regulations, 2010. In case of conflict, the law prevails.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "1. זכות ביטול עסקה", en: "1. Right to cancel" }, language)}</h2>
          <p>
            {tx(
              {
                he: "לקוח רשאי לבטל עסקת מכר מרחוק תוך 14 ימים מיום ביצוע העסקה או מיום קבלת אישור על העסקה (המאוחר מבין השניים), בהתאם לסעיף 14ג לחוק הגנת הצרכן.",
                en: "You may cancel a distance transaction within 14 days from the transaction date or from receipt of confirmation (whichever is later), per section 14C of the Consumer Protection Law.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "2. שירות מתמשך / מנוי", en: "2. Continuous service / subscription" }, language)}</h2>
          <p>
            {tx(
              {
                he: "במנוי מתמשך, ניתן לבטל בכל עת. החיוב יחושב באופן יחסי עד מועד הביטול בפועל. ביטול ייכנס לתוקף בתום מחזור החיוב הנוכחי, אלא אם נתבקש אחרת במפורש.",
                en: "For ongoing subscriptions, you may cancel at any time. Charges will be prorated through the cancellation date. Cancellation takes effect at the end of the current billing cycle unless explicitly requested otherwise.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "3. דמי ביטול", en: "3. Cancellation fees" }, language)}</h2>
          <p>
            {tx(
              {
                he: "בהתאם לחוק, ייתכנו דמי ביטול בשיעור 5% מערך העסקה או ₪100, הנמוך מבין השניים. בביטול עקב פגם או אי-התאמה לא ייגבו דמי ביטול.",
                en: "Per law, cancellation fees may apply at 5% of the transaction value or ILS 100, whichever is lower. No fees apply for cancellations due to defect or non-conformity.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "4. אופן הביטול", en: "4. How to cancel" }, language)}</h2>
          <p>
            {tx(
              { he: "ניתן להגיש בקשת ביטול בכל אחד מהערוצים הבאים:", en: "You may submit a cancellation request via any of the following channels:" },
              language,
            )}
          </p>
          <ul>
            <li>
              {tx({ he: "אימייל", en: "Email" }, language)}:{" "}
              <a href={`mailto:${BUSINESS_INFO.email}`} dir="ltr">{BUSINESS_INFO.email}</a>
            </li>
            <li>
              {tx({ he: "טלפון", en: "Phone" }, language)}:{" "}
              <a href={`tel:${BUSINESS_INFO.phone.tel}`} dir="ltr">{BUSINESS_INFO.phone.display}</a>
            </li>
            <li>
              {tx({ he: "עמוד תמיכה", en: "Support page" }, language)}: <a href="/support">/support</a>
            </li>
            <li>
              {tx({ he: "דואר רגיל לכתובת", en: "Postal mail to" }, language)}: {BUSINESS_INFO.address.full[lang]}
            </li>
          </ul>

          <h2>{tx({ he: "5. החזר כספי", en: "5. Refunds" }, language)}</h2>
          <p>
            {tx(
              {
                he: "החזר כספי יבוצע תוך 14 ימי עסקים מיום אישור הביטול, לאמצעי התשלום המקורי בלבד. במקרה של ניכוי דמי ביטול, סכום ההחזר יופחת בהתאם.",
                en: "Refunds will be processed within 14 business days of cancellation approval, to the original payment method. Cancellation fees, if applicable, will be deducted from the refund.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "6. חריגים מזכות הביטול", en: "6. Exceptions to cancellation" }, language)}</h2>
          <p>
            {tx(
              {
                he: "בהתאם לסעיף 14ג(ד) לחוק, זכות הביטול אינה חלה על: (א) שירותים שניתנו במלואם לפני הביטול; (ב) קבצי מידע / דוחות שהורדו או הופקו עבור הלקוח; (ג) פריטים שיוצרו במיוחד עבור הצרכן בעקבות העסקה.",
                en: "Per section 14C(d), the right of cancellation does not apply to: (a) services already fully provided; (b) downloaded data files or generated reports; (c) items custom-made specifically for the consumer.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "7. ביטול עקב פגם", en: "7. Cancellation due to defect" }, language)}</h2>
          <p>
            {tx(
              {
                he: "במקרה של פגם בשירות או אי-התאמה לתיאור, נחזיר את מלוא הסכום ששולם, ללא ניכוי דמי ביטול, תוך 14 ימי עסקים.",
                en: "In case of a defect or material non-conformity, we will refund the full amount paid, without deducting cancellation fees, within 14 business days.",
              },
              language,
            )}
          </p>

          <h2>{tx({ he: "8. דין ושיפוט", en: "8. Governing law" }, language)}</h2>
          <p>
            {tx(
              {
                he: "דיני מדינת ישראל חלים על תקנון זה. סמכות שיפוט ייחודית: בתי המשפט המוסמכים בתל אביב-יפו.",
                en: "Israeli law governs this policy. Exclusive jurisdiction lies with the competent courts in Tel Aviv-Yafo.",
              },
              language,
            )}
          </p>
        </article>
      </div>
    </main>
  );
};

export default RefundPolicy;
