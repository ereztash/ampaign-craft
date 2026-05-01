import { cn } from "@/lib/utils";

interface SectionInsightBannerProps {
  type: "critical" | "opportunity" | "win" | "tip";
  headline: string;
  body: string;
  metric?: string;
  className?: string;
}

const TYPE_STYLES: Record<SectionInsightBannerProps["type"], string> = {
  critical: "border-destructive bg-destructive/5",
  opportunity: "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
  win: "border-accent bg-accent/5",
  tip: "border-primary bg-primary/5",
};

export function SectionInsightBanner({ type, headline, body, metric, className }: SectionInsightBannerProps) {
  return (
    <div className={cn("border-s-4 p-3 rounded-lg text-sm mb-4", TYPE_STYLES[type], className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground leading-snug" dir="auto">{headline}</p>
        {metric && (
          <span className="shrink-0 rounded-full bg-background/60 px-2 py-0.5 text-xs font-mono">
            {metric}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed" dir="auto">{body}</p>
    </div>
  );
}

export default SectionInsightBanner;
