import { useState, useCallback, useEffect } from "react";
import { ImportedDataset, TrendAnalysis } from "@/types/importedData";
import { analyzeTrends } from "@/engine/dataImportEngine";
import { safeStorage } from "@/lib/safeStorage";

const STORAGE_KEY = "funnelforge-imported-data";
const MAX_DATASETS = 10;

function loadDatasets(): ImportedDataset[] {
  return safeStorage.getJSON<ImportedDataset[]>(STORAGE_KEY, []);
}

function saveDatasets(datasets: ImportedDataset[]) {
  safeStorage.setJSON(STORAGE_KEY, datasets);
}

export function useImportedData() {
  const [datasets, setDatasets] = useState<ImportedDataset[]>([]);
  const [analysisCache, setAnalysisCache] = useState<Map<string, TrendAnalysis>>(new Map());

  useEffect(() => {
    setDatasets(loadDatasets());
  }, []);

  const importDataset = useCallback((dataset: ImportedDataset) => {
    setDatasets((prev) => {
      const updated = [dataset, ...prev].slice(0, MAX_DATASETS);
      saveDatasets(updated);
      return updated;
    });
  }, []);

  const deleteDataset = useCallback((id: string) => {
    setDatasets((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      saveDatasets(updated);
      return updated;
    });
    setAnalysisCache((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getAnalysis = useCallback(
    (datasetId: string): TrendAnalysis | null => {
      // Check cache
      if (analysisCache.has(datasetId)) {
        return analysisCache.get(datasetId)!;
      }

      const dataset = datasets.find((d) => d.id === datasetId);
      if (!dataset) return null;

      const analysis = analyzeTrends(dataset);
      setAnalysisCache((prev) => new Map(prev).set(datasetId, analysis));
      return analysis;
    },
    [datasets, analysisCache]
  );

  const linkDatasetToPlan = useCallback((datasetId: string, planId: string) => {
    setDatasets((prev) => {
      const updated = prev.map((d) =>
        d.id === datasetId ? { ...d, linkedPlanId: planId } : d
      );
      saveDatasets(updated);
      return updated;
    });
  }, []);

  return {
    datasets,
    importDataset,
    deleteDataset,
    getAnalysis,
    linkDatasetToPlan,
  };
}
