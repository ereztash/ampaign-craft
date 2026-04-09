import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database, FileSpreadsheet, Facebook, BarChart3,
  MessageCircle, Mail, UserCircle, Plug, Check, Clock, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DataSourceStatus = "connected" | "disconnected" | "syncing" | "error";

export interface DataSourceInfo {
  id: string;
  name: { he: string; en: string };
  description: { he: string; en: string };
  icon: React.ElementType;
  category: { he: string; en: string };
  status: DataSourceStatus;
  recordCount?: number;
  lastSync?: string;
  feeds: { he: string; en: string }[];
  onConnect?: () => void;
}

interface DataSourceCardProps {
  source: DataSourceInfo;
}

const STATUS_CONFIG: Record<DataSourceStatus, { color: string; bg: string; label: { he: string; en: string }; icon: React.ElementType }> = {
  connected: { color: "bg-accent", bg: "border-accent/30", label: { he: "מחובר", en: "Connected" }, icon: Check },
  disconnected: { color: "bg-muted-foreground/30", bg: "border-border", label: { he: "לא מחובר", en: "Not Connected" }, icon: Plug },
  syncing: { color: "bg-amber-500", bg: "border-amber-500/30", label: { he: "מסנכרן", en: "Syncing" }, icon: Clock },
  error: { color: "bg-destructive", bg: "border-destructive/30", label: { he: "שגיאה", en: "Error" }, icon: AlertCircle },
};

const DataSourceCard = ({ source }: DataSourceCardProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const config = STATUS_CONFIG[source.status];
  const Icon = source.icon;
  const StatusIcon = config.icon;

  return (
    <Card className={cn("border transition-all hover:shadow-md", config.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground" dir="auto">{source.name[language]}</h4>
              <p className="text-xs text-muted-foreground">{source.category[language]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("h-2 w-2 rounded-full", config.color)} />
            <span className="text-xs text-muted-foreground">{config.label[language]}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3" dir="auto">{source.description[language]}</p>

        {source.status === "connected" && (
          <div className="space-y-2 mb-3">
            {source.recordCount !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <Database className="h-3 w-3 text-muted-foreground" />
                <span>{source.recordCount.toLocaleString()} {isHe ? "רשומות" : "records"}</span>
              </div>
            )}
            {source.lastSync && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{isHe ? "סנכרון אחרון:" : "Last sync:"} {source.lastSync}</span>
              </div>
            )}
            {source.feeds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {source.feeds.map((feed, i) => (
                  <Badge key={i} variant="outline" className="text-xs h-5">{feed[language]}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {source.status === "disconnected" && source.onConnect && (
          <Button size="sm" className="w-full mt-1" onClick={source.onConnect}>
            <Plug className="h-3 w-3 me-1" />
            {isHe ? "חבר" : "Connect"}
          </Button>
        )}

        {source.status === "connected" && (
          <Button size="sm" variant="outline" className="w-full mt-1">
            {isHe ? "הגדרות" : "Settings"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DataSourceCard;
