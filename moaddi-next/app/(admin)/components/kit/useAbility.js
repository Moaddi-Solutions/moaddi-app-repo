"use client";

import { buildAbility } from "@/../lib/ability";
import { usePermissions } from "ra-core";
import { useMemo } from "react";

/**
 * CASL ability for the logged-in dashboard user, built from the packed
 * rules delivered by the server (via authProvider.getPermissions). Use it
 * to gate form fields and custom UI; resource/page access already goes
 * through authProvider.canAccess.
 */
export function useAbility() {
  const { permissions } = usePermissions();
  return useMemo(() => buildAbility(permissions?.rules), [permissions]);
}
