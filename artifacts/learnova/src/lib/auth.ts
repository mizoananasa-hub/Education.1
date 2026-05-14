import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "learnova_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Initialize custom fetch with the token getter
setAuthTokenGetter(getToken);
