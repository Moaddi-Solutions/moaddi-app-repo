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

type SupportCacheKey = string;

const DEFAULT_SUPPORT_TARGET: ContactTarget = {
  kind: 'support',
  targetUserId: null,
};

const cachedSupportUserId: Record<SupportCacheKey, string | null> = {};
const fetchStarted: Record<SupportCacheKey, boolean> = {};
const supportUserIdListeners: Record<SupportCacheKey, Set<() => void>> = {};

const cacheKeyFor = (
  audience: SupportAudience,
  opts?: { shopId?: string | null; machineId?: string | null },
): SupportCacheKey => {
  if (opts?.machineId) return `${audience}:machine:${opts.machineId}`;
  if (opts?.shopId) return `${audience}:shop:${opts.shopId}`;
  return audience;
};

const listenersFor = (key: SupportCacheKey) => {
  if (!supportUserIdListeners[key]) supportUserIdListeners[key] = new Set();
  return supportUserIdListeners[key];
};

const setCachedSupportUserId = (key: SupportCacheKey, id: string) => {
  cachedSupportUserId[key] = id;
  listenersFor(key).forEach((listener) => listener());
};

/**
 * Resolves the support admin id for one audience (optionally scoped to a
 * shop or machine) from the server, once per page load per cache key.
 */
const ensureSupportUserIdFetched = (
  audience: SupportAudience,
  opts?: { shopId?: string | null; machineId?: string | null },
) => {
  const key = cacheKeyFor(audience, opts);
  if (fetchStarted[key] || cachedSupportUserId[key]) return;
  fetchStarted[key] = true;
  getRequest(
    chatSupportTargetAPI({
      audience,
      shopId: opts?.shopId || undefined,
      machineId: opts?.machineId || undefined,
    }),
  )
    .then(({ targetUserId }: { targetUserId: string | null }) => {
      if (targetUserId) setCachedSupportUserId(key, targetUserId);
    })
    .catch(() => {
      fetchStarted[key] = false;
    });
};

/**
 * The support account id for the given audience (and optional shop/machine),
 * resolved from the server and cached for the session.
 */
export function useSupportUserId(
  audience: SupportAudience = 'customers',
  opts?: { shopId?: string | null; machineId?: string | null },
) {
  const key = cacheKeyFor(audience, opts);
  useEffect(() => {
    ensureSupportUserIdFetched(audience, opts);
  }, [audience, opts?.shopId, opts?.machineId]);
  return useSyncExternalStore(
    (onChange) => {
      listenersFor(key).add(onChange);
      return () => listenersFor(key).delete(onChange);
    },
    () => cachedSupportUserId[key] ?? null,
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
