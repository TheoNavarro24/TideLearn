import { useEffect, useState } from "react";

export interface DeepLinkIntentResult {
  operations: string[];
  success: boolean;
}

export default function useDeepLinkIntents(): DeepLinkIntentResult | null {
  const [result, setResult] = useState<DeepLinkIntentResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intents = params.get("intents") || params.get("intent");
    if (!intents) return;
    try {
      const operations = intents
        .split(",")
        .map((s) => decodeURIComponent(s.trim()))
        .filter(Boolean);
      setResult({ operations, success: operations.length > 0 });

      // remove intents from the URL after processing
      params.delete("intents");
      params.delete("intent");
      const qs = params.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", url);
    } catch (e) {
      console.warn("Failed to process deep link intents", e);
    }
  }, []);

  return result;
}
