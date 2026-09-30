import axios from 'axios';
import { toApiError } from '../lib/apiError';
import { tokenStore } from '../lib/tokenStore';

const api = axios.create({
  baseURL: '/api',   //every request made using api automatically starts with /api
  headers: { 'Content-Type': 'application/json' }, // The data is in JSON format
});

// Set by AuthProvider: what to do when the server says the session is no longer valid
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// Every request carries the JWT, if there is one
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    const sentToken = Boolean(error?.config?.headers?.Authorization);

    // 401 on an authenticated request = token expired or revoked → log out.
    // (A 401 from the login form itself just means a wrong password.)
    // 403 is NOT a logout: the user is known but not allowed, e.g. hospital still PENDING.
    if (apiError.status === 401 && sentToken) {
      tokenStore.clear();
      onUnauthorized?.();
    }

    // Callers always receive an ApiError, never a raw AxiosError
    return Promise.reject(apiError);
  },
);

export default api;
