import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { Mail, Phone, MapPin } from "lucide-react";

/**
 * Global footer rendered on every authenticated page (mounted in AppShell).
 * Required by Israeli payment processors: business contact details + cancellation
 * policy must be reachable from every page.
 */
const Footer = () => {
  const { language, isRTL } = useLanguage();

  const legalName = BUSINESS_INFO.legalName[language as "he" | "en"] ?? BUSINESS_INFO.legalName.en;
  const vatLabel = BUSINESS_INFO.vatIdLabel[language as "he" | "en"] ?? BUSINESS_INFO.vatIdLabel.en;
  const addressFull = BUSINESS_INFO.address.full[language as "he" | "en"] ?? BUSINESS_INFO.address.full.en;

  return (
    <footer
      className="border-t border-border bg-muted/30 mt-auto"
      dir={isRTL ? "rtl" : "ltr"}
      role="contentinfo"
    >
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Business identity */}
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">
              {BUSINESS_INFO.brandName}
            </p>
            <p className="text-muted-foreground" dir="auto">
              {legalName} · {vatLabel} {BUSINESS_INFO.vatId}
            </p>
            <p className="flex items-start gap-2 text-muted-foreground" dir="auto">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{addressFull}</span>
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">
              {tx({ he: "יצירת קשר", en: "Contact" }, language)}
            </p>
            <a
              href={`tel:${BUSINESS_INFO.phone.tel}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              dir="ltr"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{BUSINESS_INFO.phone.display}</span>
            </a>
            <a
              href={`mailto:${BUSINESS_INFO.email}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors break-all"
              dir="ltr"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{BUSINESS_INFO.email}</span>
            </a>
          </div>

          {/* Legal links */}
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">
              {tx({ he: "מידע משפטי", en: "Legal" }, language)}
            </p>
            <ul className="space-y-1.5">
              <li>
                <Link to="/refund-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  {tx({ he: "תקנון ביטולים והחזרים", en: "Refund & Cancellation Policy" }, language)}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  {tx({ he: "תנאי שימוש", en: "Terms of Service" }, language)}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  {tx({ he: "מדיניות פרטיות", en: "Privacy Policy" }, language)}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  {tx({ he: "יצירת קשר ותמיכה", en: "Contact & Support" }, language)}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} {BUSINESS_INFO.brandName} ·{" "}
          {tx({ he: "כל הזכויות שמורות", en: "All rights reserved" }, language)}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
