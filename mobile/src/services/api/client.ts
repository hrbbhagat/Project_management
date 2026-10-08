import { Config } from '../../constants/config';
import { storage } from '../../utils/storage';
import { ApiResponse } from '../../types/api.types';

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

type UnauthorizedHandler = (message?: string) => void;

class ApiClient {
  private baseUrl: string;
  private onUnauthorizedCallback: UnauthorizedHandler | null = null;
  private isHandling401 = false;

  constructor() {
    this.baseUrl = Config.API_BASE_URL;
  }

  /**
   * Register a global handler for session invalidation / 401 responses
   */
  public setOnUnauthorized(handler: UnauthorizedHandler) {
    this.onUnauthorizedCallback = handler;
  }

  /**
   * Update or override base URL dynamically at runtime (e.g. settings screen)
   */
  public setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Core request dispatcher with automatic JWT Bearer injection & error classification
   */
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, skipAuth = false, headers = {}, ...customConfig } = options;

    let url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Append query parameters
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `${url.includes('?') ? '&' : '?'}${queryString}`;
      }
    }

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Attach Authorization Bearer token if not skipped
    if (!skipAuth) {
      const token = await storage.getAuthToken();
      if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Config.REQUEST_TIMEOUT_MS);

    const config: RequestInit = {
      headers: {
        ...defaultHeaders,
        ...(headers as Record<string, string>),
      },
      signal: controller.signal,
      ...customConfig,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      let responseData: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = { message: text };
      }

      if (!response.ok) {
        // Handle 401 Unauthorized for authenticated routes (session expired)
        if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          if (!this.isHandling401) {
            this.isHandling401 = true;
            if (this.onUnauthorizedCallback) {
              this.onUnauthorizedCallback('Your session has expired. Please log in again.');
            }
            setTimeout(() => {
              this.isHandling401 = false;
            }, 2000);
          }
        }

        let errorMessage = responseData?.message;
        if (!errorMessage) {
          if (response.status === 401) {
            errorMessage = 'Invalid email or password.';
          } else if (response.status === 403) {
            errorMessage = 'Access denied. You do not have permission for this resource.';
          } else if (response.status === 404) {
            errorMessage = 'The requested resource was not found.';
          } else if (response.status === 409) {
            errorMessage = 'An account with this email address already exists.';
          } else if (response.status === 429) {
            errorMessage = 'Too many requests. Please slow down and try again later.';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }

        throw new ApiError(errorMessage, response.status, responseData);
      }

      return responseData as ApiResponse<T>;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new ApiError(
          `Request timed out after ${Config.REQUEST_TIMEOUT_MS / 1000} seconds. Please check your network connection.`,
          408
        );
      }

      // Network failure, DNS issue, or connection refused
      const isNetworkError =
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.name === 'TypeError';

      if (isNetworkError) {
        throw new ApiError(
          `Unable to reach the server at ${this.baseUrl}. Please check your connection or verify the server is running.`,
          0
        );
      }

      throw new ApiError(error.message || 'An unexpected error occurred', 500);
    }
  }

  public get<T>(endpoint: string, params?: Record<string, any>, options?: RequestOptions) {
    return this.request<T>(endpoint, { method: 'GET', params, ...options });
  }

  public post<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  public put<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  public delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }
}

export const apiClient = new ApiClient();
