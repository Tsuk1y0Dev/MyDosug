/**
 * API для работы с таймлайном
 * Моковые запросы, готовые для замены на реальные
 */

import { apiClient, mockRequest, ApiResponse } from './client';
import { Activity } from '../../types/schedule';

// Типы для таймлайна
export interface TimelineEvent {
  id: number;
  user_id: number;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  event_type: 'place' | 'custom' | 'transport' | 'break' | 'buffer';
  place_id?: number;
  custom_name?: string;
  custom_description?: string;
  custom_address?: string;
  custom_latitude?: number;
  custom_longitude?: number;
  transport_type?: 'walking' | 'cycling' | 'car' | 'public';
  transport_duration?: number; // минуты
  transport_distance?: number; // метры
  transport_polyline?: string;
  from_event_id?: number;
  to_event_id?: number;
  duration_minutes?: number;
  mood?: 'work' | 'relax' | 'social' | 'active' | 'romantic';
  people_count?: number;
  expected_cost?: number;
  notes?: string;
  display_order: number;
  status: 'planned' | 'in_progress' | 'completed';
}

export interface CreateTimelineEventRequest {
  event_date: string; // YYYY-MM-DD
  event_type: 'place' | 'custom' | 'transport' | 'break' | 'buffer';
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  place_id?: number;
  preferred_time?: 'auto' | string; // 'auto' или конкретное время
  people_count?: number;
  custom_name?: string;
  custom_description?: string;
  custom_address?: string;
  custom_latitude?: number;
  custom_longitude?: number;
  mood?: 'work' | 'relax' | 'social' | 'active' | 'romantic';
  notes?: string;
}

export interface UpdateTimelineEventRequest extends Partial<CreateTimelineEventRequest> {
  start_time?: string;
  end_time?: string;
}

export interface OptimizeTimelineRequest {
  event_date: string; // YYYY-MM-DD
  optimize_by?: 'time' | 'distance' | 'cost';
}

// Моковые данные
const mockTimelineEvents: TimelineEvent[] = [];
let mockEventIdCounter = 1;

export const timelineApi = {
  /**
   * Получить события таймлайна за дату
   * GET /api/timeline?date=2024-05-15
   */
  async getTimelineEvents(date: string): Promise<ApiResponse<TimelineEvent[]>> {
    // Моковая реализация
    const events = mockTimelineEvents.filter(
      event => event.event_date === date
    ).sort((a, b) => a.display_order - b.display_order);

    return mockRequest<TimelineEvent[]>(events);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.get<TimelineEvent[]>('/timeline', { date });
  },

  /**
   * Создать событие таймлайна
   * POST /api/timeline/events
   */
  async createEvent(data: CreateTimelineEventRequest): Promise<ApiResponse<TimelineEvent>> {
    // Моковая реализация
    const newEvent: TimelineEvent = {
      id: mockEventIdCounter++,
      user_id: 1,
      event_date: data.event_date,
      start_time: data.start_time || '10:00',
      end_time: data.end_time || '11:00',
      event_type: data.event_type,
      place_id: data.place_id,
      custom_name: data.custom_name,
      custom_description: data.custom_description,
      custom_address: data.custom_address,
      custom_latitude: data.custom_latitude,
      custom_longitude: data.custom_longitude,
      people_count: data.people_count,
      mood: data.mood,
      notes: data.notes,
      display_order: mockTimelineEvents.filter(e => e.event_date === data.event_date).length,
      status: 'planned',
    };

    mockTimelineEvents.push(newEvent);

    return mockRequest<TimelineEvent>(newEvent);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.post<TimelineEvent>('/timeline/events', data);
  },

  /**
   * Обновить событие таймлайна
   * PUT /api/timeline/events/{id}
   */
  async updateEvent(
    id: number,
    data: UpdateTimelineEventRequest
  ): Promise<ApiResponse<TimelineEvent>> {
    // Моковая реализация
    const index = mockTimelineEvents.findIndex(event => event.id === id);
    if (index === -1) {
      throw { message: 'Событие не найдено', code: 'NOT_FOUND', status: 404 };
    }

    mockTimelineEvents[index] = { ...mockTimelineEvents[index], ...data };

    return mockRequest<TimelineEvent>(mockTimelineEvents[index]);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.put<TimelineEvent>(`/timeline/events/${id}`, data);
  },

  /**
   * Удалить событие таймлайна
   * DELETE /api/timeline/events/{id}
   */
  async deleteEvent(id: number): Promise<ApiResponse<void>> {
    // Моковая реализация
    const index = mockTimelineEvents.findIndex(event => event.id === id);
    if (index === -1) {
      throw { message: 'Событие не найдено', code: 'NOT_FOUND', status: 404 };
    }

    mockTimelineEvents.splice(index, 1);

    return mockRequest<void>(undefined);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.delete<void>(`/timeline/events/${id}`);
  },

  /**
   * Оптимизировать таймлайн
   * POST /api/timeline/optimize
   */
  async optimizeTimeline(data: OptimizeTimelineRequest): Promise<ApiResponse<TimelineEvent[]>> {
    // Моковая реализация
    const events = mockTimelineEvents.filter(
      event => event.event_date === data.event_date
    );

    // Простая моковая оптимизация - просто сортируем по времени
    const optimized = [...events].sort((a, b) => {
      const aTime = a.start_time;
      const bTime = b.start_time;
      return aTime.localeCompare(bTime);
    });

    // Обновляем display_order
    optimized.forEach((event, index) => {
      const originalIndex = mockTimelineEvents.findIndex(e => e.id === event.id);
      if (originalIndex !== -1) {
        mockTimelineEvents[originalIndex].display_order = index;
      }
    });

    return mockRequest<TimelineEvent[]>(optimized);

    // Реальная реализация (раскомментировать когда бэкенд готов):
    // return apiClient.post<TimelineEvent[]>('/timeline/optimize', data);
  },
};

