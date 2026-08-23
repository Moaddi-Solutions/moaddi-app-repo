import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  buildAbility,
  isStaffAbility,
  staffCapabilities,
  type AppAbility,
  type StaffCapabilities,
} from "~/lib/ability";
import { getRequest } from "~/services/httpClient";
import { myPermissionsAPI } from "~/services/serverAddresses";
import { useUser } from "./UserContext";

type AbilityContextValue = {
  ability: AppAbility;
  /** Vendor or admin — allowed into the staff/ area. */
  isStaff: boolean;
  /** What the staff UI branches on; see `staffCapabilities`. */
  capabilities: StaffCapabilities;
};

const abilityContext = createContext<AbilityContextValue | null>(null);

/**
 * Derives the CASL ability from the signed-in user's packed rules (stored
 * with the signin payload). Sessions created before the CASL rollout have
 * no rules — those are backfilled once from GET users/me/permissions.
 */
const AbilityProvider = ({ children }: { children: ReactNode }) => {
  const { user, setUser } = useUser();
  const backfilledFor = useRef<string | null>(null);

  const ability = useMemo(() => buildAbility(user?.rules), [user?.rules]);

  useEffect(() => {
    const uid = user?._id;
    if (!uid || !user?.token || Array.isArray(user?.rules)) return;
    if (backfilledFor.current === uid) return;
    backfilledFor.current = uid;
    getRequest(myPermissionsAPI)
      .then((data: { rules?: unknown[] }) => {
        if (Array.isArray(data?.rules)) {
          setUser((prev) => (prev ? { ...prev, rules: data.rules } : prev));
        }
      })
      .catch(() => {
        // Offline or expired session — ability stays empty; the server
        // still enforces everything.
      });
  }, [user?._id, user?.token, user?.rules, setUser]);

  const value = useMemo(
    () => ({
      ability,
      isStaff: isStaffAbility(ability),
      capabilities: staffCapabilities(ability),
    }),
    [ability]
  );

  return (
    <abilityContext.Provider value={value}>{children}</abilityContext.Provider>
  );
};

const useAbility = () => {
  const context = useContext(abilityContext);
  if (!context)
    throw new Error("useAbility must be used within an AbilityProvider");
  return context;
};

/** Renders children only when the ability allows `I` on `a`. */
const Can = ({
  I,
  a,
  children,
}: {
  I: string;
  a: string;
  children: ReactNode;
}) => {
  const { ability } = useAbility();
  return ability.can(I, a) ? <>{children}</> : null;
};

export { AbilityProvider, Can, useAbility };
