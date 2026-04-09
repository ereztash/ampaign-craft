import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Language } from "@/i18n/translations";

export type InsightVariant = "bottleneck" | "opportunity" | "module" | "pulse";

interface InsightCardProps {
  language: Language;
  variant: InsightVariant;
  title: string;
  description: string;
  onClick?: () => void;
}

const variantStyles: Record<InsightVariant, string> = {
  bottleneck: "border-destructive/40 bg-destructive/5 hover:bg-destructive/10",
  opportunity: "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10",
  module: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10",
  pulse: "border-primary/30 bg-primary/5 hover:bg-primary/10",
};

const InsightCard = ({ language, variant, title, description, onClick }: InsightCardProps) => {
  const interactive = !!onClick;

  return (
    <Card
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn("transition-colors", variantStyles[variant], interactive && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring")}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {variant === "bottleneck" && (language === "he" ? "צוואר בקבוק" : "Bottleneck")}
          {variant === "opportunity" && (language === "he" ? "הזדמנות" : "Opportunity")}
          {variant === "module" && (language === "he" ? "המלצת מודול" : "Module tip")}
          {variant === "pulse" && (language === "he" ? "פולס שבועי" : "Weekly pulse")}
        </p>
        <h3 className="font-bold text-foreground text-sm mb-1" dir="auto">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-3" dir="auto">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};

export default InsightCard;
