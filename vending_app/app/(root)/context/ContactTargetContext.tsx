import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

// Temporary MVP fallback, matching the web client's current behaviour.
// EXPO_PUBLIC_CHAT_ADMIN_ID should become the only source once support
// assignment moves behind the server.
const SUPPORT_USER_ID =
  process.env.EXPO_PUBLIC_CHAT_ADMIN_ID?.trim() || '+966555728085';

const DEFAULT_SUPPORT_TARGET: ContactTarget = {
  kind: 'support',
  targetUserId: SUPPORT_USER_ID,
};

const ContactTargetContext = createContext<ContactTargetContextValue | null>(null);

export function ContactTargetProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ContactTarget>(DEFAULT_SUPPORT_TARGET);

  const setPageTarget = useCallback((nextTarget: ContactTarget | null) => {
    setTarget(nextTarget ?? DEFAULT_SUPPORT_TARGET);
  }, []);

  const value = useMemo(() => ({ target, setPageTarget }), [target, setPageTarget]);

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
