import { dataProviderGenerator } from "@/../services/data-provider";
import { cookies } from "next/headers";

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text.trim()) {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Invalid JSON (${response.status}): ${text.slice(0, 160)}`,
    );
  }
};

export const getRequest = async (url) => {
  const options = {
    headers: {},
  };
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
  if (userCookie) {
    const user = JSON.parse(userCookie.value);
    options.headers["Authorization"] = "Bearer " + user.token;
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    let detail = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) detail = String(parsed.message);
    } catch {
      /* use raw body */
    }
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }
  return parseJsonResponse(response);
};

export const putRequest = async (url, data) => {
  const options = {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  };
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
  if (userCookie) {
    const user = JSON.parse(userCookie.value);
    options.headers["Authorization"] = "Bearer " + user.token;
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text.slice(0, 200)}`);
  }
  return parseJsonResponse(response);
};

export const postRequest = async (url, data) => {
  const options = {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  };
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
  if (userCookie) {
    const user = JSON.parse(userCookie.value);
    options.headers["Authorization"] = "Bearer " + user.token;
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text.slice(0, 200)}`);
  }
  return parseJsonResponse(response);
};

const serverDataProvider = dataProviderGenerator({
  getRequest,
  putRequest,
  postRequest,
  deleteRequest: () => {},
});

export default serverDataProvider;
