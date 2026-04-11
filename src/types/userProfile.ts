import type { StartPoint } from './planner';

export type SavedLocationType = 'home' | 'office' | 'hotel' | 'other';

export interface SavedLocation {
  id: string;
  /** Индекс на сервере (для POST /locations/remove и /locations/update) */
  serverIndex?: number;
  type: SavedLocationType;
  name: string;
  icon: string;
  /** Сохраняется на сервере в locations (опционально) */
  description?: string;
  coords: {
    lat: number;
    lng: number;
  };
}

export interface AccessibilitySettings {
  needsRamp: boolean;
  needsElevator: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  defaultStartPoint: StartPoint;
  defaultTransportMode: 'walking' | 'car' | 'public';
  notificationsEnabled: boolean;
  vegetarian: boolean;
  wheelchairAccessible: boolean;
  averageWalkingTime: number;
  savedLocations: SavedLocation[];
  accessibilitySettings: AccessibilitySettings;
}
