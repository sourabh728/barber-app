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
import {
  fetchCurrentUser,
  sessionUserFromMe,
  type SessionUser,
} from "@/services/auth-api";
import { useStorageState } from "@/hooks/use-storage-state";

const SESSION_STORAGE_KEY = "accessToken";
const USER_STORAGE_KEY = "sessionUser";

const SessionContext = createContext<{
  signIn: (accessToken: string, user: SessionUser) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: SessionUser) => void;
  session?: string | null;
  user: SessionUser | null;
  isLoading: boolean;
} | null>(null);

function parseStoredUser(raw: string | null): SessionUser | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (
      typeof parsed?.id === "string" &&
      typeof parsed?.email === "string" &&
      (parsed.role === "CUSTOMER" ||
        parsed.role === "BARBER" ||
        parsed.role === "ADMIN")
    ) {
      return parsed;
    }
  } catch {
    // Ignore corrupt storage.
  }

  return null;
}

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error("useSession must be wrapped in a <SessionProvider />");
  }

  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoadingStorage, session], setSession] = useStorageState(
    SESSION_STORAGE_KEY,
  );
  const [[isLoadingUser, storedUserJson], setStoredUserJson] = useStorageState(
    USER_STORAGE_KEY,
  );
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const didValidate = useRef(false);

  useEffect(() => {
    if (isLoadingStorage || isLoadingUser) {
      return;
    }

    if (didValidate.current) {
      setIsValidating(false);
      return;
    }

    didValidate.current = true;

    async function restoreSession() {
      if (!session) {
        clearApiAccessToken();
        setUser(null);
        setStoredUserJson(null);
        setIsValidating(false);
        return;
      }

      setApiAccessToken(session);
      const cachedUser = parseStoredUser(storedUserJson);
      if (cachedUser) {
        setUser(cachedUser);
      }

      try {
        const me = await fetchCurrentUser();
        const nextUser = sessionUserFromMe(me);
        setUser(nextUser);
        setStoredUserJson(JSON.stringify(nextUser));
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          clearApiAccessToken();
          setUser(null);
          setSession(null);
          setStoredUserJson(null);
        }
        // Network/server errors: keep the stored token (and cached user if any)
        // so the same device stays signed in.
      } finally {
        setIsValidating(false);
      }
    }

    void restoreSession();
  }, [
    isLoadingStorage,
    isLoadingUser,
    session,
    setSession,
    setStoredUserJson,
    storedUserJson,
  ]);

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
            setStoredUserJson(null);
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [session, setSession, setStoredUserJson]);

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading: isLoadingStorage || isLoadingUser || isValidating,
      signIn: async (accessToken: string, nextUser: SessionUser) => {
        setApiAccessToken(accessToken);
        setUser(nextUser);
        setSession(accessToken);
        setStoredUserJson(JSON.stringify(nextUser));
      },
      signOut: async () => {
        clearApiAccessToken();
        setUser(null);
        setSession(null);
        setStoredUserJson(null);
      },
      updateUser: (nextUser: SessionUser) => {
        setUser(nextUser);
        setStoredUserJson(JSON.stringify(nextUser));
      },
    }),
    [
      isLoadingStorage,
      isLoadingUser,
      isValidating,
      session,
      setSession,
      setStoredUserJson,
      user,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
