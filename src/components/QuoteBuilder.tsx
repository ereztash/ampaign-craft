import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { tx } from "@/i18n/tx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Plus, Trash2, FileText, Check, Download, Link2 } from "lucide-react";
import type { FormData, FunnelResult } from "@/types/funnel";
import type { UserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import type { PricingIntelligenceResult, BilingualText } from "@/types/pricing";
import type {
  Quote,
  QuoteLineItem,
  QuoteRecipient,
  QuoteCurrency,
  QuoteDiscount,
} from "@/types/quote";
import { calculateQuoteTotal, formatQuotePrice } from "@/types/quote";
import { assembleQuote } from "@/engine/quoteAssemblyEngine";
import { generatePricingIntelligence } from "@/engine/pricingIntelligenceEngine";
import QuotePreview from "./QuotePreview";

interface QuoteBuilderProps {
  formData: FormData;
  graph: UserKnowledgeGraph;
  funnelResult: FunnelResult | null;
  onComplete: (quote: Quote) => void;
  onBack: () => void;
}

type Step = 1 | 2 | 3;

export default function QuoteBuilder({
  formData,
  graph,
  funnelResult,
  onComplete,
  onBack,
}: QuoteBuilderProps) {
  const { t, language } = useLanguage();
  const isHe = language === "he";

  const pricingResult = useMemo<PricingIntelligenceResult>(
    () => generatePricingIntelligence(formData, graph),
    [formData, graph],
  );

  const [step, setStep] = useState<Step>(1);
  const [selectedTierIndex, setSelectedTierIndex] = useState(
    pricingResult.tierStructure.highlightedTierIndex,
  );
  const [recipient, setRecipient] = useState<QuoteRecipient>({ name: "" });
  const [currency, setCurrency] = useState<QuoteCurrency>("ILS");

  const [quote, setQuote] = useState<Quote | null>(null);

  const handleGenerateQuote = useCallback(() => {
    const q = assembleQuote(formData, graph, funnelResult, {
      pricingResult,
      selectedTierIndex,
      recipient,
      currency,
    });
    setQuote(q);
    setStep(2);
  }, [formData, graph, funnelResult, pricingResult, selectedTierIndex, recipient, currency]);

  const updateLineItem = useCallback(
    (id: string, field: keyof QuoteLineItem, value: string | number) => {
      if (!quote) return;
      setQuote({
        ...quote,
        lineItems: quote.lineItems.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.total = updated.quantity * updated.unitPrice;
          }
          return updated;
        }),
      });
    },
    [quote],
  );

  const addLineItem = useCallback(() => {
    if (!quote) return;
    const newItem: QuoteLineItem = {
      id: `li-${Date.now()}`,
      name: { he: "", en: "" },
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setQuote({ ...quote, lineItems: [...quote.lineItems, newItem] });
  }, [quote]);

  const removeLineItem = useCallback(
    (id: string) => {
      if (!quote) return;
      setQuote({ ...quote, lineItems: quote.lineItems.filter((i) => i.id !== id) });
    },
    [quote],
  );

  const recalcTotals = useMemo(() => {
    if (!quote) return { subtotal: 0, total: 0 };
    return calculateQuoteTotal(quote.lineItems, quote.discount);
  }, [quote]);

  const bil = (t: BilingualText) => (tx(t, language));

  // ─── Step 1: Recipient + Tier ───
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" dir="auto">
          {tx({ he: "פרטי הלקוח", en: "Client Details" }, language)}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label dir="auto">{tx({ he: "שם הלקוח *", en: "Client Name *" }, language)}</Label>
            <Input
              value={recipient.name}
              onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
              placeholder={tx({ he: "ישראל ישראלי", en: "John Doe" }, language)}
              dir="auto"
            />
          </div>
          <div className="space-y-2">
            <Label dir="auto">{tx({ he: "חברה", en: "Company" }, language)}</Label>
            <Input
              value={recipient.company || ""}
              onChange={(e) => setRecipient({ ...recipient, company: e.target.value })}
              dir="auto"
            />
          </div>
          <div className="space-y-2">
            <Label dir="auto">{tx({ he: "אימייל", en: "Email" }, language)}</Label>
            <Input
              type="email"
              value={recipient.email || ""}
              onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label dir="auto">{tx({ he: "תפקיד", en: "Role" }, language)}</Label>
            <Input
              value={recipient.role || ""}
              onChange={(e) => setRecipient({ ...recipient, role: e.target.value })}
              dir="auto"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold" dir="auto">
          {tx({ he: "בחר חבילה", en: "Select Package" }, language)}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pricingResult.tierStructure.tiers.map((tier, idx) => (
            <Card
              key={idx}
              className={`cursor-pointer transition-all ${
                selectedTierIndex === idx
                  ? "ring-2 ring-primary shadow-lg"
                  : "hover:shadow-md opacity-80"
              }`}
              onClick={() => setSelectedTierIndex(idx)}
            >
              <CardHeader className="pb-2">
                {tier.isPrimary && (
                  <Badge className="w-fit mb-1">{tx({ he: "מומלץ", en: "Recommended" }, language)}</Badge>
                )}
                <CardTitle className="text-base" dir="auto">
                  {bil(tier.name)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {formatQuotePrice(tier.price, currency)}
                </div>
                <ul className="space-y-1">
                  {tier.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="text-xs text-muted-foreground" dir="auto">
                      <Check className="inline h-3 w-3 text-green-500 me-1" />
                      {bil(f)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label dir="auto">{tx({ he: "מטבע", en: "Currency" }, language)}</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as QuoteCurrency)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ILS">₪ ILS</SelectItem>
            <SelectItem value="USD">$ USD</SelectItem>
            <SelectItem value="EUR">€ EUR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowRight className="h-4 w-4 me-1" />
          {tx({ he: "חזרה", en: "Back" }, language)}
        </Button>
        <Button onClick={handleGenerateQuote} disabled={!recipient.name.trim()}>
          {tx({ he: "המשך", en: "Continue" }, language)}
          <ArrowLeft className="h-4 w-4 ms-1" />
        </Button>
      </div>
    </div>
  );

  // ─── Step 2: Customize ───
  const renderStep2 = () => {
    if (!quote) return null;
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold" dir="auto">
          {tx({ he: "התאמה אישית", en: "Customize Quote" }, language)}
        </h3>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label dir="auto" className="text-base font-medium">
              {tx({ he: "פריטים", en: "Line Items" }, language)}
            </Label>
            <Button size="sm" variant="outline" onClick={addLineItem}>
              <Plus className="h-4 w-4 me-1" />
              {tx({ he: "הוסף פריט", en: "Add Item" }, language)}
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-start" dir="auto">{tx({ he: "פריט", en: "Item" }, language)}</th>
                  <th className="p-2 w-20 text-center">{tx({ he: "כמות", en: "Qty" }, language)}</th>
                  <th className="p-2 w-28 text-center">{tx({ he: "מחיר", en: "Price" }, language)}</th>
                  <th className="p-2 w-28 text-center">{tx({ he: "סה״כ", en: "Total" }, language)}</th>
                  <th className="p-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">
                      <Input
                        value={bil(item.name)}
                        onChange={(e) =>
                          updateLineItem(item.id, "name", {
                            ...item.name,
                            [language]: e.target.value,
                          } as unknown as string)
                        }
                        className="h-8 text-sm"
                        dir="auto"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)
                        }
                        className="h-8 text-sm text-center"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-sm text-center"
                      />
                    </td>
                    <td className="p-2 text-center font-medium">
                      {formatQuotePrice(item.total, quote.currency)}
                    </td>
                    <td className="p-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => removeLineItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tx({ he: "סכום ביניים", en: "Subtotal" }, language)}</span>
                <span className="font-medium">{formatQuotePrice(recalcTotals.subtotal, quote.currency)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">{tx({ he: "הנחה", en: "Discount" }, language)}</span>
                <Select
                  value={quote.discount?.type || "percent"}
                  onValueChange={(v) =>
                    setQuote({
                      ...quote,
                      discount: { type: v as "percent" | "amount", value: quote.discount?.value || 0 },
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="amount">₪</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  className="h-7 w-20 text-xs text-center"
                  value={quote.discount?.value || 0}
                  onChange={(e) =>
                    setQuote({
                      ...quote,
                      discount: {
                        type: quote.discount?.type || "percent",
                        value: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>

              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">{tx({ he: "סה״כ", en: "Total" }, language)}</span>
                <span className="font-bold text-lg">
                  {formatQuotePrice(recalcTotals.total, quote.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bonuses */}
        <div className="space-y-2">
          <Label dir="auto" className="text-base font-medium">
            {tx({ he: "בונוסים", en: "Bonuses" }, language)}
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pricingResult.offerStack.bonuses.map((bonus, i) => {
              const isActive = quote.bonuses.some((b) => b.type === bonus.type);
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 cursor-pointer transition-all ${
                    isActive ? "border-primary bg-primary/5" : "opacity-60"
                  }`}
                  onClick={() => {
                    const newBonuses = isActive
                      ? quote.bonuses.filter((b) => b.type !== bonus.type)
                      : [...quote.bonuses, bonus];
                    setQuote({ ...quote, bonuses: newBonuses });
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" dir="auto">{bil(bonus.name)}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatQuotePrice(bonus.anchoredValue, quote.currency)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1" dir="auto">
                    {bil(bonus.description)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Terms & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label dir="auto">{tx({ he: "תנאי תשלום", en: "Payment Terms" }, language)}</Label>
            <Textarea
              value={quote.paymentTerms || ""}
              onChange={(e) => setQuote({ ...quote, paymentTerms: e.target.value })}
              placeholder={tx({ he: "לדוגמה: 50% מקדמה, 50% בסיום", en: "e.g. 50% upfront, 50% on completion" }, language)}
              rows={2}
              dir="auto"
            />
          </div>
          <div className="space-y-2">
            <Label dir="auto">{tx({ he: "הערות", en: "Notes" }, language)}</Label>
            <Textarea
              value={quote.notes || ""}
              onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
              rows={2}
              dir="auto"
            />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={() => setStep(1)}>
            <ArrowRight className="h-4 w-4 me-1" />
            {tx({ he: "חזרה", en: "Back" }, language)}
          </Button>
          <Button
            onClick={() => {
              setQuote({
                ...quote,
                subtotal: recalcTotals.subtotal,
                total: recalcTotals.total,
              });
              setStep(3);
            }}
          >
            {tx({ he: "תצוגה מקדימה", en: "Preview" }, language)}
            <ArrowLeft className="h-4 w-4 ms-1" />
          </Button>
        </div>
      </div>
    );
  };

  const handleExportPdf = async () => {
    const el = document.getElementById("quote-preview-root");
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true });
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let yOffset = 10;
    const pageHeight = pdf.internal.pageSize.getHeight() - 20;

    if (imgHeight <= pageHeight) {
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, yOffset, imgWidth, imgHeight);
    } else {
      let remainingHeight = imgHeight;
      while (remainingHeight > 0) {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, yOffset, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          yOffset = -imgHeight + remainingHeight + 10;
        }
      }
    }

    const recipientName = quote?.recipient.name || "quote";
    pdf.save(`${recipientName}-quote-${quote?.id || ""}.pdf`);
  };

  // ─── Step 3: Preview + Export ───
  const renderStep3 = () => {
    if (!quote) return null;
    const finalQuote: Quote = {
      ...quote,
      subtotal: recalcTotals.subtotal,
      total: recalcTotals.total,
    };
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-semibold" dir="auto">
            {tx({ he: "תצוגה מקדימה", en: "Preview" }, language)}
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              <ArrowRight className="h-4 w-4 me-1" />
              {tx({ he: "עריכה", en: "Edit" }, language)}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="h-4 w-4 me-1" />
              {tx({ he: "הורד PDF", en: "Download PDF" }, language)}
            </Button>
            <Button size="sm" onClick={() => onComplete(finalQuote)}>
              <FileText className="h-4 w-4 me-1" />
              {tx({ he: "סיום ושמירה", en: "Finish & Save" }, language)}
            </Button>
          </div>
        </div>
        <QuotePreview quote={finalQuote} language={language} />
      </div>
    );
  };

  // ─── Step Indicator ───
  const steps = [
    { num: 1, label: tx({ he: "לקוח וחבילה", en: "Client & Package" }, language) },
    { num: 2, label: tx({ he: "התאמה", en: "Customize" }, language) },
    { num: 3, label: tx({ he: "תצוגה", en: "Preview" }, language) },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                step >= s.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s.num}
            </div>
            <span
              className={`ms-2 text-sm hidden sm:inline ${
                step >= s.num ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-border mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </CardContent>
      </Card>
    </div>
  );
}
