import { forwardRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Gift, AlertTriangle } from "lucide-react";
import type { Quote } from "@/types/quote";
import { formatQuotePrice } from "@/types/quote";
import type { BilingualText } from "@/types/pricing";
import type { Language } from "@/i18n/translations";

interface QuotePreviewProps {
  quote: Quote;
  language: Language;
  className?: string;
}

const QuotePreview = forwardRef<HTMLDivElement, QuotePreviewProps>(
  ({ quote, language, className = "" }, ref) => {
    const isHe = language === "he";
    const dir = isHe ? "rtl" : "ltr";
    const bil = (t: BilingualText) => (isHe ? t.he : t.en);

    const validDate = new Date(quote.validUntil).toLocaleDateString(
      isHe ? "he-IL" : "en-US",
      { day: "numeric", month: "long", year: "numeric" },
    );
    const createdDate = new Date(quote.createdAt).toLocaleDateString(
      isHe ? "he-IL" : "en-US",
      { day: "numeric", month: "long", year: "numeric" },
    );

    return (
      <div
        ref={ref}
        dir={dir}
        className={`bg-white text-gray-900 rounded-xl shadow-sm border max-w-3xl mx-auto ${className}`}
        id="quote-preview-root"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {bil(quote.headline)}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isHe ? `מס׳ הצעה: ${quote.id}` : `Quote #${quote.id}`}
              </p>
            </div>
            <div className="text-end text-sm text-gray-500">
              <p>{createdDate}</p>
              <p className="flex items-center gap-1 justify-end">
                <Clock className="h-3.5 w-3.5" />
                {isHe ? `בתוקף עד ${validDate}` : `Valid until ${validDate}`}
              </p>
            </div>
          </div>
        </div>

        {/* Recipient */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            {isHe ? "עבור" : "Prepared For"}
          </p>
          <p className="font-semibold text-gray-900">{quote.recipient.name}</p>
          {quote.recipient.company && (
            <p className="text-sm text-gray-600">{quote.recipient.company}</p>
          )}
          {quote.recipient.role && (
            <p className="text-sm text-gray-500">{quote.recipient.role}</p>
          )}
        </div>

        {/* DISC-adapted framing */}
        <div className="px-6 py-4 border-b">
          <p className="text-sm text-gray-700 leading-relaxed italic">
            {bil(quote.discAdaptedFraming)}
          </p>
        </div>

        {/* Value Narrative */}
        {(quote.valueNarrative.he || quote.valueNarrative.en) && (
          <div className="px-6 py-4 border-b bg-blue-50/50">
            <p className="text-xs text-blue-600 uppercase tracking-wide mb-1 font-medium">
              {isHe ? "למה ההשקעה הזו" : "Why This Investment"}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {bil(quote.valueNarrative)}
            </p>
          </div>
        )}

        {/* Line Items */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 text-start font-medium">{isHe ? "פריט" : "Item"}</th>
                <th className="pb-2 w-16 text-center font-medium">{isHe ? "כמות" : "Qty"}</th>
                <th className="pb-2 w-28 text-end font-medium">{isHe ? "מחיר" : "Price"}</th>
                <th className="pb-2 w-28 text-end font-medium">{isHe ? "סה״כ" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2.5">
                    <span className="font-medium text-gray-900">{bil(item.name)}</span>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    )}
                  </td>
                  <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-2.5 text-end text-gray-600">
                    {item.unitPrice > 0 ? formatQuotePrice(item.unitPrice, quote.currency) : "—"}
                  </td>
                  <td className="py-2.5 text-end font-medium text-gray-900">
                    {item.total > 0 ? formatQuotePrice(item.total, quote.currency) : isHe ? "כלול" : "Included"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{isHe ? "סכום ביניים" : "Subtotal"}</span>
                <span>{formatQuotePrice(quote.subtotal, quote.currency)}</span>
              </div>
              {quote.discount && quote.discount.value > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    {isHe ? "הנחה" : "Discount"}
                    {quote.discount.type === "percent" ? ` (${quote.discount.value}%)` : ""}
                  </span>
                  <span>
                    -{quote.discount.type === "percent"
                      ? formatQuotePrice(quote.subtotal * (quote.discount.value / 100), quote.currency)
                      : formatQuotePrice(quote.discount.value, quote.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
                <span>{isHe ? "סה״כ לתשלום" : "Total"}</span>
                <span>{formatQuotePrice(quote.total, quote.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bonuses */}
        {quote.bonuses.length > 0 && (
          <div className="px-6 py-4 border-t bg-amber-50/50">
            <p className="text-xs text-amber-700 uppercase tracking-wide mb-3 font-medium flex items-center gap-1">
              <Gift className="h-3.5 w-3.5" />
              {isHe ? "בונוסים מיוחדים כלולים" : "Special Bonuses Included"}
            </p>
            <div className="space-y-2">
              {quote.bonuses.map((bonus, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{bil(bonus.name)}</span>
                    <span className="text-xs text-gray-500 ms-2">{bil(bonus.description)}</span>
                  </div>
                  <span className="text-sm text-gray-400 line-through">
                    {formatQuotePrice(bonus.anchoredValue, quote.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guarantee */}
        <div className="px-6 py-4 border-t bg-green-50/50">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                {bil(quote.guarantee.label)}
                {quote.guarantee.duration && (
                  <span className="text-xs font-normal text-green-600 ms-2">
                    ({quote.guarantee.duration})
                  </span>
                )}
              </p>
              <p className="text-xs text-green-700 mt-1 leading-relaxed">
                {bil(quote.guarantee.script)}
              </p>
            </div>
          </div>
        </div>

        {/* Urgency */}
        {quote.urgencyBlock && (
          <div className="px-6 py-3 border-t bg-red-50/50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 leading-relaxed">
                {bil(quote.urgencyBlock)}
              </p>
            </div>
          </div>
        )}

        {/* Payment Terms */}
        {quote.paymentTerms && (
          <div className="px-6 py-3 border-t text-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              {isHe ? "תנאי תשלום" : "Payment Terms"}
            </p>
            <p className="text-gray-700">{quote.paymentTerms}</p>
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <div className="px-6 py-3 border-t text-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              {isHe ? "הערות" : "Notes"}
            </p>
            <p className="text-gray-700">{quote.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-400 text-center">
            {isHe
              ? `הצעה זו הופקה ב-FunnelForge · בתוקף עד ${validDate}`
              : `Generated by FunnelForge · Valid until ${validDate}`}
          </p>
        </div>
      </div>
    );
  },
);

QuotePreview.displayName = "QuotePreview";

export default QuotePreview;
