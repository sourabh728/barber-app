import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { isAxiosError } from "axios";

import { api, clearApiAccessToken, setApiAccessToken } from "@/services/api";
import { type SessionUser } from "@/services/auth-api";
import { useStorageState } from "@/hooks/use-storage-state";

const SESSION_STORAGE_KEY = "accessToken";

const SessionContext = createContext<{
  signIn: (accessToken: string, user: SessionUser) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: SessionUser) => void;
  session?: string | null;
  user: SessionUser | null;
  isLoading: boolean;
} | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error("useSession must be wrapped in a <SessionProvider />");
  }

  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  // Do not auto-restore JWT on launch — reload always shows login.
  // signIn still persists for the in-memory session until the next reload.
  const [[isLoadingStorage, session], setSession] = useStorageState(
    SESSION_STORAGE_KEY,
    { restore: false },
  );
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const didValidate = useRef(false);

  useEffect(() => {
    if (isLoadingStorage) {
      return;
    }

    if (didValidate.current) {
      setIsValidating(false);
      return;
    }

    didValidate.current = true;

    // Session is never restored from storage on launch (see restore: false).
    // Keep this path for a clean API token / user reset before login.
    clearApiAccessToken();
    setUser(null);
    setIsValidating(false);
  }, [isLoadingStorage]);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isAxiosError(error) && error.response?.status === 401) {
          const url = error.config?.url ?? "";
          const isAuthAttempt =
            url.includes("/auth/login") ||
            url.includes("/auth/google") ||
            url.includes("/auth/register");

          if (!isAuthAttempt && session) {
            clearApiAccessToken();
            setUser(null);
            setSession(null);
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [session, setSession]);

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading: isLoadingStorage || isValidating,
      signIn: async (accessToken: string, nextUser: SessionUser) => {
        setApiAccessToken(accessToken);
        setUser(nextUser);
        setSession(accessToken);
      },
      signOut: async () => {
        clearApiAccessToken();
        setUser(null);
        setSession(null);
      },
      updateUser: (nextUser: SessionUser) => {
        setUser(nextUser);
      },
    }),
    [isLoadingStorage, isValidating, session, setSession, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
