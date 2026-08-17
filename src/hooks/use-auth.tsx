import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clearAuthStorage,
  hasAuthToken,
  persistAuthToken,
  readAuthToken,
} from "@/lib/auth-session";

type AuthContextValue = {
  /** JWT courant (null si absent). Initialisé de façon synchrone depuis localStorage. */
  token: string | null;
  /** true une fois le montage client terminé (hydratation OK). */
  ready: boolean;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth synchrone : le token est lu dans l'initializer de useState,
 * jamais dans un useEffect — critique pour survivre au F5 / SSR hydrate.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => readAuthToken());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Re-sync après hydrate (au cas où le SSR snapshot était null).
    const stored = readAuthToken();
    if (stored && stored !== token) {
      setTokenState(stored);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync one-shot au mount
  }, []);

  const setToken = useCallback((next: string | null) => {
    if (next) {
      persistAuthToken(next);
      setTokenState(next);
    } else {
      clearAuthStorage();
      setTokenState(null);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setTokenState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      ready,
      // Toujours préférer le storage si l'état React serait encore null pendant l'hydrate.
      isAuthenticated: Boolean(token) || hasAuthToken(),
      setToken,
      logout,
    }),
    [token, ready, setToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Fallback sûr hors provider : lecture synchrone storage uniquement.
    const token = readAuthToken();
    return {
      token,
      ready: typeof window !== "undefined",
      isAuthenticated: Boolean(token),
      setToken: (next) => {
        if (next) persistAuthToken(next);
        else clearAuthStorage();
      },
      logout: () => clearAuthStorage(),
    };
  }
  return ctx;
}
