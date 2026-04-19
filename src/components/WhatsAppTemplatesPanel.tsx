import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getWhatsAppTemplates, getWhatsAppCostEstimate, WhatsAppTemplate } from "@/lib/whatsappTemplates";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import PaywallModal from "@/components/PaywallModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tx } from "@/i18n/tx";
import { Copy, Check, MessageCircle, Calculator, Lock } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppTemplatesPanelProps {
  monthlyConversations?: number;
}

const WhatsAppTemplatesPanel = ({ monthlyConversations = 500 }: WhatsAppTemplatesPanelProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { canUse, checkAccess, paywallOpen, setPaywallOpen, paywallFeature, paywallTier } = useFeatureGate();
  const templates = getWhatsAppTemplates();
  const costEstimate = getWhatsAppCostEstimate(monthlyConversations);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTemplate = (template: WhatsAppTemplate) => {
    if (!checkAccess("whatsappTemplates", "business")) return;
    navigator.clipboard.writeText(template.template[language]);
    setCopiedId(template.stage);
    toast.success(tx({ he: "התבנית הועתקה!", en: "Template copied!" }, language));
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
    <Card className="mt-4 border-green-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircle className="h-4 w-4 text-green-500" />
          {tx({ he: "תבניות WhatsApp מוכנות לשימוש", en: "Ready-to-Use WhatsApp Templates" }, language)}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {tx({ he: "6 תבניות הודעות בעברית לכל שלב במשפך. העתק והדבק ב-WhatsApp Business", en: "6 Hebrew message templates for every funnel stage. Copy and paste to WhatsApp Business" }, language)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.map((tmpl) => (
          <div key={tmpl.stage} className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{tmpl.emoji}</span>
                <span className="text-sm font-medium text-foreground">{tmpl.stageName[language]}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyTemplate(tmpl)}
                className="h-7 gap-1 text-xs"
              >
                {copiedId === tmpl.stage ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedId === tmpl.stage ? (tx({ he: "הועתק", en: "Copied" }, language)) : (tx({ he: "העתק", en: "Copy" }, language))}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{tmpl.purpose[language]}</p>
            <pre className="text-xs bg-muted/30 rounded p-2 whitespace-pre-wrap font-sans" dir="auto">
              {tmpl.template[language]}
            </pre>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{tmpl.timing[language]}</Badge>
            </div>
          </div>
        ))}

        {/* Cost Estimate */}
        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-medium text-foreground">
              {tx({ he: `הערכת עלות ל-${monthlyConversations} שיחות/חודש`, en: `Cost estimate for ${monthlyConversations} conversations/month` }, language)}
            </span>
          </div>
          <div className="text-sm font-bold text-green-600">{costEstimate.total[language]}</div>
        </div>
      </CardContent>
    </Card>
    <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} feature={paywallFeature} requiredTier={paywallTier} />
    </>
  );
};

export default WhatsAppTemplatesPanel;
