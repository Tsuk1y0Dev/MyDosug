/**
 * API для аутентификации
 * Моковые запросы, готовые для замены на реальные
 */

import { apiClient, mockRequest, ApiResponse } from './client';

// Типы для аутентификации
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    avatar_url?: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

// Моковые данные
const mockUsers: Array<{
  id: number;
  email: string;
  password: string;
  name: string;
  avatar_url?: string;
}> = [];

let mockUserIdCounter = 1;

export const authApi = {
  /**
   * Регистрация пользователя
   * POST /api/auth/register
   */
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    // Реальная реализация
    return apiClient.post<AuthResponse>('/auth/register', data);

    // ---- MOCK (оставлено закомментированным для быстрого бэка) ----
    /*
    if (mockUsers.find(u => u.email === data.email)) {
      throw { message: 'Пользователь с таким email уже существует', code: 'EMAIL_EXISTS', status: 400 };
    }

    const newUser = {
      id: mockUserIdCounter++,
      email: data.email,
      password: data.password, // В реальном API пароль будет хеширован
      name: data.name,
    };

    mockUsers.push(newUser);

    return mockRequest<AuthResponse>({
      token: `mock_token_${newUser.id}_${Date.now()}`,
      refreshToken: `mock_refresh_${newUser.id}_${Date.now()}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
    */
  },

  /**
   * Вход пользователя
   * POST /api/auth/login
   */
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    // Реальная реализация
    return apiClient.post<AuthResponse>('/auth/login', data);

    // ---- MOCK (оставлено закомментированным для быстрого бэка) ----
    /*
    const user = mockUsers.find(u => u.email === data.email && u.password === data.password);
    
    if (!user) {
      throw { message: 'Неверный email или пароль', code: 'INVALID_CREDENTIALS', status: 401 };
    }

    return mockRequest<AuthResponse>({
      token: `mock_token_${user.id}_${Date.now()}`,
      refreshToken: `mock_refresh_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
    */
  },

  /**
   * Обновление токена
   * POST /api/auth/refresh
   */
  async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<RefreshTokenResponse>> {
    // Моковая реализация
    return mockRequest<RefreshTokenResponse>({
      token: `mock_token_refreshed_${Date.now()}`,
      refreshToken: `mock_refresh_${Date.now()}`,
    });

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.post<RefreshTokenResponse>('/auth/refresh', data);
  },
};

