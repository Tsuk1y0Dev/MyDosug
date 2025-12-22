import { apiClient } from './client';
import { API_ENDPOINTS } from '../../constants/config';

export type TimelineEventType = 'place' | 'custom' | 'transport' | 'break' | 'buffer';

export interface TimelineEvent {
  id?: string;
  user_id?: string;
  event_date: string; // YYYY-MM-DD
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  event_type: TimelineEventType;
  place_id?: number;
  custom_name?: string;
  custom_description?: string;
  custom_address?: string;
  custom_latitude?: number;
  custom_longitude?: number;
  transport_type?: string;
  transport_duration?: number;
  transport_distance?: number;
  transport_polyline?: string;
  from_event_id?: string;
  to_event_id?: string;
  duration_minutes?: number;
  mood?: string;
  people_count?: number;
  expected_cost?: number;
  notes?: string;
  display_order?: number;
  status?: 'planned' | 'in_progress' | 'completed';
}

export const timelineApi = {
  async list(date: string): Promise<TimelineEvent[]> {
    try {
      return await apiClient.get<TimelineEvent[]>(API_ENDPOINTS.timeline.list, {
        auth: true,
        query: { date },
      });
    } catch {
      return [];
    }
  },

  async create(event: TimelineEvent): Promise<TimelineEvent> {
    try {
      return await apiClient.post<TimelineEvent>(API_ENDPOINTS.timeline.events, event, {
        auth: true,
      });
    } catch {
      return { ...event, id: `mock-${Date.now()}` };
    }
  },

  async update(id: string, event: Partial<TimelineEvent>): Promise<TimelineEvent> {
    try {
      return await apiClient.put<TimelineEvent>(API_ENDPOINTS.timeline.eventById(id), event, {
        auth: true,
      });
    } catch {
      return { ...event, id } as TimelineEvent;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete<void>(API_ENDPOINTS.timeline.eventById(id), { auth: true });
    } catch {
      // swallow in mock mode
    }
  },

  async optimize(date: string) {
    try {
      return await apiClient.post(API_ENDPOINTS.timeline.optimize, { date }, { auth: true });
    } catch {
      return { optimized: false };
    }
  },
};


