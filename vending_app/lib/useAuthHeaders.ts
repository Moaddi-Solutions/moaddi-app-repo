import { useEffect, useState } from 'react';
import { getItem } from '~/lib/utils';

/**
 * Bearer headers for <Image source={{ uri, headers }}>. Private chat media is
 * membership-checked server-side, so it cannot be fetched without the token —
 * and unlike the web client (which needs a same-origin proxy because a browser
 * <img> cannot carry a header), RN can attach it directly.
 */
export function useAuthHeaders() {
  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getItem('user').then((user) => {
      if (cancelled || !user?.token) return;
      setHeaders({ Authorization: `Bearer ${user.token}` });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return headers;
}
