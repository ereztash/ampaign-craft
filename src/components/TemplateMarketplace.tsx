import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTemplateMarketplace, PlanTemplate } from "@/hooks/useTemplateMarketplace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tx } from "@/i18n/tx";
import { ThumbsUp, Download, Store, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FIELD_LABELS: Record<string, { he: string; en: string }> = {
  fashion: { he: "אופנה", en: "Fashion" },
  tech: { he: "טכנולוגיה", en: "Tech" },
  food: { he: "מזון", en: "Food" },
  services: { he: "שירותים", en: "Services" },
  education: { he: "חינוך", en: "Education" },
  health: { he: "בריאות", en: "Health" },
  realEstate: { he: "נדל\"ן", en: "Real Estate" },
  tourism: { he: "תיירות", en: "Tourism" },
  personalBrand: { he: "מיתוג אישי", en: "Personal Brand" },
  other: { he: "אחר", en: "Other" },
};

const GOAL_LABELS: Record<string, { he: string; en: string }> = {
  awareness: { he: "מודעות", en: "Awareness" },
  leads: { he: "לידים", en: "Leads" },
  sales: { he: "מכירות", en: "Sales" },
  loyalty: { he: "נאמנות", en: "Loyalty" },
};

interface TemplateMarketplaceProps {
  onUseTemplate?: (formData: unknown) => void;
}

const TemplateMarketplace = ({ onUseTemplate }: TemplateMarketplaceProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { templates, loading, loadTemplates, upvoteTemplate, useTemplate: applyTemplate } = useTemplateMarketplace();
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");

  const filtered = templates.filter((t) => {
    if (fieldFilter !== "all" && t.businessField !== fieldFilter) return false;
    if (goalFilter !== "all" && t.mainGoal !== goalFilter) return false;
    return true;
  });

  const handleUse = async (template: PlanTemplate) => {
    const planData = await applyTemplate(template.id);
    if (planData && onUseTemplate) {
      onUseTemplate(planData);
      toast.success(tx({ he: "התבנית נטענה!", en: "Template loaded!" }, language));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {tx({ he: "שוק תבניות", en: "Template Marketplace" }, language)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tx({ he: "משפכים מוכנים לשימוש — פרסם או השתמש בתבנית של אחרים", en: "Ready-to-use funnels — publish or use others' templates" }, language)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex gap-3">
        <Select value={fieldFilter} onValueChange={setFieldFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder={tx({ he: "תחום", en: "Industry" }, language)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx({ he: "כל התחומים", en: "All Industries" }, language)}</SelectItem>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label[language]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={goalFilter} onValueChange={setGoalFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder={tx({ he: "מטרה", en: "Goal" }, language)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx({ he: "כל המטרות", en: "All Goals" }, language)}</SelectItem>
            {Object.entries(GOAL_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label[language]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Store className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {tx({ he: "אין תבניות עדיין — היה הראשון לפרסם!", en: "No templates yet — be the first to publish!" }, language)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((tmpl) => (
            <Card key={tmpl.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{tmpl.title}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className="text-xs">
                    {FIELD_LABELS[tmpl.businessField]?.[language] || tmpl.businessField}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {GOAL_LABELS[tmpl.mainGoal]?.[language] || tmpl.mainGoal}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{tmpl.budgetRange}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" /> {tmpl.upvotes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {tmpl.useCount}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => upvoteTemplate(tmpl.id)} className="h-7 text-xs">
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button size="sm" onClick={() => handleUse(tmpl)} className="h-7 text-xs gap-1">
                      <Download className="h-3 w-3" />
                      {tx({ he: "השתמש", en: "Use" }, language)}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateMarketplace;
