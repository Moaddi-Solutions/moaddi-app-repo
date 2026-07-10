import { getItem } from "~/lib/utils";
import { signInAddress } from "./serverAddresses";

/** Ngrok free tier returns an HTML interstitial unless this header is sent. */
function ngrokHeaders(url) {
  return typeof url === "string" && url.includes("ngrok")
    ? { "ngrok-skip-browser-warning": "true" }
    : {};
}

/** Default request timeout (ms). RN `fetch` has none, so a stalled server or
 *  unreachable host would otherwise leave buttons spinning forever. */
const REQUEST_TIMEOUT_MS = 30000;

/** `fetch` with an abort-based timeout. Rejects with a clear error on timeout
 *  so callers' catch blocks run (and reset their loading state). */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s: ${url}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function responseJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    if (text.trimStart().startsWith("<")) {
      throw new Error(
        "Server returned HTML instead of JSON (often ngrok warning page). Confirm EXPO_PUBLIC_SERVER_ORIGIN and that the tunnel is running.",
      );
    }
    throw e;
  }
}

export const postRequest = async (url, body = null) => {
  const headers = {
    "Content-Type": "application/json",
    ...ngrokHeaders(url),
  };
  if (url !== signInAddress) {
    const user = await getItem("user");
    if (user) headers["Authorization"] = "Bearer " + user.token;
  }
  try {
    console.log(" [HTTP POST] URL:", url);
    console.log(" [HTTP POST] Body:", body);
    console.log("[HTTP POST] Sending request...");

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      ...(body && {
        body: JSON.stringify(body),
      }),
    });

    console.log("📥 [HTTP POST] Status:", res.status, res.statusText);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(" [HTTP POST] Error response:", errorText);
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.message) {
          return { message: parsed.message, statusCode: res.status };
        }
      } catch {
        // non-JSON error body
      }
      return {
        message: `Request failed (${res.status})`,
        statusCode: res.status,
      };
    }

    const data = await responseJson(res);
    console.log("✅ [HTTP POST] Response received:", data);
    return data;
  } catch (error) {
    console.error(" [HTTP POST] Error:", error);
    console.error("   Message:", error?.message);
    console.error("   Stack:", error?.stack);
    throw error;
  }
};
export const postRequestPayment = async (url, body = null) => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (url !== signInAddress) {
    const user = await getItem("user");
    if (user) headers["Authorization"] = "Bearer " + user.token;
  }
  try {
    console.log(" [HTTP POST] URL:", url);
    console.log(" [HTTP POST] Body:", body);
    console.log("[HTTP POST] Sending request...");

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      ...(body && {
        body: JSON.stringify(body),
      }),
    });

    console.log("📥 [HTTP POST] Status:", res.status, res.statusText);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(" [HTTP POST] Error response:", errorText);
      // throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      console.log({
        error: true,
        statusCode: res.status,
        statusText: res.statusText,
      });

      return {
        error: true,
        statusCode: res.status,
        statusText: res.statusText,
      };
    }

    const data = await res.json();
    console.log("✅ [HTTP POST] Response received:", data);
    return data;
  } catch (error) {
    console.error(" [HTTP POST] Error:", error);
    console.error("   Message:", error?.message);
    console.error("   Stack:", error?.stack);
    throw error;
  }
};
export const getRequest = async (url) => {
  const headers = {
    ...ngrokHeaders(url),
  };
  const user = await getItem("user");
  if (user) headers["Authorization"] = "Bearer " + user.token;
  try {
    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${url} ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    console.log(" GET URL:", url);
    console.log(" STATUS:", res.status);
    console.log(" RESPONSE:", data);

    return data;
  } catch (error) {
    console.log(" GET ERROR:", error);
    console.log(" GET ERROR:", error?.error || error.message || error);
    console.log(" GET ERROR:", error?.response || error);
    throw error;
  }
};
export const putRequest = async (url, body = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...ngrokHeaders(url),
  };
  const user = await getItem("user");

  if (user) headers["Authorization"] = "Bearer " + user.token;

  try {
    const res = await fetchWithTimeout(url, {
      method: "PUT",
      headers,
      ...(body && {
        body: JSON.stringify(body),
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.log("PUT ERROR:", error);
    throw error;
  }
};

export const deleteRequest = async (url) => {
  const headers = {
    ...ngrokHeaders(url),
  };
  const user = await getItem("user");
  if (user) headers["Authorization"] = "Bearer " + user.token;

  try {
    const res = await fetchWithTimeout(url, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.log("DELETE ERROR:", error);
    throw error;
  }
};
