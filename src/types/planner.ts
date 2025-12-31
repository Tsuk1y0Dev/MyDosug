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

export type TransportMode = 'walking' | 'car' | 'public' | 'cycling';

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
  durationSettings: DurationSettings;
  image: string;
  website?: string;
  workingHours: string;
  features: {
    wheelchair: boolean;
    vegetarian: boolean;
    outdoor: boolean;
    childFriendly: boolean;
  };
  coordinates: { lat: number; lng: number };
}

export interface RouteActivity {
  id: string;
  place: Place;
  startTime: string;
  endTime: string;
  travelTimeFromPrevious: number;
  order: number;
}

export interface RoutePlan {
  id: string;
  activities: PlannedActivity[];
  totalDuration: number;
  totalCost: number;
  startPoint: StartPoint;
}

export interface StartPoint {
  type: 'home' | 'work' | 'current' | 'custom';
  address: string;
  label?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PlanningRequest {
  startTime: string;
  endTime: string;
  startPoint: StartPoint;
  budget: number;
  activityType: ActivityType;
  planType?: 'single' | 'chain';
  mood?: MoodType;
  company?: CompanyType;
  filters: AdditionalFilters;
}

export interface AdditionalFilters {
  wheelchairAccessible: boolean;
  vegetarian: boolean;
  outdoor: boolean;
  freeEntry: boolean;
  childFriendly: boolean;
}

export interface DurationSettings {
  baseDuration: number;
  modifiers: {
    company: Record<CompanyType, number>;
    mood: Record<MoodType, number>;
  };
}

export interface PlannedActivity {
  id: string;
  place: Place;
  startTime: string;
  endTime: string;
  travelTimeFromPrevious: number;
  order: number;
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
