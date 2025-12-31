/**
 * API для работы с избранным
 * Моковые запросы, готовые для замены на реальные
 */

import { apiClient, mockRequest, ApiResponse } from './client';

// Типы для избранного
export interface Favorite {
  id: number;
  user_id: number;
  place_id: number;
  type: string;
  sort_order: number;
  folder?: string;
  tags?: string[];
  notes?: string;
}

export interface CreateFavoriteRequest {
  place_id: number;
  type?: string;
  folder?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateFavoriteRequest {
  sort_order?: number;
  folder?: string;
  tags?: string[];
  notes?: string;
}

// Моковые данные
const mockFavorites: Favorite[] = [];
let mockFavoriteIdCounter = 1;

export const favoritesApi = {
  /**
   * Получить избранные места
   * GET /api/favorites
   */
  async getFavorites(): Promise<ApiResponse<Favorite[]>> {
    // Моковая реализация
    return mockRequest<Favorite[]>(mockFavorites);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.get<Favorite[]>('/favorites');
  },

  /**
   * Добавить место в избранное
   * POST /api/favorites
   */
  async createFavorite(data: CreateFavoriteRequest): Promise<ApiResponse<Favorite>> {
    // Моковая реализация
    const existing = mockFavorites.find(f => f.place_id === data.place_id);
    if (existing) {
      throw { message: 'Место уже в избранном', code: 'ALREADY_EXISTS', status: 400 };
    }

    const newFavorite: Favorite = {
      id: mockFavoriteIdCounter++,
      user_id: 1,
      place_id: data.place_id,
      type: data.type || 'default',
      sort_order: mockFavorites.length,
      folder: data.folder,
      tags: data.tags,
      notes: data.notes,
    };

    mockFavorites.push(newFavorite);

    return mockRequest<Favorite>(newFavorite);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.post<Favorite>('/favorites', data);
  },

  /**
   * Обновить избранное
   * PUT /api/favorites/{id}
   */
  async updateFavorite(
    id: number,
    data: UpdateFavoriteRequest
  ): Promise<ApiResponse<Favorite>> {
    // Моковая реализация
    const index = mockFavorites.findIndex(f => f.id === id);
    if (index === -1) {
      throw { message: 'Избранное не найдено', code: 'NOT_FOUND', status: 404 };
    }

    mockFavorites[index] = { ...mockFavorites[index], ...data };

    return mockRequest<Favorite>(mockFavorites[index]);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.put<Favorite>(`/favorites/${id}`, data);
  },

  /**
   * Удалить из избранного
   * DELETE /api/favorites/{id}
   */
  async deleteFavorite(id: number): Promise<ApiResponse<void>> {
    // Моковая реализация
    const index = mockFavorites.findIndex(f => f.id === id);
    if (index === -1) {
      throw { message: 'Избранное не найдено', code: 'NOT_FOUND', status: 404 };
    }

    mockFavorites.splice(index, 1);

    return mockRequest<void>(undefined);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.delete<void>(`/favorites/${id}`);
  },
};

