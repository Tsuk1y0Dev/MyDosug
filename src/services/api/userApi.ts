/**
 * API для работы с пользователем и профилем
 * Моковые запросы, готовые для замены на реальные
 */

import { apiClient, mockRequest, ApiResponse } from './client';

// Типы для пользователя
export interface UserProfile {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  max_walking_minutes: number;
  preferred_transport: 'walking' | 'car' | 'public';
  dietary_restrictions: string[];
  accessibility_needs: string[];
  budget_preference: 'low' | 'medium' | 'high';
  has_children: boolean;
  children_ages: number[];
  default_start_location_type: 'home' | 'work' | 'current' | 'custom';
}

export interface UpdateProfileRequest {
  name?: string;
  avatar_url?: string;
  max_walking_minutes?: number;
  preferred_transport?: 'walking' | 'car' | 'public';
  dietary_restrictions?: string[];
  accessibility_needs?: string[];
  budget_preference?: 'low' | 'medium' | 'high';
  has_children?: boolean;
  children_ages?: number[];
  default_start_location_type?: 'home' | 'work' | 'current' | 'custom';
}

export interface SavedLocation {
  id: number;
  user_id: number;
  name: string;
  type: 'home' | 'work' | 'study' | 'gym' | 'custom';
  address: string;
  latitude: number;
  longitude: number;
  icon?: string;
  is_default_start: boolean;
}

export interface CreateSavedLocationRequest {
  name: string;
  type: 'home' | 'work' | 'study' | 'gym' | 'custom';
  address: string;
  latitude: number;
  longitude: number;
  icon?: string;
  is_default_start?: boolean;
}

// Моковые данные
let mockProfile: UserProfile | null = null;
const mockSavedLocations: SavedLocation[] = [];
let mockLocationIdCounter = 1;

export const userApi = {
  /**
   * Получить профиль пользователя
   * GET /api/user/profile
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    // Моковая реализация
    if (!mockProfile) {
      mockProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Пользователь',
        max_walking_minutes: 15,
        preferred_transport: 'walking',
        dietary_restrictions: [],
        accessibility_needs: [],
        budget_preference: 'medium',
        has_children: false,
        children_ages: [],
        default_start_location_type: 'current',
      };
    }

    return mockRequest<UserProfile>(mockProfile);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.get<UserProfile>('/user/profile');
  },

  /**
   * Обновить профиль пользователя
   * PUT /api/user/profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    // Моковая реализация
    if (!mockProfile) {
      await this.getProfile();
    }

    if (mockProfile) {
      mockProfile = { ...mockProfile, ...data };
    }

    return mockRequest<UserProfile>(mockProfile!);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.put<UserProfile>('/user/profile', data);
  },

  /**
   * Получить сохраненные локации пользователя
   * GET /api/user/locations
   */
  async getSavedLocations(): Promise<ApiResponse<SavedLocation[]>> {
    // Моковая реализация
    return mockRequest<SavedLocation[]>(mockSavedLocations);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.get<SavedLocation[]>('/user/locations');
  },

  /**
   * Создать сохраненную локацию
   * POST /api/user/locations
   */
  async createSavedLocation(data: CreateSavedLocationRequest): Promise<ApiResponse<SavedLocation>> {
    // Моковая реализация
    const newLocation: SavedLocation = {
      id: mockLocationIdCounter++,
      user_id: 1,
      ...data,
      is_default_start: data.is_default_start ?? false,
    };

    mockSavedLocations.push(newLocation);

    return mockRequest<SavedLocation>(newLocation);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.post<SavedLocation>('/user/locations', data);
  },

  /**
   * Обновить сохраненную локацию
   * PUT /api/user/locations/{id}
   */
  async updateSavedLocation(
    id: number,
    data: Partial<CreateSavedLocationRequest>
  ): Promise<ApiResponse<SavedLocation>> {
    // Моковая реализация
    const index = mockSavedLocations.findIndex(loc => loc.id === id);
    if (index === -1) {
      throw { message: 'Локация не найдена', code: 'NOT_FOUND', status: 404 };
    }

    mockSavedLocations[index] = { ...mockSavedLocations[index], ...data };

    return mockRequest<SavedLocation>(mockSavedLocations[index]);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.put<SavedLocation>(`/user/locations/${id}`, data);
  },

  /**
   * Удалить сохраненную локацию
   * DELETE /api/user/locations/{id}
   */
  async deleteSavedLocation(id: number): Promise<ApiResponse<void>> {
    // Моковая реализация
    const index = mockSavedLocations.findIndex(loc => loc.id === id);
    if (index === -1) {
      throw { message: 'Локация не найдена', code: 'NOT_FOUND', status: 404 };
    }

    mockSavedLocations.splice(index, 1);

    return mockRequest<void>(undefined);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.delete<void>(`/user/locations/${id}`);
  },
};

