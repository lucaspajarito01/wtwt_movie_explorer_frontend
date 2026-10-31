import { api, ApiError } from './api.js';

const TOKEN_KEY = 'wtwt_token';

export function saveToken(token, persistent) {
  clearSession();
  try {
    (persistent ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
  }
}

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

export async function fetchCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const json = await api('/auth/me', { token });
    return json.data.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearSession();
      return null;
    }
    throw err;
  }
}
