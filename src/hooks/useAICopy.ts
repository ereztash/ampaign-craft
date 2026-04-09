import { useState } from "react";
import { generateCopy, type CopyGenerationRequest, type CopyGenerationResult } from "@/services/aiCopyService";

export function useAICopy() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CopyGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (request: CopyGenerationRequest) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await generateCopy(request);
      setResult(res);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { generate, isGenerating, result, error, reset };
}
