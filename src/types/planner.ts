export interface PlanningRequest {
  startTime: string;
  endTime: string;
  startPoint: StartPoint;
  budget: number;
  activityType: ActivityType;
  mood: MoodType;
  company: CompanyType;
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
  | 'nature';

export type MoodType = 'relax' | 'educational' | 'fun' | 'romantic' | 'active';

export type CompanyType = 'solo' | 'couple' | 'friends' | 'kids' | 'colleagues';

export interface AdditionalFilters {
  wheelchairAccessible: boolean;
  vegetarian: boolean;
  outdoor: boolean;
  freeEntry: boolean;
  childFriendly: boolean;
}

export interface Place {
  id: string;
  name: string;
  type: ActivityType;
  address: string;
  description: string;
  priceLevel: 1 | 2 | 3 | 4; // $ - $$$$
  averageBill?: number;
  rating: number;
  distance: number; // в метрах
  travelTime: number; // в минутах
  duration: number; // продолжительность посещения в минутах
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