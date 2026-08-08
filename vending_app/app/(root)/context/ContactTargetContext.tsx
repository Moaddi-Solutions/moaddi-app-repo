import { getRequest } from '~/services/httpClient';
import { chatSupportTargetAPI } from '~/services/serverAddresses';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

// Mirrors moaddi-next/app/(root)/context/contact-target-context.tsx so both
// clients resolve "who does Contact talk to" the same way.

export type ContactKind = 'support' | 'machine-vendor' | 'shop-owner' | 'vendor';

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

export type SupportAudience = 'customers' | 'vendors';

const DEFAULT_SUPPORT_TARGET: ContactTarget = {
  kind: 'support',
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
 * The admin-configured "Contact support" target id for the given audience,
 * resolved from the server and cached for the session. Re-renders the
 * caller once resolved.
 */
export function useSupportUserId(audience: SupportAudience = 'customers') {
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

const ContactTargetContext = createContext<ContactTargetContextValue | null>(null);

export function ContactTargetProvider({ children }: { children: ReactNode }) {
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
    <ContactTargetContext.Provider value={value}>{children}</ContactTargetContext.Provider>
  );
}

export function useContactTarget() {
  const context = useContext(ContactTargetContext);
  if (!context) {
    throw new Error('useContactTarget must be used within ContactTargetProvider');
  }
  return context.target;
}

/**
 * Lets a screen declare who its Contact button should message. Resets to the
 * support default when the screen unmounts.
 */
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
    throw new Error('useRegisterContactTarget must be used within ContactTargetProvider');
  }

  const { setPageTarget } = context;
  const normalizedTargetId =
    typeof targetUserId === 'string' && targetUserId.trim() ? targetUserId.trim() : null;
  const normalizedResourceId =
    typeof resourceId === 'string' && resourceId.trim() ? resourceId.trim() : null;

  useEffect(() => {
    setPageTarget({
      kind,
      targetUserId: normalizedTargetId,
      resourceId: normalizedResourceId,
      isPending,
    });

    return () => setPageTarget(null);
  }, [isPending, kind, normalizedResourceId, normalizedTargetId, setPageTarget]);
}
