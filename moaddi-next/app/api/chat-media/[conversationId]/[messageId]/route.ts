import { cookies } from "next/headers";
import { resolveApiV1Base } from "@/../lib/api-base";

/**
 * Proxies private chat media so `<img>`/`<audio>` can load it with a plain,
 * cookie-authenticated same-origin URL.
 *
 * Why a proxy rather than a client-side blob fetch + `URL.createObjectURL`:
 *   - `<audio>` seeking needs the browser to issue its own Range requests.
 *     A blob forces a full download before playback can start at all, and
 *     gives no scrubbing.
 *   - Neither `<img src>` nor `<audio src>` can carry an Authorization
 *     header — there is no other way to authenticate a subresource load.
 *   - Same-origin sidesteps helmet's Cross-Origin-Resource-Policy on the API
 *     responses and next.config.ts remotePatterns (which does not even list
 *     the local API port).
 *   - Normal HTTP caching (Cache-Control/ETag) works; a blob URL does not
 *     survive a remount and needs explicit `revokeObjectURL` cleanup.
 *
 * Three rules that matter more than they look:
 *   - forward `upstream.status` verbatim — hard-coding 200 breaks Range/seek
 *   - allowlist response headers — never spread them all (that double-encodes
 *     a re-streamed body, and would leak a cross-origin Set-Cookie)
 *   - stream `upstream.body` — buffering with `arrayBuffer()` defeats Range
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // reads the auth cookie per request

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const FORWARD_REQUEST_HEADERS = ["range", "if-none-match", "if-modified-since"];
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "content-disposition",
  "last-modified",
];

const readToken = async (): Promise<string | null> => {
  const raw = (await cookies()).get("user")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> },
) {
  const { conversationId, messageId } = await params;

  if (!ID_PATTERN.test(conversationId) || !ID_PATTERN.test(messageId)) {
    return new Response(null, { status: 400 });
  }

  const token = await readToken();
  if (!token) return new Response(null, { status: 401 });

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) forwardHeaders[name] = value;
  }

  const upstreamUrl = `${resolveApiV1Base()}chat/conversations/${encodeURIComponent(
    conversationId,
  )}/messages/${encodeURIComponent(messageId)}/media`;

  const upstream = await fetch(upstreamUrl, {
    headers: forwardHeaders,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
