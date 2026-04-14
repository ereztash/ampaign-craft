import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useImportedData } from "@/hooks/useImportedData";
import DataImportModal from "@/components/DataImportModal";
import { getTrendColor, getDatasetHealthColor, chartColorPalette } from "@/lib/colorSemantics";
import { ImportedDataset, TrendAnalysis } from "@/types/importedData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tx } from "@/i18n/tx";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Upload, Trash2, TrendingUp, TrendingDown, Minus, FileSpreadsheet, Link } from "lucide-react";
import { toast } from "sonner";

interface DataAnalysisTabProps {
  savedPlanIds?: { id: string; name: string }[];
}

const DataAnalysisTab = ({ savedPlanIds = [] }: DataAnalysisTabProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { datasets, importDataset, deleteDataset, getAnalysis } = useImportedData();
  const [importOpen, setImportOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);
  const analysis = selectedDatasetId ? getAnalysis(selectedDatasetId) : null;

  const typeLabels: Record<string, { he: string; en: string }> = {
    campaign_performance: { he: "ביצועי קמפיינים", en: "Campaign Performance" },
    budget_tracking: { he: "מעקב תקציב", en: "Budget Tracking" },
    leads: { he: "לידים", en: "Leads" },
    content_performance: { he: "ביצועי תוכן", en: "Content Performance" },
    custom: { he: "מותאם אישית", en: "Custom" },
  };

  const directionIcon = (dir: "up" | "down" | "stable") => {
    if (dir === "up") return <TrendingUp className="h-4 w-4" />;
    if (dir === "down") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const summaryLabels = {
    improving: { he: "מגמה חיובית", en: "Improving" },
    declining: { he: "מגמה שלילית", en: "Declining" },
    stable: { he: "יציב", en: "Stable" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {tx({ he: "ניתוח נתונים", en: "Data Analysis" }, language)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tx({ he: "ייבא נתונים מקבצי Excel וקבל ניתוח מגמות", en: "Import Excel data and get trend analysis" }, language)}
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          {tx({ he: "ייבוא", en: "Import" }, language)}
        </Button>
      </div>

      {/* Dataset list */}
      {datasets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">
                {tx({ he: "אין נתונים מיובאים", en: "No imported data" }, language)}
              </p>
              <p className="text-sm text-muted-foreground">
                {tx({ he: "ייבא קובץ Excel כדי להתחיל", en: "Import an Excel file to get started" }, language)}
              </p>
            </div>
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              {tx({ he: "ייבא קובץ", en: "Import File" }, language)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {datasets.map((ds) => (
            <Card
              key={ds.id}
              className={`cursor-pointer transition-all ${
                selectedDatasetId === ds.id ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/30"
              }`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedDatasetId(ds.id === selectedDatasetId ? null : ds.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedDatasetId(ds.id === selectedDatasetId ? null : ds.id); } }}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <FileSpreadsheet className="h-8 w-8 text-primary/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{ds.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[ds.schema.detectedType]?.[language]}
                    </Badge>
                    <span>{ds.rows.length} {tx({ he: "שורות", en: "rows" }, language)}</span>
                    {ds.linkedPlanId && <Link className="h-3 w-3" />}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={tx({ he: `מחק את מערך הנתונים ${ds.name}`, en: `Delete dataset ${ds.name}` }, language)}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDataset(ds.id);
                    if (selectedDatasetId === ds.id) setSelectedDatasetId(null);
                    toast.success(tx({ he: "נמחק", en: "Deleted" }, language));
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trend Analysis */}
      {analysis && selectedDataset && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {tx({ he: "סיכום מגמות", en: "Trend Summary" }, language)}
                <Badge
                  className={`${
                    analysis.summary.direction === "improving"
                      ? "bg-accent/20 text-accent-foreground"
                      : analysis.summary.direction === "declining"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {summaryLabels[analysis.summary.direction][language]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.trends.map((trend) => {
                  const isPositiveUp = !trend.metric.toLowerCase().match(/cpc|cpl|cpa|cost|עלות/);
                  const colors = getTrendColor(trend.direction, isPositiveUp);
                  return (
                    <div key={trend.metric} className={`rounded-xl border p-4 ${colors.bg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{trend.metric}</span>
                        <div className={`flex items-center gap-1 ${colors.icon}`}>
                          {directionIcon(trend.direction)}
                          <span className="text-sm font-bold">
                            {trend.changePercent > 0 ? "+" : ""}{trend.changePercent}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{trend.insight[language]}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          {selectedDataset.schema.columns.some((c) => c.role === "date") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {tx({ he: "מגמות לאורך זמן", en: "Trends Over Time" }, language)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <figure aria-label={tx({ he: `גרף מגמות: ${selectedDataset.name}`, en: `Trends chart: ${selectedDataset.name}` }, language)}>
                  <figcaption className="sr-only">
                    {isHe
                      ? `גרף קווים המציג מגמות לאורך זמן עבור ${selectedDataset.name}. ${analysis!.summary.direction === "improving" ? "מגמה חיובית כוללת." : analysis!.summary.direction === "declining" ? "מגמה שלילית כוללת." : "מגמה יציבה כוללת."}`
                      : `Line chart showing trends over time for ${selectedDataset.name}. Overall ${analysis!.summary.direction} trend.`}
                  </figcaption>
                  <div aria-hidden="true">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={selectedDataset.rows.slice(0, 100)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey={selectedDataset.schema.columns.find((c) => c.role === "date")?.name}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => {
                            if (v instanceof Date) return v.toLocaleDateString();
                            if (typeof v === "string" && v.length > 10) return v.slice(0, 10);
                            return String(v);
                          }}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        {selectedDataset.schema.columns
                          .filter((c) => c.role === "metric")
                          .slice(0, 4)
                          .map((col, i) => (
                            <Line
                              key={col.name}
                              type="monotone"
                              dataKey={col.name}
                              stroke={chartColorPalette[i % chartColorPalette.length]}
                              strokeWidth={2}
                              dot={false}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Screen-reader text alternative for the line chart */}
                  <table className="sr-only">
                    <caption>{tx({ he: "נתוני מגמות", en: "Trend data" }, language)}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{tx({ he: "מדד", en: "Metric" }, language)}</th>
                        <th scope="col">{tx({ he: "שינוי", en: "Change" }, language)}</th>
                        <th scope="col">{tx({ he: "תובנה", en: "Insight" }, language)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis!.trends.map((trend) => (
                        <tr key={trend.metric}>
                          <td>{trend.metric}</td>
                          <td>{trend.changePercent > 0 ? "+" : ""}{trend.changePercent}%</td>
                          <td>{trend.insight[language]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </figure>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <DataImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importDataset}
        savedPlanIds={savedPlanIds}
      />
    </div>
  );
};

export default DataAnalysisTab;
