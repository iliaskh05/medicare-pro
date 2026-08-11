import { useCallback, useRef, useState } from "react";

/**
 * Gestion d'état asynchrone standard du projet : `isLoading`, `data`, `error`.
 * Remplace les anciennes anciens `setTimeout` : le spinner s'affiche
 * pendant la durée réelle de la requête HTTP.
 */
export function useAsyncAction<TResult, TArgs extends unknown[] = []>(
  action: (...args: TArgs) => Promise<TResult>,
  options: { onSuccess?: (data: TResult) => void; onError?: (error: Error) => void } = {},
) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef(false);
  const cb = useRef(options);
  cb.current = options;

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const result = await action(...args);
        setData(result);
        cb.current.onSuccess?.(result);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Erreur inattendue");
        setError(err);
        cb.current.onError?.(err);
        return null;
      } finally {
        inFlight.current = false;
        setIsLoading(false);
      }
    },
    [action],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { run, isLoading, data, error, reset };
}
