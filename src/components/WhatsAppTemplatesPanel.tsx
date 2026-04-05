import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getWhatsAppTemplates, getWhatsAppCostEstimate, WhatsAppTemplate } from "@/lib/whatsappTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, MessageCircle, Calculator } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppTemplatesPanelProps {
  monthlyConversations?: number;
}

const WhatsAppTemplatesPanel = ({ monthlyConversations = 500 }: WhatsAppTemplatesPanelProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const templates = getWhatsAppTemplates();
  const costEstimate = getWhatsAppCostEstimate(monthlyConversations);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTemplate = (template: WhatsAppTemplate) => {
    navigator.clipboard.writeText(template.template[language]);
    setCopiedId(template.stage);
    toast.success(isHe ? "התבנית הועתקה!" : "Template copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="mt-4 border-green-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircle className="h-4 w-4 text-green-500" />
          {isHe ? "תבניות WhatsApp מוכנות לשימוש" : "Ready-to-Use WhatsApp Templates"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isHe ? "6 תבניות הודעות בעברית לכל שלב במשפך — העתק והדבק ב-WhatsApp Business" : "6 Hebrew message templates for every funnel stage — copy and paste to WhatsApp Business"}
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
                {copiedId === tmpl.stage ? (isHe ? "הועתק" : "Copied") : (isHe ? "העתק" : "Copy")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{tmpl.purpose[language]}</p>
            <pre className="text-xs bg-muted/30 rounded p-2 whitespace-pre-wrap font-sans" dir="auto">
              {tmpl.template[language]}
            </pre>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{tmpl.timing[language]}</Badge>
            </div>
          </div>
        ))}

        {/* Cost Estimate */}
        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-medium text-foreground">
              {isHe ? `הערכת עלות ל-${monthlyConversations} שיחות/חודש` : `Cost estimate for ${monthlyConversations} conversations/month`}
            </span>
          </div>
          <div className="text-sm font-bold text-green-600">{costEstimate.total[language]}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppTemplatesPanel;
