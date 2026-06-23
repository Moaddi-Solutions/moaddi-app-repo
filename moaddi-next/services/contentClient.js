const contentBaseUrl = () => {
  const base =
    process.env.NEXT_PUBLIC_STATIC?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "Set NEXT_PUBLIC_STATIC or NEXT_PUBLIC_STRAPI_URL (e.g. in .env.local) for the Strapi/content base URL.",
    );
  }
  return base;
};

const client = (path, id, { withHeaders = false } = {}) =>
  fetch(`${contentBaseUrl()}/content/${path}/${id ?? ""}`, {
    next: {
      tags: ["content"],
      revalidate: false,
    },
  }).then(async (r) => {
    const text = await r.text();
    const contentType = r.headers.get("content-type") || "";
    const parseJson = () => {
      try {
        return text ? JSON.parse(text) : [];
      } catch {
        console.error(
          `[contentClient] Non-JSON response from ${path}. Is NEXT_PUBLIC_STATIC (${contentBaseUrl()}) running? Preview:`,
          text.slice(0, 120),
        );
        return [];
      }
    };
    if (!r.ok) {
      console.error(
        `[contentClient] ${r.status} fetching content/${path}`,
        text.slice(0, 200),
      );
      const empty = [];
      return withHeaders ? { data: empty, headers: r.headers } : empty;
    }
    if (!contentType.includes("application/json")) {
      console.error(
        `[contentClient] Expected JSON, got ${contentType} for content/${path}`,
      );
      const fallback = parseJson();
      return withHeaders
        ? { data: fallback, headers: r.headers }
        : fallback;
    }
    const data = parseJson();
    return withHeaders ? { data, headers: r.headers } : data;
  });

export { client };
