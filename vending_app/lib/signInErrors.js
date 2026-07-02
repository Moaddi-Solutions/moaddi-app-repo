const SIGN_IN_ERROR_KEYS = {
  "Invalid password.": "invalidPassword",
  "User not found.": "userNotFound",
  "User not Active.": "userNotActive",
};

export function getSignInErrorMessage(message, t) {
  const key = SIGN_IN_ERROR_KEYS[message];
  return key ? t(key) : message;
}
