import { getApiBaseUrl } from '../config/api.config';
import { getAuthToken } from './token.storage';

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly messages: string[],
    public readonly errorName?: string,
  ) {
    super(messages.join(', '));
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = false,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errorMessages: string[] = [];
    let errorName = 'Error';

    if (typeof data === 'object' && data !== null) {
      const err = data as ApiErrorResponse;
      errorName = err.error || 'Error';
      if (Array.isArray(err.message)) {
        errorMessages = err.message;
      } else if (typeof err.message === 'string') {
        errorMessages = [err.message];
      }
    } else {
      errorMessages = [response.statusText || `Request failed with code ${response.status}`];
    }

    throw new ApiError(response.status, errorMessages, errorName);
  }

  return data as T;
}
