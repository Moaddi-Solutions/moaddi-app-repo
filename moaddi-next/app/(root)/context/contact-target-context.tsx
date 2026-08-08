"use client";

import { getRequest } from "@/../services/events";
import { chatSupportTargetAPI } from "@/../services/serverAddresses";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type ContactKind =
  | "support"
  | "machine-vendor"
  | "shop-owner"
  | "vendor";

export type ContactTarget = {
  kind: ContactKind;
  targetUserId: string | null;
  resourceId?: string | null;
  isPending?: boolean;
};

type ContactTargetContextValue = {
  target: ContactTarget;
  setPageTarget: (target: ContactTarget | null) => void;
};

export type SupportAudience = "customers" | "vendors";

const DEFAULT_SUPPORT_TARGET: ContactTarget = {
  kind: "support",
  targetUserId: null,
};

const cachedSupportUserId: Record<SupportAudience, string | null> = {
  customers: null,
  vendors: null,
};
const fetchStarted: Record<SupportAudience, boolean> = {
  customers: false,
  vendors: false,
};
const supportUserIdListeners: Record<SupportAudience, Set<() => void>> = {
  customers: new Set(),
  vendors: new Set(),
};

const setCachedSupportUserId = (audience: SupportAudience, id: string) => {
  cachedSupportUserId[audience] = id;
  supportUserIdListeners[audience].forEach((listener) => listener());
};

/**
 * Resolves the support admin id for one audience from the server, once per
 * page load regardless of how many components call `useSupportUserId()`.
 */
const ensureSupportUserIdFetched = (audience: SupportAudience) => {
  if (fetchStarted[audience] || cachedSupportUserId[audience]) return;
  fetchStarted[audience] = true;
  getRequest(chatSupportTargetAPI(audience))
    .then(({ targetUserId }: { targetUserId: string | null }) => {
      if (targetUserId) setCachedSupportUserId(audience, targetUserId);
    })
    .catch(() => {
      fetchStarted[audience] = false;
    });
};

/**
 * The support account id for the given audience, resolved from the server
 * and cached for the session; null until that first resolution completes.
 * Re-renders the caller once resolved. Triggers the resolving fetch itself,
 * so it works whether or not `ContactTargetProvider` is mounted (e.g. the
 * admin dashboard layout, which doesn't use it).
 */
export function useSupportUserId(audience: SupportAudience = "customers") {
  useEffect(() => {
    ensureSupportUserIdFetched(audience);
  }, [audience]);
  return useSyncExternalStore(
    (onChange) => {
      supportUserIdListeners[audience].add(onChange);
      return () => supportUserIdListeners[audience].delete(onChange);
    },
    () => cachedSupportUserId[audience],
    () => null,
  );
}

const ContactTargetContext = createContext<ContactTargetContextValue | null>(
  null,
);

export function ContactTargetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supportId = useSupportUserId();
  const [pageTarget, setPageTarget] = useState<ContactTarget | null>(null);

  const value = useMemo(
    () => ({
      target: pageTarget ?? { ...DEFAULT_SUPPORT_TARGET, targetUserId: supportId },
      setPageTarget,
    }),
    [pageTarget, supportId],
  );

  return (
    <ContactTargetContext.Provider value={value}>
      {children}
    </ContactTargetContext.Provider>
  );
}

export function useContactTarget() {
  const context = useContext(ContactTargetContext);
  if (!context) {
    throw new Error(
      "useContactTarget must be used within ContactTargetProvider",
    );
  }
  return context.target;
}

export function useRegisterContactTarget({
  kind,
  targetUserId,
  resourceId,
  isPending = false,
}: {
  kind: ContactKind;
  targetUserId?: string | null;
  resourceId?: string | null;
  isPending?: boolean;
}) {
  const context = useContext(ContactTargetContext);
  if (!context) {
    throw new Error(
      "useRegisterContactTarget must be used within ContactTargetProvider",
    );
  }

  const { setPageTarget } = context;
  const normalizedTargetId =
    typeof targetUserId === "string" && targetUserId.trim()
      ? targetUserId.trim()
      : null;
  const normalizedResourceId =
    typeof resourceId === "string" && resourceId.trim()
      ? resourceId.trim()
      : null;

  useEffect(() => {
    setPageTarget({
      kind,
      targetUserId: normalizedTargetId,
      resourceId: normalizedResourceId,
      isPending,
    });

    return () => setPageTarget(null);
  }, [
    isPending,
    kind,
    normalizedResourceId,
    normalizedTargetId,
    setPageTarget,
  ]);
}
