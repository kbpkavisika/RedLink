import { isAxiosError } from 'axios';
import type { ApiError } from '../types';

// Checks the fields only ApiError has; an AxiosError also has a numeric status and a message
export function isApiError(value: unknown): value is ApiError {
  const candidate = value as Partial<ApiError> | null;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    !isAxiosError(candidate) &&
    typeof candidate.status === 'number' &&
    typeof candidate.error === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.path === 'string'
  );
}

function build(status: number, error: string, message: string, path = ''): ApiError {
  return { status, error, message, fieldErrors: [], ref: '', timestamp: new Date().toISOString(), path };
}

/**
 * Turns anything thrown by a request into an ApiError, so pages only handle one error type.
 * The backend already sends ApiError; this covers the cases where it couldn't.
 */
export function toApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    const path = error.config?.url ?? '';
    const response = error.response;

    // The backend answered in the standard format
    if (response && isApiError(response.data)) {
      return { ...response.data, fieldErrors: response.data.fieldErrors ?? [] };
    }

    // An answer without our format, e.g. the dev proxy when the backend isn't running
    if (response) {
      return response.status >= 500
        ? build(response.status, 'Server Error', "We can't reach the RedLink server right now. Please try again in a moment.", path)
        : build(response.status, 'Request Failed', `The request failed with status ${response.status}.`, path);
    }

    // No answer at all
    return build(0, 'Network Error', "Can't reach RedLink. Check your internet connection and try again.", path);
  }

  // Already converted, e.g. by the API client's interceptor
  if (isApiError(error)) {
    return error;
  }

  return build(0, 'Unexpected Error', 'Something unexpected happened in the app. Please reload the page.');
}
