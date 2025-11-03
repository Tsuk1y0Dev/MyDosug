export interface PlanningRequest {
  startTime: string;
  endTime: string;
  startPoint: StartPoint;
  budget: number;
  activityType: ActivityType;
  planType?: 'single' | 'chain'; // Добавляем тип плана
  mood?: MoodType; // Делаем опциональным
  company?: CompanyType; // Делаем опциональным
  filters: AdditionalFilters;
}

export interface StartPoint {
  type: 'home' | 'work' | 'current' | 'custom';
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export type ActivityType = 
  | 'food' 
  | 'entertainment' 
  | 'sports' 
  | 'culture' 
  | 'walking' 
  | 'shopping' 
  | 'education'
  | 'nature'
  | 'custom';

export type MoodType = 'relax' | 'educational' | 'fun' | 'romantic' | 'active';

export type CompanyType = 'solo' | 'couple' | 'friends' | 'kids' | 'colleagues';

export interface AdditionalFilters {
  wheelchairAccessible: boolean;
  vegetarian: boolean;
  outdoor: boolean;
  freeEntry: boolean;
  childFriendly: boolean;
}

export interface DurationSettings {
  baseDuration: number; // базовая продолжительность в минутах
  modifiers: {
    company: Record<CompanyType, number>; // модификаторы для разных типов компании
    mood: Record<MoodType, number>; // модификаторы для настроения
  };
}

export interface Place {
  id: string;
  name: string;
  type: ActivityType;
  address: string;
  description: string;
  priceLevel: 1 | 2 | 3 | 4;
  averageBill?: number;
  rating: number;
  distance: number;
  travelTime: number;
  durationSettings: DurationSettings; // заменяем duration на настройки
  image: string;
  website?: string;
  workingHours: string;
  features: {
    wheelchair: boolean;
    vegetarian: boolean;
    outdoor: boolean;
    childFriendly: boolean;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const calculateDuration = (
  durationSettings: DurationSettings, 
  company: CompanyType, 
  mood: MoodType
): number => {
  const base = durationSettings.baseDuration;
  const companyModifier = durationSettings.modifiers.company[company] || 1;
  const moodModifier = durationSettings.modifiers.mood[mood] || 1;
  
  return Math.round(base * companyModifier * moodModifier);
};

export interface PlannedActivity {
  id: string;
  place: Place;
  startTime: string;
  endTime: string;
  travelTimeFromPrevious: number; // время в пути от предыдущей точки
  order: number;
}

export interface RoutePlan {
  id: string;
  activities: PlannedActivity[];
  totalDuration: number;
  totalCost: number;
  startPoint: StartPoint;
}
