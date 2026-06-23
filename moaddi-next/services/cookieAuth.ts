/** Bearer token from the `user` cookie (same shape as legacy checkout calls). */
export const getAuthToken = (): string | null => {
  try {
    const userCookieEntry = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user="));
    if (!userCookieEntry) return null;
    const userCookie = decodeURIComponent(
      userCookieEntry.split("=").slice(1).join("="),
    );
    const user = JSON.parse(userCookie) as { token?: string };
    return user?.token ?? null;
  } catch {
    return null;
  }
};
