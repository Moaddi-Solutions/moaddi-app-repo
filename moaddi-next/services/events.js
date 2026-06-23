import axios from "axios";
import Cookies from "js-cookie";
import { signInAddress } from "./serverAddresses";

const REQUEST_TIMEOUT_MS = 20_000;
axios.defaults.timeout = REQUEST_TIMEOUT_MS;

export function clearAuthHeaders() {
  delete axios.defaults.headers.common.Authorization;
  delete axios.defaults.headers.Authorization;
}

export const postRequest = async (url, body = null) => {
  console.log("url", url);
  if (url !== signInAddress()) {
    let cookies = Cookies.get("user");
    if (cookies) {
      cookies = JSON.parse(cookies);
      axios.defaults.headers["Authorization"] = "Bearer " + cookies.token;
    }
  }
  // try {
  let response;
  if (body) {
    response = await axios.post(url, body);
  } else {
    response = await axios.post(url);
  }
  return response.data;
  // } catch (error) {
  //   return error.response.data;
  // }
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

export const putRequest = async (url, body = {}) => {
  let cookies = Cookies.get("user");
  if (cookies) {
    cookies = JSON.parse(cookies);
    axios.defaults.headers["Authorization"] = "Bearer " + cookies.token;
  }
  // try {
  const response = await axios.put(url, body);
  return response?.data;
  // } catch (error) {
  //   return error?.response?.data;
  // }
};

export const deleteRequest = async (url) => {
  let cookies = Cookies.get("user");
  if (cookies) {
    cookies = JSON.parse(cookies);
    axios.defaults.headers["Authorization"] = "Bearer " + cookies.token;
  }
  // try {
  const response = await axios.delete(url);
  return response?.data;
  // } catch (error) {
  //   return error?.response?.data;
  // }
};
