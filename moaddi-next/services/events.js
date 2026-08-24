import axios from "axios";
import Cookies from "js-cookie";
import { signInAddress } from "./serverAddresses";

const REQUEST_TIMEOUT_MS = 20_000;
axios.defaults.timeout = REQUEST_TIMEOUT_MS;

export function clearAuthHeaders() {
  delete axios.defaults.headers.common.Authorization;
  delete axios.defaults.headers.Authorization;
}

/**
 * Rethrow with the server's own message.
 *
 * Axios throws an error whose `.message` is "Request failed with status code
 * 400" — the reason the API actually gave sits in `response.data.message`.
 * react-admin notifies on `.message`, so without this every validation failure
 * reaches the user as the same meaningless string.
 *
 * @param {any} error
 * @returns {never}
 */
const withServerMessage = (error) => {
  const serverMessage = error?.response?.data?.message;
  if (!serverMessage) throw error;
  const wrapped = new Error(serverMessage);
  wrapped.status = error?.response?.status;
  wrapped.cause = error;
  throw wrapped;
};

/**
 * @param {string} url
 * @param {unknown} [body]
 * @param {import("axios").AxiosRequestConfig} [config] optional per-call config
 *   (onUploadProgress, signal, timeout, ...). Every existing call site passes
 *   0-2 args, so `config` is undefined there and the request is unchanged —
 *   this parameter exists only for chat media uploads, which need their own
 *   timeout (the 20s default aborts real-world uploads) and progress callback.
 */
export const postRequest = async (url, body = null, config = undefined) => {
  console.log("url", url);
  if (url !== signInAddress()) {
    let cookies = Cookies.get("user");
    if (cookies) {
      cookies = JSON.parse(cookies);
      axios.defaults.headers["Authorization"] = "Bearer " + cookies.token;
    }
  }
  try {
    let response;
    if (body) {
      response = config ? await axios.post(url, body, config) : await axios.post(url, body);
    } else {
      response = config ? await axios.post(url, undefined, config) : await axios.post(url);
    }
    return response.data;
  } catch (error) {
    return withServerMessage(error);
  }
};
export const getRequest = async (url) => {
  let cookies = Cookies.get("user");
  if (cookies) {
    cookies = JSON.parse(cookies);
    axios.defaults.headers["Authorization"] = "Bearer " + cookies.token;
  }

  // try {
  const response = await axios.get(url);
  return response.data;
  // } catch (error) {
  //   let errorMsg = null;
  //   if (error?.response?.data) {
  //     errorMsg = error?.response?.data;
  //   } else {
  //     errorMsg = "something went wrong!";
  //   }
  //   return errorMsg;
  // }
};

export const putRequest = async (url, body = {}, config = undefined) => {
  let cookies = Cookies.get("user");
  if (cookies) {
    cookies = JSON.parse(cookies);
    axios.defaults.headers["Authorization"] = "Bearer " + cookies.token;
  }
  try {
    const response = config
      ? await axios.put(url, body, config)
      : await axios.put(url, body);
    return response?.data;
  } catch (error) {
    return withServerMessage(error);
  }
};

export const deleteRequest = async (url, config = undefined) => {
  let cookies = Cookies.get("user");
  if (cookies) {
    cookies = JSON.parse(cookies);
    axios.defaults.headers["Authorization"] = "Bearer " + cookies.token;
  }
  // try {
  const response = config
    ? await axios.delete(url, config)
    : await axios.delete(url);
  return response?.data;
  // } catch (error) {
  //   return error?.response?.data;
  // }
};
