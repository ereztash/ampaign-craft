import { useLanguage } from "@/i18n/LanguageContext";
import type { DataSource, DataSourceStatus } from "@/contexts/DataSourceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tx } from "@/i18n/tx";
import { Database, RefreshCw } from "lucide-react";

const statusDot: Record<DataSourceStatus, string> = {
  connected: "bg-emerald-500",
  disconnected: "bg-muted-foreground/40",
  syncing: "bg-amber-500 animate-pulse",
  error: "bg-destructive",
};

interface DataSourceCardProps {
  source: DataSource;
  onOpen: () => void;
  onConnect: () => void;
}

const DataSourceCard = ({ source, onOpen, onConnect }: DataSourceCardProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        <button type="button" onClick={onOpen} className="text-start flex-1 space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary shrink-0" />
            <span className={cn("h-2 w-2 rounded-full shrink-0", statusDot[source.status])} title={source.status} />
            <span className="font-semibold text-sm truncate" dir="auto">
              {source.label[language]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground" dir="auto">
            {source.lastSync
              ? `${tx({ he: "סנכרון אחרון", en: "Last sync" }, language)}: ${new Date(source.lastSync).toLocaleString(tx({ he: "he-IL", en: "en-US" }, language))}`
              : isHe
                ? "לא חובר"
                : "Not connected"}
          </p>
          <p className="text-xs text-muted-foreground">
            {source.recordCount.toLocaleString()} {tx({ he: "רשומות", en: "records" }, language)}
          </p>
        </button>
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onConnect()}>
            {source.status === "connected" ? (tx({ he: "הגדרות", en: "Configure" }, language)) : tx({ he: "חבר", en: "Connect" }, language)}
          </Button>
          {source.status === "connected" && (
            <Button size="sm" variant="ghost" className="px-2" aria-label={tx({ he: "סנכרון", en: "Sync" }, language)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataSourceCard;
