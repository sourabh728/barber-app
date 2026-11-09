import { createContext, useContext, useState, type ReactNode } from "react";

import type { GoogleIdentity } from "@/hooks/use-google-identity";

type PendingGoogleIdentityContext = {
  pendingIdentity: GoogleIdentity | null;
  setPendingIdentity: (identity: GoogleIdentity | null) => void;
};

const Context = createContext<PendingGoogleIdentityContext | null>(null);

export function PendingGoogleIdentityProvider({ children }: { children: ReactNode }) {
  const [pendingIdentity, setPendingIdentity] = useState<GoogleIdentity | null>(null);

  return (
    <Context.Provider value={{ pendingIdentity, setPendingIdentity }}>
      {children}
    </Context.Provider>
  );
}

export function usePendingGoogleIdentity() {
  const context = useContext(Context);
  if (!context) {
    throw new Error("PendingGoogleIdentityProvider is missing.");
  }
  return context;
}
