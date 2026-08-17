import { useCallback, useEffect, useState } from "react";

import { describeApiError, type FriendlyError } from "@/lib/api/errors";

export type ResourceStatus = "loading" | "ready" | "empty" | "error";

export type ApiResource<T> = {
  data: T | null;
  status: ResourceStatus;
  error: FriendlyError | null;
  /** Horodatage local de la dernière réponse réussie. */
  lastUpdated: Date | null;
  isLoading: boolean;
  reload: () => void;
  /** Mise à jour optimiste locale (après une mutation confirmée par l'API). */
  setData: (updater: (current: T | null) => T | null) => void;
};

/**
 * Chargement standard d'une ressource backend : loading / ready / empty / error,
 * annulation à la sortie et rechargement manuel. Aucune donnée de repli n'est
 * inventée : en cas d'échec, `data` reste `null`.
 */
export function useApiResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
  options: { isEmpty?: (data: T) => boolean; enabled?: boolean } = {},
): ApiResource<T> {
  const enabled = options.enabled !== false;
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [status, setStatus] = useState<ResourceStatus>(enabled ? "loading" : "empty");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const isEmpty = options.isEmpty;

  useEffect(() => {
    if (!enabled) {
      setStatus("empty");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setError(null);

    fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDataState(result);
        setLastUpdated(new Date());
        const empty = isEmpty
          ? isEmpty(result)
          : Array.isArray(result)
            ? result.length === 0
            : result == null;
        setStatus(empty ? "empty" : "ready");
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setDataState(null);
        setError(describeApiError(e));
        setStatus("error");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, enabled, ...deps]);

  const setData = useCallback((updater: (current: T | null) => T | null) => {
    setDataState((current) => {
      const next = updater(current);
      setStatus(
        next == null || (Array.isArray(next) && next.length === 0) ? "empty" : "ready",
      );
      return next;
    });
  }, []);

  return {
    data,
    status,
    error,
    lastUpdated,
    isLoading: status === "loading",
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
    setData,
  };
}
