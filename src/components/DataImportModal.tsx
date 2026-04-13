import { useState, useCallback, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { ImportedDataset, DatasetSchema } from "@/types/importedData";
import { parseXlsxFile, detectSchema, validateDataset } from "@/engine/dataImportEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

interface DataImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (dataset: ImportedDataset) => void;
  savedPlanIds?: { id: string; name: string }[];
}

type ImportStep = "upload" | "preview" | "confirm";

const DataImportModal = ({ open, onOpenChange, onImport, savedPlanIds = [] }: DataImportModalProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [schema, setSchema] = useState<DatasetSchema | null>(null);
  const [linkedPlanId, setLinkedPlanId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep("upload");
    setFileName("");
    setRows([]);
    setSchema(null);
    setLinkedPlanId("");
    setLoading(false);
  };

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const sheets = await parseXlsxFile(file);
      if (sheets.length === 0 || sheets[0].rows.length === 0) {
        toast.error(isHe ? "הקובץ ריק" : "File is empty");
        setLoading(false);
        return;
      }

      const firstSheet = sheets[0];
      const detectedSchema = detectSchema(firstSheet.rows);
      const validation = validateDataset(firstSheet.rows, detectedSchema);

      if (!validation.valid) {
        toast.error(validation.errors.join(", "));
        setLoading(false);
        return;
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach((w) => toast.warning(w));
      }

      setFileName(file.name);
      setRows(firstSheet.rows);
      setSchema(detectedSchema);
      setStep("preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        isHe
          ? `שגיאה בקריאת הקובץ: ${msg}`
          : `Error reading file: ${msg}`,
      );
    }
    setLoading(false);
  }, [isHe]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = () => {
    if (!schema) return;

    const dataset: ImportedDataset = {
      id: crypto.randomUUID(),
      name: fileName,
      importedAt: new Date().toISOString(),
      source: fileName.endsWith(".csv") ? "csv" : "xlsx",
      schema,
      rows,
      linkedPlanId: linkedPlanId || undefined,
    };

    onImport(dataset);
    toast.success(isHe ? "הנתונים יובאו בהצלחה" : "Data imported successfully");
    reset();
    onOpenChange(false);
  };

  const typeLabels: Record<string, { he: string; en: string }> = {
    campaign_performance: { he: "ביצועי קמפיינים", en: "Campaign Performance" },
    budget_tracking: { he: "מעקב תקציב", en: "Budget Tracking" },
    leads: { he: "לידים", en: "Leads" },
    content_performance: { he: "ביצועי תוכן", en: "Content Performance" },
    custom: { he: "מותאם אישית", en: "Custom" },
  };

  const roleLabels: Record<string, { he: string; en: string }> = {
    date: { he: "תאריך", en: "Date" },
    metric: { he: "מדד", en: "Metric" },
    dimension: { he: "מימד", en: "Dimension" },
    identifier: { he: "מזהה", en: "ID" },
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {isHe ? "ייבוא נתונים" : "Import Data"}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center transition-colors hover:border-primary/50"
          >
            <Upload className="h-12 w-12 text-primary/50" />
            <div>
              <p className="font-semibold text-foreground">
                {isHe ? "גרור קובץ לכאן או לחץ לבחירה" : "Drag a file here or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHe ? "תומך ב-.xlsx ו-.csv" : "Supports .xlsx and .csv"}
              </p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} disabled={loading}>
              {loading
                ? (isHe ? "מעבד..." : "Processing...")
                : (isHe ? "בחר קובץ" : "Choose File")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.xls"
              onChange={handleFileInput}
              className="hidden"
              aria-label={isHe ? "העלאת קובץ נתונים" : "Upload data file"}
            />
          </div>
        )}

        {step === "preview" && schema && (
          <div className="space-y-4">
            {/* Detected type */}
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              <span className="text-sm text-foreground">
                {isHe ? "סוג שזוהה:" : "Detected type:"}
              </span>
              <Badge variant="secondary">
                {typeLabels[schema.detectedType]?.[language] || schema.detectedType}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({rows.length} {isHe ? "שורות" : "rows"})
              </span>
            </div>

            {/* Column schema */}
            <div className="text-sm font-medium text-foreground">
              {isHe ? "עמודות שזוהו:" : "Detected columns:"}
            </div>
            <div className="flex flex-wrap gap-2">
              {schema.columns.map((col) => (
                <Badge key={col.name} variant="outline" className="gap-1">
                  <span>{col.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({roleLabels[col.role || "dimension"]?.[language]})
                  </span>
                </Badge>
              ))}
            </div>

            {/* Preview table */}
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {schema.columns.slice(0, 6).map((col) => (
                      <TableHead key={col.name} className="text-xs whitespace-nowrap">
                        {col.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {schema.columns.slice(0, 6).map((col) => (
                        <TableCell key={col.name} className="text-xs whitespace-nowrap">
                          {String(row[col.name] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Link to plan */}
            {savedPlanIds.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {isHe ? "קשר לתוכנית (אופציונלי):" : "Link to plan (optional):"}
                </label>
                <Select value={linkedPlanId} onValueChange={setLinkedPlanId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isHe ? "בחר תוכנית..." : "Select a plan..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {savedPlanIds.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>
                {isHe ? "חזרה" : "Back"}
              </Button>
              <Button onClick={handleImport}>
                {isHe ? "ייבא נתונים" : "Import Data"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataImportModal;
