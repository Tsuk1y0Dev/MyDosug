/**
 * API Client для работы с бэкендом
 * Пока использует моковые данные, но структура готова для интеграции с реальным API
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.mydosug.ru/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw {
          message: errorData.message || 'Request failed',
          code: errorData.code,
          status: response.status,
        } as ApiError;
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }
      throw {
        message: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      } as ApiError;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request<T>(endpoint + queryString, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Экспортируем singleton instance
export const apiClient = new ApiClient();

// Функция для моковых запросов (пока бэкенд не готов)
export const mockRequest = <T>(data: T, delay: number = 500): Promise<ApiResponse<T>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data });
    }, delay);
  });
};

