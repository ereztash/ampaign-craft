import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { DataSource } from "@/contexts/DataSourceContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import MetaConnect from "@/components/MetaConnect";
import { useDataSources } from "@/contexts/DataSourceContext";

interface DataSourceDetailProps {
  source: DataSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DataSourceDetail = ({ source, open, onOpenChange }: DataSourceDetailProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { setSourceStatus, setSourceRecords } = useDataSources();
  const meta = useMetaAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (source?.id === "meta" && meta.auth) {
      setSourceStatus("meta", "connected", new Date().toISOString());
      setSourceRecords("meta", Math.max(1, meta.accounts.length * 50));
    }
  }, [source?.id, meta.auth, meta.accounts.length, setSourceStatus, setSourceRecords]);

  const handleMetaDisconnect = () => {
    meta.disconnect();
    setSourceStatus("meta", "disconnected", null);
    setSelectedAccountId(null);
  };

  if (!source) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto" side={language === "he" ? "left" : "right"}>
        <SheetHeader>
          <SheetTitle dir="auto">{source.label[language]}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">{isHe ? "מזין את" : "Powers"}</p>
            <ul className="list-disc ps-4 space-y-1">
              {source.feeds.map((f, i) => (
                <li key={i} dir="auto">
                  {f[language]}
                </li>
              ))}
            </ul>
          </div>
          <Separator />
          {source.id === "meta" && (
            <MetaConnect
              connected={!!meta.auth}
              loading={meta.loading}
              error={meta.error}
              accounts={meta.accounts}
              selectedAccountId={selectedAccountId}
              onConnect={meta.connect}
              onDisconnect={handleMetaDisconnect}
              onSelectAccount={(id) => {
                setSelectedAccountId(id);
              }}
            />
          )}
          {source.id !== "meta" && (
            <p className="text-muted-foreground" dir="auto">
              {isHe ? "השתמש בכפתור חבר במסך הראשי לזרימת ההגדרה." : "Use Connect on the main Data Hub to start setup."}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DataSourceDetail;
