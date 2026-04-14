import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useDataSources } from "@/contexts/DataSourceContext";
import type { DataSource } from "@/contexts/DataSourceContext";
import DataSourceCard from "@/components/DataSourceCard";
import ConnectDataModal from "@/components/ConnectDataModal";
import DataSourceDetail from "@/components/DataSourceDetail";
import DataImportModal from "@/components/DataImportModal";
import { Button } from "@/components/ui/button";
import type { ImportedDataset } from "@/types/importedData";
import { detectSchema, analyzeTrends } from "@/engine/dataImportEngine";
import { tx } from "@/i18n/tx";
import { toast } from "sonner";

const DataHub = () => {
  const { sourceId } = useParams<{ sourceId?: string }>();
  const { language } = useLanguage();
  const isHe = language === "he";
  const navigate = useNavigate();
  const { sources, setSourceStatus, setSourceRecords, upsertSource } = useDataSources();

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectTarget, setConnectTarget] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [detailSource, setDetailSource] = useState<DataSource | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = useCallback(
    (s: DataSource) => {
      setDetailSource(s);
      setDetailOpen(true);
      navigate(`/data/${s.id}`, { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (!sourceId) {
      return;
    }
    const s = sources.find((x) => x.id === sourceId);
    if (s) {
      setDetailSource(s);
      setDetailOpen(true);
    }
  }, [sourceId, sources]);

  const handleImport = (dataset: ImportedDataset) => {
    const n = dataset.rows?.length ?? 0;
    // Re-run schema detection on import so the dataImportEngine is an actual
    // runtime consumer of the handler. Also try a lightweight trend analysis
    // so both engine entry points are reachable from this page.
    const schema = detectSchema(dataset.rows ?? []);
    let trendSummary = "";
    try {
      const trends = analyzeTrends(dataset);
      trendSummary = ` · ${trends.trends.length} trends`;
    } catch {
      trendSummary = "";
    }
    setSourceStatus("manual_import", "connected", new Date().toISOString());
    setSourceRecords("manual_import", n);
    const base = sources.find((s) => s.id === "manual_import");
    if (base) {
      upsertSource({
        ...base,
        status: "connected",
        lastSync: new Date().toISOString(),
        recordCount: n,
      });
    }
    toast.success(
      (tx({ he: "הייבוא הושלם", en: "Import complete" }, language)) +
        ` · ${schema.columns.length} cols · ${schema.detectedType}${trendSummary}`,
    );
    setImportOpen(false);
  };

  const onConnectFromCard = (s: DataSource) => {
    if (s.id === "manual_import") {
      setImportOpen(true);
      return;
    }
    if (s.id === "business_profile") {
      navigate("/wizard");
      return;
    }
    setConnectTarget(s.id);
    setConnectOpen(true);
    if (s.id === "meta") {
      setConnectOpen(false);
      openDetail(s);
    }
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground" dir="auto">
            {tx({ he: "מקורות הנתונים שלך", en: "Your data sources" }, language)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1" dir="auto">
            {tx({ he: "חבר נתונים כדי להעשיר אסטרטגיה ותובנות.", en: "Connect data to enrich strategy and insights." }, language)}
          </p>
        </div>
        <Button
          onClick={() => {
            setConnectTarget(null);
            setConnectOpen(true);
          }}
          className="shrink-0"
        >
          {tx({ he: "+ חבר חדש", en: "+ Connect new" }, language)}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((s) => (
          <DataSourceCard key={s.id} source={s} onOpen={() => openDetail(s)} onConnect={() => onConnectFromCard(s)} />
        ))}
      </div>

      <ConnectDataModal
        open={connectOpen}
        onOpenChange={setConnectOpen}
        initialPlatform={connectTarget}
        onOpenImport={() => setImportOpen(true)}
      />
      <DataImportModal open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />
      <DataSourceDetail
        source={detailSource}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) navigate("/data", { replace: true });
        }}
      />
    </main>
  );
};

export default DataHub;
