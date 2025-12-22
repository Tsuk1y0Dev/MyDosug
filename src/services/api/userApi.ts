import { apiClient } from './client';
import { API_ENDPOINTS } from '../../constants/config';

export type TransportMode = 'walking' | 'car' | 'public' | 'cycling';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  max_walking_minutes?: number;
  preferred_transport?: TransportMode;
  dietary_restrictions?: Record<string, boolean>;
  accessibility_needs?: Record<string, boolean>;
  budget_preference?: string;
  has_children?: boolean;
  children_ages?: number[];
  default_start_location_type?: string;
}

export interface UserLocation {
  id: string;
  name: string;
  type: 'home' | 'work' | 'study' | 'gym' | 'custom';
  address: string;
  latitude: number;
  longitude: number;
  icon?: string;
  is_default_start?: boolean;
}

const mockProfile: UserProfile = {
  id: 'mock-user',
  email: 'demo@example.com',
  name: 'Demo User',
  max_walking_minutes: 15,
  preferred_transport: 'walking',
};

const mockLocations: UserLocation[] = [
  {
    id: 'loc-home',
    name: 'Дом',
    type: 'home',
    address: 'ул. Ленина, 25',
    latitude: 52.03,
    longitude: 113.5,
    is_default_start: true,
  },
  {
    id: 'loc-work',
    name: 'Работа',
    type: 'work',
    address: 'ул. Амурская, 50',
    latitude: 52.04,
    longitude: 113.51,
  },
];

export const userApi = {
  async getProfile(): Promise<UserProfile> {
    try {
      return await apiClient.get<UserProfile>(API_ENDPOINTS.user.profile, { auth: true });
    } catch {
      return mockProfile;
    }
  },

  async updateProfile(payload: Partial<UserProfile>): Promise<UserProfile> {
    try {
      return await apiClient.put<UserProfile>(API_ENDPOINTS.user.profile, payload, {
        auth: true,
      });
    } catch {
      return { ...mockProfile, ...payload };
    }
  },

  async getLocations(): Promise<UserLocation[]> {
    try {
      return await apiClient.get<UserLocation[]>(API_ENDPOINTS.user.locations, { auth: true });
    } catch {
      return mockLocations;
    }
  },

  async saveLocation(location: Omit<UserLocation, 'id'>): Promise<UserLocation> {
    try {
      return await apiClient.post<UserLocation>(API_ENDPOINTS.user.locations, location, {
        auth: true,
      });
    } catch {
      const saved = { ...location, id: `mock-${Date.now()}` };
      mockLocations.push(saved);
      return saved;
    }
  },
};


